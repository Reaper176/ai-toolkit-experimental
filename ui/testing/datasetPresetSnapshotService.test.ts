import assert from 'node:assert/strict';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import {
  DATASET_PRESET_NOTE_MAX,
  normalizeRelativeMediaPath,
  serializeManifest,
} from '../src/helpers/datasetPresets';
import { createDatasetPresetSnapshotStore } from '../src/server/datasetPresetSnapshotService';

const loaderConfig = {
  caption_ext: 'txt',
  default_caption: '',
  caption_dropout_rate: 0,
  shuffle_tokens: false,
  num_repeats: 1,
  resolution: [512],
  is_reg: false,
  network_weight: 1,
  cache_latents_to_disk: false,
  flip_x: false,
  flip_y: false,
  num_frames: 1,
  shrink_video_to_frames: false,
  fps: 24,
  auto_frame_count: false,
  do_i2v: false,
  do_audio: false,
  audio_normalize: false,
  audio_preserve_pitch: false,
  controls: [],
};

async function expectRejects(action: () => Promise<unknown>, pattern: RegExp): Promise<void> {
  await assert.rejects(action, pattern);
}

async function main(): Promise<void> {
  const ownedRoot = mkdtempSync(join(tmpdir(), 'aitk-dataset-snapshot-test-'));
  try {
    const dataRoot = join(ownedRoot, 'data');
    const sourceRoot = join(ownedRoot, 'source');
    mkdirSync(join(sourceRoot, 'sub'), { recursive: true });
    writeFileSync(join(sourceRoot, 'sub/a.jpg'), Buffer.from([1, 2, 3, 4]));
    writeFileSync(join(sourceRoot, 'sub/a.txt'), 'person');
    writeFileSync(join(sourceRoot, 'b.png'), Buffer.from([5, 6, 7]));
    writeFileSync(join(sourceRoot, 'b.txt'), '');
    writeFileSync(join(sourceRoot, 'new.webp'), Buffer.from([8, 9]));
    writeFileSync(join(sourceRoot, 'new.txt'), 'new');

    for (const invalid of ['../a.jpg', 'a/../../b.png', '/absolute.jpg', 'C:\\absolute.jpg']) {
      assert.throws(() => normalizeRelativeMediaPath(invalid), /path|segment/i);
    }

    for (const [label, overrides] of [
      ['absolute-prior', { priorManifestPath: join(ownedRoot, 'outside/manifest.json') }],
      ['escaping-prior', { priorManifestPath: '../outside/v1/manifest.json' }],
      ['empty-prior', { priorManifestPath: '' }],
      ['invalid-note', { note: 'x'.repeat(DATASET_PRESET_NOTE_MAX + 1) }],
      ['invalid-source-root', { sourceRoot: join(ownedRoot, 'missing-source-root') }],
    ] as const) {
      const validationDataRoot = join(ownedRoot, `validation-${label}`);
      const validationStore = createDatasetPresetSnapshotStore(validationDataRoot, { randomId: () => label });
      await expectRejects(
        () => validationStore.stageVersion({
          presetId: 'validation',
          version: 1,
          presetName: 'Validation',
          sourceDataset: 'my-images',
          sourceRoot,
          selectedPaths: ['b.png'],
          retainedPaths: [],
          captionExt: 'txt',
          loaderConfig,
          note: null,
          ...overrides,
        }),
        /manifest|prior|relative|note|source|ENOENT/i,
      );
      assert.equal(existsSync(join(validationDataRoot, 'dataset_presets')), false);
    }
    const captionMismatchDataRoot = join(ownedRoot, 'validation-caption-mismatch');
    await expectRejects(
      () => createDatasetPresetSnapshotStore(captionMismatchDataRoot).stageVersion({
        presetId: 'validation', version: 1, presetName: 'Validation', sourceDataset: 'my-images', sourceRoot,
        selectedPaths: ['b.png'], captionExt: 'caption', loaderConfig, note: null,
      }),
      /caption|extension|match/i,
    );
    assert.equal(existsSync(join(captionMismatchDataRoot, 'dataset_presets')), false);

    let nextId = 0;
    const store = createDatasetPresetSnapshotStore(dataRoot, { randomId: () => `id-${++nextId}` });
    const publication = await store.stageVersion({
      presetId: 'preset-1',
      version: 1,
      presetName: 'Faces',
      sourceDataset: 'my-images',
      sourceRoot,
      selectedPaths: ['sub/a.jpg', 'b.png'],
      captionExt: 'txt',
      loaderConfig,
      note: null,
    });
    assert.equal(publication.manifestPath, 'preset-1/v1/manifest.json');
    assert.equal(isAbsolute(publication.versionRoot), true);
    assert.deepEqual(publication.manifest.files.map(file => file.source_path), ['b.png', 'sub/a.jpg']);
    const escapedManifest = publication.manifest;
    escapedManifest.files[0].source_path = 'mutated.png';
    assert.equal(publication.manifest.files[0].source_path, 'b.png');
    await publication.publish();
    await publication.publish();
    const verified = await store.verifyFast(publication.manifestPath);
    assert.equal(verified.media_count, 2);
    assert.equal(readFileSync(join(publication.versionRoot, 'media/sub/a.txt'), 'utf8'), 'person');
    assert.equal(verified.files.find(file => file.source_path === 'b.png')?.caption_text, '');
    assert.equal(verified.files.find(file => file.source_path === 'b.png')?.caption_bytes, 0);
    assert.equal((await store.verifyFull(publication.manifestPath)).media_count, 2);
    assert.equal(store.resolveMediaRoot(publication.manifestPath), join(publication.versionRoot, 'media'));
    const publicationMediaRoot = join(publication.versionRoot, 'media');
    const publicationMediaBackup = join(publication.versionRoot, 'media-backup');
    renameSync(publicationMediaRoot, publicationMediaBackup);
    assert.throws(() => store.resolveMediaRoot(publication.manifestPath), /media|exist|missing|ENOENT/i);
    writeFileSync(publicationMediaRoot, 'not a directory');
    assert.throws(() => store.resolveMediaRoot(publication.manifestPath), /media|directory/i);
    unlinkSync(publicationMediaRoot);
    const outsideMedia = join(ownedRoot, 'outside-media');
    mkdirSync(outsideMedia);
    let directorySymlinksSupported = true;
    try {
      symlinkSync(outsideMedia, publicationMediaRoot, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EPERM' || code === 'EACCES' || code === 'ENOTSUP') directorySymlinksSupported = false;
      else throw error;
    }
    if (directorySymlinksSupported) {
      assert.throws(() => store.resolveMediaRoot(publication.manifestPath), /media|symlink/i);
      unlinkSync(publicationMediaRoot);
    }
    renameSync(publicationMediaBackup, publicationMediaRoot);

    await expectRejects(
      () => store.stageVersion({
        presetId: 'missing-source', version: 1, presetName: 'Missing', sourceDataset: 'my-images', sourceRoot,
        selectedPaths: ['gone.jpg'], captionExt: 'txt', loaderConfig, note: null,
      }),
      /source|missing|ENOENT/i,
    );

    const outsideFile = join(ownedRoot, 'outside.jpg');
    writeFileSync(outsideFile, 'outside');
    const sourceLink = join(sourceRoot, 'escape.jpg');
    let symlinksSupported = true;
    try {
      symlinkSync(outsideFile, sourceLink);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EPERM' || code === 'EACCES' || code === 'ENOTSUP') symlinksSupported = false;
      else throw error;
    }
    if (symlinksSupported) {
      await expectRejects(
        () => store.stageVersion({
          presetId: 'escaped-source', version: 1, presetName: 'Escape', sourceDataset: 'my-images', sourceRoot,
          selectedPaths: ['escape.jpg'], captionExt: 'txt', loaderConfig, note: null,
        }),
        /symlink|outside|escape|root/i,
      );
      writeFileSync(join(sourceRoot, 'dangling.jpg'), 'image');
      symlinkSync(join(ownedRoot, 'does-not-exist.txt'), join(sourceRoot, 'dangling.txt'));
      await expectRejects(
        () => store.stageVersion({
          presetId: 'dangling-caption', version: 1, presetName: 'Dangling', sourceDataset: 'my-images', sourceRoot,
          selectedPaths: ['dangling.jpg'], captionExt: 'txt', loaderConfig, note: null,
        }),
        /caption|symlink|missing|ENOENT/i,
      );
    }

    const changingSource = join(sourceRoot, 'changing.jpg');
    writeFileSync(changingSource, 'before');
    let changed = false;
    const changingStore = createDatasetPresetSnapshotStore(dataRoot, {
      randomId: () => 'changing',
      beforeCopyComplete: sourcePath => {
        if (!changed && sourcePath === changingSource) {
          changed = true;
          writeFileSync(changingSource, 'after-longer');
        }
      },
    });
    await expectRejects(
      () => changingStore.stageVersion({
        presetId: 'changing', version: 1, presetName: 'Changing', sourceDataset: 'my-images', sourceRoot,
        selectedPaths: ['changing.jpg'], captionExt: 'txt', loaderConfig, note: null,
      }),
      /changed|copy/i,
    );
    assert.equal(existsSync(join(dataRoot, 'dataset_presets/changing/.staging-changing')), false);

    const swapSourceRoot = join(ownedRoot, 'swap-source');
    mkdirSync(swapSourceRoot);
    writeFileSync(join(swapSourceRoot, 'one.jpg'), 'one');
    writeFileSync(join(swapSourceRoot, 'two.jpg'), 'trusted-two');
    const outsideSwapFile = join(ownedRoot, 'outside-swap.jpg');
    writeFileSync(outsideSwapFile, 'outside-secret');
    let swappedSecond = false;
    const swapStore = createDatasetPresetSnapshotStore(join(ownedRoot, 'swap-data'), {
      randomId: () => 'swap',
      beforeCopyComplete: sourcePath => {
        if (!swappedSecond && sourcePath === join(swapSourceRoot, 'one.jpg')) {
          renameSync(join(swapSourceRoot, 'two.jpg'), join(swapSourceRoot, 'two.original'));
          symlinkSync(outsideSwapFile, join(swapSourceRoot, 'two.jpg'));
          swappedSecond = true;
        }
      },
    });
    if (symlinksSupported) {
      await expectRejects(
        () => swapStore.stageVersion({
          presetId: 'swap', version: 1, presetName: 'Swap', sourceDataset: 'my-images', sourceRoot: swapSourceRoot,
          selectedPaths: ['one.jpg', 'two.jpg'], captionExt: 'txt', loaderConfig, note: null,
        }),
        /symlink|identity|outside|root/i,
      );
      assert.equal(existsSync(join(ownedRoot, 'swap-data/dataset_presets/swap/v1')), false);
      unlinkSync(join(swapSourceRoot, 'two.jpg'));
      renameSync(join(swapSourceRoot, 'two.original'), join(swapSourceRoot, 'two.jpg'));
    }

    const aggregateSource = join(sourceRoot, 'aggregate.jpg');
    writeFileSync(aggregateSource, 'aggregate');
    const aggregateDataRoot = join(ownedRoot, 'aggregate-data');
    const aggregatePresetRoot = join(aggregateDataRoot, 'dataset_presets/aggregate');
    const aggregateMovedRoot = join(aggregateDataRoot, 'dataset_presets/aggregate-real');
    const aggregateOutsideRoot = join(ownedRoot, 'aggregate-outside');
    mkdirSync(aggregateOutsideRoot);
    writeFileSync(join(aggregateOutsideRoot, 'sentinel'), 'keep');
    let aggregateSwapped = false;
    const aggregateStore = createDatasetPresetSnapshotStore(aggregateDataRoot, {
      randomId: () => 'aggregate',
      beforeCopyComplete: sourcePath => {
        if (!aggregateSwapped && sourcePath === aggregateSource) {
          writeFileSync(aggregateSource, 'aggregate changed');
          renameSync(aggregatePresetRoot, aggregateMovedRoot);
          symlinkSync(aggregateOutsideRoot, aggregatePresetRoot, process.platform === 'win32' ? 'junction' : 'dir');
          aggregateSwapped = true;
        }
      },
    });
    if (symlinksSupported) {
      await assert.rejects(
        () => aggregateStore.stageVersion({
          presetId: 'aggregate', version: 1, presetName: 'Aggregate', sourceDataset: 'my-images', sourceRoot,
          selectedPaths: ['aggregate.jpg'], captionExt: 'txt', loaderConfig, note: null,
        }),
        error => error instanceof AggregateError
          && error.errors.some(item => /changed|copy/i.test(String(item)))
          && error.errors.some(item => /identity|symlink|root|parent/i.test(String(item))),
      );
      assert.equal(readFileSync(join(aggregateOutsideRoot, 'sentinel'), 'utf8'), 'keep');
      unlinkSync(aggregatePresetRoot);
      renameSync(aggregateMovedRoot, aggregatePresetRoot);
    }

    writeFileSync(join(sourceRoot, 'orphan.jpg'), 'orphan image');
    const outputCollisionV1 = await store.stageVersion({
      presetId: 'output-collision', version: 1, presetName: 'Collision', sourceDataset: 'my-images', sourceRoot,
      selectedPaths: ['orphan.jpg'], captionExt: 'txt', loaderConfig, note: null,
    });
    await outputCollisionV1.publish();
    writeFileSync(join(sourceRoot, 'orphan.txt'), 'now a media file');
    await expectRejects(
      () => store.stageVersion({
        presetId: 'output-collision', version: 2, presetName: 'Collision', sourceDataset: 'my-images', sourceRoot,
        selectedPaths: ['orphan.txt'], retainedPaths: ['orphan.jpg'], priorManifestPath: outputCollisionV1.manifestPath,
        captionExt: 'cap', loaderConfig, note: null,
      }),
      /collision|managed|caption/i,
    );

    unlinkSync(join(sourceRoot, 'sub/a.jpg'));
    unlinkSync(join(sourceRoot, 'sub/a.txt'));
    const retained = await store.stageVersion({
      presetId: 'preset-1',
      version: 2,
      presetName: 'Faces',
      sourceDataset: 'my-images',
      sourceRoot,
      selectedPaths: ['new.webp'],
      retainedPaths: ['sub/a.jpg'],
      priorManifestPath: publication.manifestPath,
      captionExt: '.txt',
      loaderConfig,
      note: 'retained',
    });
    await retained.publish();
    assert.deepEqual(readFileSync(join(retained.versionRoot, 'media/sub/a.jpg')), Buffer.from([1, 2, 3, 4]));
    assert.equal(readFileSync(join(retained.versionRoot, 'media/sub/a.txt'), 'utf8'), 'person');
    assert.deepEqual((await store.verifyFull(retained.manifestPath)).files.map(file => file.source_path), [
      'new.webp',
      'sub/a.jpg',
    ]);
    if (symlinksSupported) {
      const retainedNewMedia = join(retained.versionRoot, 'media/new.webp');
      const retainedNewBackup = `${retainedNewMedia}.original`;
      let retainedSwapDone = false;
      const retainedSwapStore = createDatasetPresetSnapshotStore(dataRoot, {
        randomId: () => 'retained-swap',
        beforeCopyComplete: sourcePath => {
          if (!retainedSwapDone && sourcePath.endsWith(join('media', 'sub/a.jpg'))) {
            renameSync(retainedNewMedia, retainedNewBackup);
            symlinkSync(outsideSwapFile, retainedNewMedia);
            retainedSwapDone = true;
          }
        },
      });
      await expectRejects(
        () => retainedSwapStore.stageVersion({
          presetId: 'preset-1', version: 99, presetName: 'Faces', sourceDataset: 'my-images', sourceRoot,
          selectedPaths: [], retainedPaths: ['sub/a.jpg', 'new.webp'], priorManifestPath: retained.manifestPath,
          captionExt: 'txt', loaderConfig, note: null,
        }),
        /symlink|identity|outside|root/i,
      );
      unlinkSync(retainedNewMedia);
      renameSync(retainedNewBackup, retainedNewMedia);
    }
    await expectRejects(
      () => store.stageVersion({
        presetId: 'preset-1', version: 3, presetName: 'Faces', sourceDataset: 'my-images', sourceRoot,
        selectedPaths: ['new.webp'], retainedPaths: ['new.webp'], priorManifestPath: retained.manifestPath,
        captionExt: 'txt', loaderConfig, note: null,
      }),
      /both|overlap|duplicate/i,
    );
    await expectRejects(
      () => store.stageVersion({
        presetId: 'preset-1', version: 3, presetName: 'Faces', sourceDataset: 'my-images', sourceRoot,
        selectedPaths: ['new.webp'], retainedPaths: ['not-in-prior.jpg'], priorManifestPath: retained.manifestPath,
        captionExt: 'txt', loaderConfig, note: null,
      }),
      /retained|missing|prior/i,
    );

    const beforePublishRollback = await store.stageVersion({
      presetId: 'rollback-stage', version: 1, presetName: 'Rollback', sourceDataset: 'my-images', sourceRoot,
      selectedPaths: ['new.webp'], captionExt: 'txt', loaderConfig, note: null,
    });
    const stagingParent = dirname(beforePublishRollback.versionRoot);
    assert.equal(readdirSync(stagingParent).some(name => name.startsWith('.staging-')), true);
    await beforePublishRollback.rollback();
    await beforePublishRollback.rollback();
    assert.equal(readdirSync(stagingParent).some(name => name.startsWith('.staging-')), false);

    const afterPublishRollback = await store.stageVersion({
      presetId: 'rollback-published', version: 1, presetName: 'Rollback', sourceDataset: 'my-images', sourceRoot,
      selectedPaths: ['new.webp'], captionExt: 'txt', loaderConfig, note: null,
    });
    await afterPublishRollback.publish();
    await afterPublishRollback.rollback();
    await afterPublishRollback.rollback();
    assert.equal(existsSync(afterPublishRollback.versionRoot), false);

    if (symlinksSupported) {
      const secureRollback = await store.stageVersion({
        presetId: 'secure-rollback', version: 1, presetName: 'Secure rollback', sourceDataset: 'my-images', sourceRoot,
        selectedPaths: ['new.webp'], captionExt: 'txt', loaderConfig, note: null,
      });
      await secureRollback.publish();
      const securePresetRoot = dirname(secureRollback.versionRoot);
      const securePresetMoved = `${securePresetRoot}-real`;
      const secureOutsidePreset = join(ownedRoot, 'secure-rollback-outside');
      mkdirSync(join(secureOutsidePreset, 'v1'), { recursive: true });
      writeFileSync(join(secureOutsidePreset, 'v1/sentinel'), 'keep');
      renameSync(securePresetRoot, securePresetMoved);
      symlinkSync(secureOutsidePreset, securePresetRoot, process.platform === 'win32' ? 'junction' : 'dir');
      await expectRejects(() => secureRollback.rollback(), /identity|symlink|root|parent/i);
      assert.equal(readFileSync(join(secureOutsidePreset, 'v1/sentinel'), 'utf8'), 'keep');
      unlinkSync(securePresetRoot);
      renameSync(securePresetMoved, securePresetRoot);
      await secureRollback.rollback();
    }

    const winner = await store.stageVersion({
      presetId: 'collision', version: 1, presetName: 'Collision', sourceDataset: 'my-images', sourceRoot,
      selectedPaths: ['new.webp'], captionExt: 'txt', loaderConfig, note: null,
    });
    const loser = await store.stageVersion({
      presetId: 'collision', version: 1, presetName: 'Collision', sourceDataset: 'my-images', sourceRoot,
      selectedPaths: ['b.png'], captionExt: 'txt', loaderConfig, note: null,
    });
    await winner.publish();
    await expectRejects(() => loser.publish(), /exist|replace|version/i);
    await loser.rollback();
    assert.equal(existsSync(winner.versionRoot), true);

    const verifyPublication = await store.stageVersion({
      presetId: 'verification', version: 1, presetName: 'Verify', sourceDataset: 'my-images', sourceRoot,
      selectedPaths: ['b.png'], captionExt: 'txt', loaderConfig, note: null,
    });
    await verifyPublication.publish();
    const verifyMedia = join(verifyPublication.versionRoot, 'media/b.png');
    writeFileSync(verifyMedia, Buffer.from([9, 9, 9]));
    assert.equal((await store.verifyFast(verifyPublication.manifestPath)).media_count, 1);
    await expectRejects(() => store.verifyFull(verifyPublication.manifestPath), /hash|checksum/i);
    writeFileSync(verifyMedia, Buffer.from([5, 6, 7]));
    writeFileSync(join(verifyPublication.versionRoot, 'media/b.txt'), 'x');
    await expectRejects(() => store.verifyFast(verifyPublication.manifestPath), /size/i);
    writeFileSync(join(verifyPublication.versionRoot, 'media/b.txt'), '');
    renameSync(verifyMedia, `${verifyMedia}.saved`);
    await expectRejects(() => store.verifyFast(verifyPublication.manifestPath), /missing|ENOENT/i);
    mkdirSync(verifyMedia);
    await expectRejects(() => store.verifyFast(verifyPublication.manifestPath), /regular|file/i);
    rmSync(verifyMedia, { recursive: true });
    renameSync(`${verifyMedia}.saved`, verifyMedia);
    const manifestFile = join(verifyPublication.versionRoot, 'manifest.json');
    writeFileSync(manifestFile, serializeManifest(verifyPublication.manifest).replace(/^\{/, '{ '));
    await expectRejects(() => store.verifyFast(verifyPublication.manifestPath), /canonical|checksum|manifest/i);
    writeFileSync(manifestFile, serializeManifest(verifyPublication.manifest));

    const invalidUtf8Publication = await store.stageVersion({
      presetId: 'invalid-manifest-utf8', version: 1, presetName: 'Replacement �', sourceDataset: 'my-images', sourceRoot,
      selectedPaths: ['new.webp'], captionExt: 'txt', loaderConfig, note: null,
    });
    await invalidUtf8Publication.publish();
    const invalidUtf8ManifestPath = join(invalidUtf8Publication.versionRoot, 'manifest.json');
    const canonicalManifestBytes = readFileSync(invalidUtf8ManifestPath);
    const replacementIndex = canonicalManifestBytes.indexOf(Buffer.from('�'));
    assert.notEqual(replacementIndex, -1);
    writeFileSync(invalidUtf8ManifestPath, Buffer.concat([
      canonicalManifestBytes.subarray(0, replacementIndex),
      Buffer.from([0xff]),
      canonicalManifestBytes.subarray(replacementIndex + Buffer.byteLength('�')),
    ]));
    await expectRejects(() => store.readManifest(invalidUtf8Publication.manifestPath), /UTF-8|encoding|manifest/i);

    for (const invalidManifestPath of [manifestFile, '../manifest.json', 'preset-1/v1/../manifest.json']) {
      await expectRejects(() => store.readManifest(invalidManifestPath), /manifest|relative|path/i);
    }
    if (symlinksSupported) {
      const linkedPresetRoot = join(dataRoot, 'dataset_presets/symlinked');
      mkdirSync(linkedPresetRoot, { recursive: true });
      symlinkSync(verifyPublication.versionRoot, join(linkedPresetRoot, 'v1'));
      await expectRejects(() => store.readManifest('symlinked/v1/manifest.json'), /symlink/i);
    }

    const captionHashPublication = await store.stageVersion({
      presetId: 'caption-hash', version: 1, presetName: 'Caption hash', sourceDataset: 'my-images', sourceRoot,
      selectedPaths: ['new.webp'], captionExt: 'txt', loaderConfig, note: null,
    });
    await captionHashPublication.publish();
    writeFileSync(join(captionHashPublication.versionRoot, 'media/new.txt'), 'NEW');
    assert.equal((await store.verifyFast(captionHashPublication.manifestPath)).media_count, 1);
    await expectRejects(() => store.verifyFull(captionHashPublication.manifestPath), /hash|checksum/i);

    const badUtf8Root = join(ownedRoot, 'bad-utf8');
    mkdirSync(badUtf8Root);
    writeFileSync(join(badUtf8Root, 'a.jpg'), 'image');
    writeFileSync(join(badUtf8Root, 'a.txt'), Buffer.from([0xc3, 0x28]));
    await expectRejects(
      () => store.stageVersion({
        presetId: 'bad-utf8', version: 1, presetName: 'Bad UTF-8', sourceDataset: 'my-images', sourceRoot: badUtf8Root,
        selectedPaths: ['a.jpg'], captionExt: 'txt', loaderConfig, note: null,
      }),
      /UTF-8|encoding/i,
    );

    const quarantinePublication = await store.stageVersion({
      presetId: 'quarantine', version: 1, presetName: 'Quarantine', sourceDataset: 'my-images', sourceRoot,
      selectedPaths: ['new.webp'], captionExt: 'txt', loaderConfig, note: null,
    });
    await quarantinePublication.publish();
    const quarantine = await store.quarantineVersion(quarantinePublication.manifestPath);
    assert.equal(existsSync(quarantinePublication.versionRoot), false);
    await quarantine.restore();
    await quarantine.restore();
    assert.equal(existsSync(quarantinePublication.versionRoot), true);
    const removal = await store.quarantineVersion(quarantinePublication.manifestPath);
    await removal.remove();
    await removal.remove();
    assert.equal(existsSync(quarantinePublication.versionRoot), false);
    await expectRejects(() => store.quarantineVersion('../outside/v1/manifest.json'), /manifest|relative|path/i);

    if (symlinksSupported) {
      const secureQuarantinePublication = await store.stageVersion({
        presetId: 'secure-quarantine', version: 1, presetName: 'Secure quarantine', sourceDataset: 'my-images', sourceRoot,
        selectedPaths: ['new.webp'], captionExt: 'txt', loaderConfig, note: null,
      });
      await secureQuarantinePublication.publish();
      const secureQuarantine = await store.quarantineVersion(secureQuarantinePublication.manifestPath);
      const secureQuarantinePreset = dirname(secureQuarantinePublication.versionRoot);
      const secureQuarantineMoved = `${secureQuarantinePreset}-real`;
      const secureQuarantineOutside = join(ownedRoot, 'secure-quarantine-outside');
      mkdirSync(secureQuarantineOutside);
      writeFileSync(join(secureQuarantineOutside, 'sentinel'), 'keep');
      renameSync(secureQuarantinePreset, secureQuarantineMoved);
      symlinkSync(secureQuarantineOutside, secureQuarantinePreset, process.platform === 'win32' ? 'junction' : 'dir');
      await expectRejects(() => secureQuarantine.remove(), /identity|symlink|root|parent/i);
      assert.equal(readFileSync(join(secureQuarantineOutside, 'sentinel'), 'utf8'), 'keep');
      unlinkSync(secureQuarantinePreset);
      renameSync(secureQuarantineMoved, secureQuarantinePreset);
      await secureQuarantine.remove();
    }

    const cleanupPresetRoot = join(dataRoot, 'dataset_presets/cleanup');
    mkdirSync(cleanupPresetRoot, { recursive: true });
    mkdirSync(join(cleanupPresetRoot, '.staging-old'));
    mkdirSync(join(cleanupPresetRoot, '.staging-new'));
    mkdirSync(join(cleanupPresetRoot, '.quarantine-v1-ignore'));
    mkdirSync(join(cleanupPresetRoot, 'v9'));
    const cutoff = new Date('2026-01-02T00:00:00.000Z');
    utimesSync(join(cleanupPresetRoot, '.staging-old'), new Date('2026-01-01T00:00:00.000Z'), new Date('2026-01-01T00:00:00.000Z'));
    utimesSync(join(cleanupPresetRoot, '.staging-new'), cutoff, cutoff);
    assert.deepEqual(await store.cleanupStaging(cutoff), ['cleanup/.staging-old']);
    assert.equal(existsSync(join(cleanupPresetRoot, '.staging-old')), false);
    assert.equal(lstatSync(join(cleanupPresetRoot, '.staging-new')).isDirectory(), true);
    assert.equal(lstatSync(join(cleanupPresetRoot, '.quarantine-v1-ignore')).isDirectory(), true);
    assert.equal(lstatSync(join(cleanupPresetRoot, 'v9')).isDirectory(), true);
    if (symlinksSupported) {
      const cleanupOutside = join(ownedRoot, 'cleanup-outside');
      mkdirSync(join(cleanupOutside, '.staging-old'), { recursive: true });
      writeFileSync(join(cleanupOutside, '.staging-old/sentinel'), 'keep');
      symlinkSync(cleanupOutside, join(dataRoot, 'dataset_presets/cleanup-link'), process.platform === 'win32' ? 'junction' : 'dir');
      await expectRejects(() => store.cleanupStaging(new Date()), /symlink|preset|parent|root/i);
      assert.equal(readFileSync(join(cleanupOutside, '.staging-old/sentinel'), 'utf8'), 'keep');
      unlinkSync(join(dataRoot, 'dataset_presets/cleanup-link'));
    }
  } finally {
    if (existsSync(ownedRoot)) rmSync(ownedRoot, { recursive: true });
  }
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
