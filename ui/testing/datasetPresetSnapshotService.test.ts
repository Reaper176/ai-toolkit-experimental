import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  statSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { DATASET_PRESET_NOTE_MAX, normalizeRelativeMediaPath, serializeManifest } from '../src/helpers/datasetPresets';
import {
  DatasetPresetSnapshotConflictError,
  DatasetPresetSnapshotVerificationError,
  createDatasetPresetSnapshotStore,
} from '../src/server/datasetPresetSnapshotService';
import { createDatasetMaskService } from '../src/server/datasetMaskService';

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
  mask_min_value: 0.1,
  invert_mask: false,
  controls: [],
};

async function expectRejects(action: () => Promise<unknown>, pattern: RegExp): Promise<void> {
  await assert.rejects(action, pattern);
}

function assertOrphanPaths(
  result: { reportedOrphans: string[]; totalOrphans: number; truncatedOrphans: number },
  expected: string[],
  message?: string,
): void {
  assert.deepEqual(result.reportedOrphans, expected, message);
  assert.equal(result.totalOrphans, expected.length, message);
  assert.equal(result.truncatedOrphans, 0, message);
}

function publishedManifestPaths(dataRoot: string): string[] {
  const managedRoot = join(dataRoot, 'dataset_presets');
  return readdirSync(managedRoot, { withFileTypes: true }).flatMap(preset => {
    if (!preset.isDirectory() || preset.isSymbolicLink() || preset.name.startsWith('.')) return [];
    return readdirSync(join(managedRoot, preset.name), { withFileTypes: true })
      .filter(version => version.isDirectory() && !version.isSymbolicLink() && /^v[1-9]\d*$/.test(version.name))
      .filter(version => existsSync(join(managedRoot, preset.name, version.name, 'manifest.json')))
      .map(version => `${preset.name}/${version.name}/manifest.json`);
  });
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
    const aggregatePaths = Array.from({ length: 6 }, (_, index) => `missing${index}.png`);
    for (const mediaPath of aggregatePaths) {
      writeFileSync(join(sourceRoot, mediaPath), Buffer.from([1]));
      writeFileSync(join(sourceRoot, mediaPath.replace(/\.png$/, '.txt')), 'caption');
    }

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
        () =>
          validationStore.stageVersion({
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
      () =>
        createDatasetPresetSnapshotStore(captionMismatchDataRoot).stageVersion({
          presetId: 'validation',
          version: 1,
          presetName: 'Validation',
          sourceDataset: 'my-images',
          sourceRoot,
          selectedPaths: ['b.png'],
          captionExt: 'caption',
          loaderConfig,
          note: null,
        }),
      /caption|extension|match/i,
    );
    assert.equal(existsSync(join(captionMismatchDataRoot, 'dataset_presets')), false);
    for (const reservedPresetId of ['.tombstone-preset', '.TOMBSTONE-portable']) {
      const reservedDataRoot = join(ownedRoot, `reserved-${reservedPresetId.slice(1)}`);
      await expectRejects(
        () =>
          createDatasetPresetSnapshotStore(reservedDataRoot).stageVersion({
            presetId: reservedPresetId,
            version: 1,
            presetName: 'Reserved',
            sourceDataset: 'my-images',
            sourceRoot,
            selectedPaths: ['b.png'],
            captionExt: 'txt',
            loaderConfig,
            note: null,
          }),
        /preset|reserved|tombstone/i,
      );
      assert.equal(existsSync(join(reservedDataRoot, 'dataset_presets')), false);
    }

    if (process.platform !== 'win32') {
      const writableDataRoot = join(ownedRoot, 'writable-managed-root');
      const writableManagedRoot = join(writableDataRoot, 'dataset_presets');
      mkdirSync(writableManagedRoot, { recursive: true });
      chmodSync(writableManagedRoot, 0o777);
      await expectRejects(
        () =>
          createDatasetPresetSnapshotStore(writableDataRoot).stageVersion({
            presetId: 'unsafe-mode',
            version: 1,
            presetName: 'Unsafe',
            sourceDataset: 'my-images',
            sourceRoot,
            selectedPaths: ['b.png'],
            captionExt: 'txt',
            loaderConfig,
            note: null,
          }),
        /owner|writable|mode|permission/i,
      );
      assert.equal(statSync(writableManagedRoot).mode & 0o777, 0o777);
    }

    const canonicalDataTarget = join(ownedRoot, 'canonical-data-target');
    const canonicalDataAlias = join(ownedRoot, 'canonical-data-alias');
    mkdirSync(canonicalDataTarget);
    let dataRootSymlinksSupported = true;
    try {
      symlinkSync(canonicalDataTarget, canonicalDataAlias, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EPERM' || code === 'EACCES' || code === 'ENOTSUP') dataRootSymlinksSupported = false;
      else throw error;
    }
    if (dataRootSymlinksSupported) {
      const canonicalStore = createDatasetPresetSnapshotStore(canonicalDataAlias, { randomId: () => 'canonical' });
      const canonicalPublication = await canonicalStore.stageVersion({
        presetId: 'canonical',
        version: 1,
        presetName: 'Canonical',
        sourceDataset: 'my-images',
        sourceRoot,
        selectedPaths: ['b.png'],
        captionExt: 'txt',
        loaderConfig,
        note: null,
      });
      await canonicalPublication.publish();
      assert.equal(canonicalPublication.versionRoot, join(canonicalDataTarget, 'dataset_presets/canonical/v1'));
      assert.equal((await canonicalStore.readManifest(canonicalPublication.manifestPath)).preset_id, 'canonical');
      assert.equal((await canonicalStore.verifyFull(canonicalPublication.manifestPath)).media_count, 1);
      assert.equal(
        canonicalStore.resolveMediaRoot(canonicalPublication.manifestPath),
        join(canonicalPublication.versionRoot, 'media'),
      );
    }

    if (dataRootSymlinksSupported) {
      const boundaryDatasetsRoot = join(ownedRoot, 'boundary-datasets');
      const outsideDataset = join(ownedRoot, 'outside-dataset');
      mkdirSync(boundaryDatasetsRoot);
      mkdirSync(outsideDataset);
      writeFileSync(join(outsideDataset, 'outside.jpg'), 'secret');
      symlinkSync(outsideDataset, join(boundaryDatasetsRoot, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
      const boundaryDataRoot = join(ownedRoot, 'boundary-data');
      await expectRejects(
        () =>
          createDatasetPresetSnapshotStore(boundaryDataRoot).stageVersion({
            presetId: 'boundary',
            version: 1,
            presetName: 'Boundary',
            sourceDataset: 'escape',
            datasetsRoot: boundaryDatasetsRoot,
            sourceRoot: join(boundaryDatasetsRoot, 'escape'),
            selectedPaths: ['outside.jpg'],
            captionExt: 'txt',
            loaderConfig,
            note: null,
          }),
        /dataset|source|outside|root|boundary/i,
      );
      assert.equal(existsSync(join(boundaryDataRoot, 'dataset_presets')), false);

      const insideDataset = join(boundaryDatasetsRoot, 'real-inside');
      mkdirSync(insideDataset);
      writeFileSync(join(insideDataset, 'inside.jpg'), 'inside');
      symlinkSync(insideDataset, join(boundaryDatasetsRoot, 'inside'), process.platform === 'win32' ? 'junction' : 'dir');
      const insidePublication = await createDatasetPresetSnapshotStore(boundaryDataRoot).stageVersion({
        presetId: 'inside-boundary',
        version: 1,
        presetName: 'Inside boundary',
        sourceDataset: 'inside',
        datasetsRoot: boundaryDatasetsRoot,
        sourceRoot: join(boundaryDatasetsRoot, 'inside'),
        selectedPaths: ['inside.jpg'],
        captionExt: 'txt',
        loaderConfig,
        note: null,
      });
      assert.equal(insidePublication.manifest.files[0].media_sha256.length, 64);
      await insidePublication.rollback();
    }

    let nextId = 0;
    const store = createDatasetPresetSnapshotStore(dataRoot, { randomId: () => `id-${++nextId}` });

    const liveMasks = new Map<string, Buffer | null>([
      ['b.png', Buffer.from('live-mask-b')],
      ['sub/a.jpg', Buffer.from('live-mask-a')],
    ]);
    const sourceIdentity = (sourcePath: string) => {
      const info = statSync(join(sourceRoot, sourcePath), { bigint: true });
      return { dev: info.dev.toString(), ino: info.ino.toString() };
    };
    const sourceSha256 = (sourcePath: string) => createHash('sha256').update(readFileSync(join(sourceRoot, sourcePath))).digest('hex');
    const maskService = {
      async read(_dataset: string, sourcePath: string) {
        if (!liveMasks.has(sourcePath)) throw new Error('Source not found');
        const png = liveMasks.get(sourcePath) ?? null;
        return { exists: png !== null, width: 1, height: 1, png, source_identity: sourceIdentity(sourcePath), source_sha256: sourceSha256(sourcePath) };
      },
      async save() {}, async delete() {}, async deleteByAbsoluteSource() {},
    };
    const maskedPublication = await store.stageVersion({
      presetId: 'masked', version: 1, presetName: 'Masked', sourceDataset: 'my-images', sourceRoot,
      selectedPaths: ['b.png', 'sub/a.jpg'], captionExt: 'txt', loaderConfig, note: null, maskService,
    });
    assert.deepEqual(maskedPublication.manifest.files.map(file => ({
      source: file.source_path, path: file.mask_path, bytes: file.mask_bytes,
      sha: file.mask_sha256, missing: file.mask_missing,
    })), [
      { source: 'b.png', path: 'masks/b.png', bytes: 11, sha: createHash('sha256').update('live-mask-b').digest('hex'), missing: false },
      { source: 'sub/a.jpg', path: 'masks/a.png', bytes: 11, sha: createHash('sha256').update('live-mask-a').digest('hex'), missing: false },
    ]);
    assert.equal(maskedPublication.manifest.total_bytes, 3 + 0 + 4 + 6 + 22);
    await maskedPublication.publish();
    assert.deepEqual(readFileSync(join(maskedPublication.versionRoot, 'masks/b.png')), Buffer.from('live-mask-b'));

    liveMasks.set('b.png', Buffer.from('updated-mask'));
    liveMasks.delete('sub/a.jpg');
    const retainedMasked = await store.stageVersion({
      presetId: 'masked', version: 2, presetName: 'Masked', sourceDataset: 'my-images', sourceRoot,
      selectedPaths: [], retainedPaths: ['b.png', 'sub/a.jpg'], priorManifestPath: maskedPublication.manifestPath,
      captionExt: 'txt', loaderConfig, note: null, maskService,
    });
    assert.deepEqual(retainedMasked.manifest.files.find(file => file.source_path === 'sub/a.jpg')?.mask_sha256,
      maskedPublication.manifest.files.find(file => file.source_path === 'sub/a.jpg')?.mask_sha256);
    await retainedMasked.publish();
    assert.deepEqual(readFileSync(join(retainedMasked.versionRoot, 'masks/b.png')), Buffer.from('updated-mask'));
    liveMasks.set('b.png', null);
    const absentRetainedMask = await store.stageVersion({
      presetId: 'masked', version: 3, presetName: 'Masked', sourceDataset: 'my-images', sourceRoot,
      selectedPaths: [], retainedPaths: ['b.png'], priorManifestPath: retainedMasked.manifestPath,
      captionExt: 'txt', loaderConfig, note: null, maskService,
    });
    assert.deepEqual(
      (({ mask_path, mask_bytes, mask_sha256, mask_missing }) => ({ mask_path, mask_bytes, mask_sha256, mask_missing }))
        (absentRetainedMask.manifest.files[0]),
      { mask_path: null, mask_bytes: null, mask_sha256: null, mask_missing: true },
      'a retained live source with no current mask does not inherit its prior frozen mask',
    );
    await absentRetainedMask.publish();
    assert.equal(existsSync(join(absentRetainedMask.versionRoot, 'masks/b.png')), false);
    unlinkSync(join(retainedMasked.versionRoot, 'masks/b.png'));
    await assert.rejects(() => store.verifyFast(retainedMasked.manifestPath), error =>
      error instanceof DatasetPresetSnapshotVerificationError && error.mismatches[0]?.kind === 'mask_missing' && error.mismatches[0]?.path === 'masks/b.png');
    writeFileSync(join(retainedMasked.versionRoot, 'masks/b.png'), 'x');
    await assert.rejects(() => store.verifyFast(retainedMasked.manifestPath), error =>
      error instanceof DatasetPresetSnapshotVerificationError && error.mismatches[0]?.kind === 'mask_size');
    writeFileSync(join(retainedMasked.versionRoot, 'masks/b.png'), Buffer.from('changed-mask'));
    await assert.rejects(() => store.verifyFull(retainedMasked.manifestPath), error =>
      error instanceof DatasetPresetSnapshotVerificationError && error.mismatches[0]?.kind === 'mask_sha256');

    await expectRejects(() => store.stageVersion({
      presetId: 'duplicate-mask', version: 1, presetName: 'Duplicate', sourceDataset: 'my-images', sourceRoot,
      selectedPaths: ['b.png', 'sub/b.jpg'], captionExt: 'txt', loaderConfig, note: null, maskService,
    }), /duplicate mask basename/i);
    assert.equal(existsSync(join(dataRoot, 'dataset_presets/duplicate-mask')), false);

    const whiteDatasetsRoot = join(ownedRoot, 'white-datasets');
    const whiteSourceRoot = join(whiteDatasetsRoot, 'my-images');
    mkdirSync(whiteSourceRoot, { recursive: true });
    const whiteImage = new PNG({ width: 1, height: 1 });
    whiteImage.data.fill(255);
    const whitePng = PNG.sync.write(whiteImage);
    writeFileSync(join(whiteSourceRoot, 'white.png'), whitePng);
    const realMasks = createDatasetMaskService({ datasetsRoot: whiteDatasetsRoot, maxPngBytes: 1024 * 1024 });
    await realMasks.save('my-images', 'white.png', whitePng);
    const whitePublication = await store.stageVersion({
      presetId: 'white-mask', version: 1, presetName: 'White', sourceDataset: 'my-images',
      datasetsRoot: whiteDatasetsRoot, sourceRoot: whiteSourceRoot, selectedPaths: ['white.png'],
      captionExt: 'txt', loaderConfig, note: null, maskService: realMasks,
    });
    assert.deepEqual(
      (({ mask_path, mask_bytes, mask_sha256, mask_missing }) => ({ mask_path, mask_bytes, mask_sha256, mask_missing }))
        (whitePublication.manifest.files[0]),
      { mask_path: null, mask_bytes: null, mask_sha256: null, mask_missing: true },
    );
    await whitePublication.publish();
    assert.equal(existsSync(join(whitePublication.versionRoot, 'masks/white.png')), false);
    mkdirSync(join(whitePublication.versionRoot, 'masks'));
    writeFileSync(join(whitePublication.versionRoot, 'masks/extra.png'), 'extra');
    await assert.rejects(() => store.verifyFull(whitePublication.manifestPath), error =>
      error instanceof DatasetPresetSnapshotVerificationError && error.mismatches.some(mismatch =>
        mismatch.kind === 'unexpected' && mismatch.asset === 'mask' && mismatch.path === 'masks/extra.png' && mismatch.actual === 'file'));
    unlinkSync(join(whitePublication.versionRoot, 'masks/extra.png'));
    let maskSymlinksSupported = true;
    try {
      symlinkSync(join(whitePublication.versionRoot, 'media/white.png'), join(whitePublication.versionRoot, 'masks/link.png'));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EPERM' || code === 'EACCES' || code === 'ENOTSUP') maskSymlinksSupported = false;
      else throw error;
    }
    if (maskSymlinksSupported) {
      await assert.rejects(() => store.verifyFull(whitePublication.manifestPath), error =>
        error instanceof DatasetPresetSnapshotVerificationError && error.mismatches.some(mismatch =>
          mismatch.kind === 'unexpected' && mismatch.asset === 'mask' && mismatch.path === 'masks/link.png' && mismatch.actual === 'symlink'));
      unlinkSync(join(whitePublication.versionRoot, 'masks/link.png'));

      const raceOutside = join(ownedRoot, 'mask-race-outside');
      mkdirSync(raceOutside);
      writeFileSync(join(raceOutside, 'sentinel'), 'keep');
      const stagingRaceData = join(ownedRoot, 'mask-staging-race-data');
      const stagingRaceRoot = join(stagingRaceData, 'dataset_presets/race/.staging-staging-race');
      const stagingRaceStore = createDatasetPresetSnapshotStore(stagingRaceData, { randomId: () => 'staging-race' });
      const stagingRaceMasks = { ...maskService, async read() {
        renameSync(stagingRaceRoot, `${stagingRaceRoot}-real`);
        symlinkSync(raceOutside, stagingRaceRoot, process.platform === 'win32' ? 'junction' : 'dir');
        return { exists: true, width: 1, height: 1, png: Buffer.from('mask'), source_identity: sourceIdentity('b.png'), source_sha256: sourceSha256('b.png') };
      } };
      await assert.rejects(() => stagingRaceStore.stageVersion({
        presetId: 'race', version: 1, presetName: 'Race', sourceDataset: 'my-images', sourceRoot,
        selectedPaths: ['b.png'], captionExt: 'txt', loaderConfig, note: null, maskService: stagingRaceMasks,
      }), /identity|symlink|staging|root/i);
      assert.equal(readFileSync(join(raceOutside, 'sentinel'), 'utf8'), 'keep');
      assert.equal(existsSync(join(raceOutside, 'b.png')), false);

      const identityRaceData = join(ownedRoot, 'mask-source-identity-race-data');
      const identityRaceStore = createDatasetPresetSnapshotStore(identityRaceData, { randomId: () => 'identity-race' });
      const identityRaceMasks = { ...maskService, async read() {
        renameSync(join(sourceRoot, 'b.png'), join(sourceRoot, 'b.original.png'));
        writeFileSync(join(sourceRoot, 'b.png'), Buffer.from('replacement-source'));
        const replacementIdentity = sourceIdentity('b.png');
        unlinkSync(join(sourceRoot, 'b.png'));
        renameSync(join(sourceRoot, 'b.original.png'), join(sourceRoot, 'b.png'));
        return { exists: true, width: 1, height: 1, png: Buffer.from('replacement-mask'), source_identity: replacementIdentity,
          source_sha256: createHash('sha256').update('replacement-source').digest('hex') };
      } };
      await assert.rejects(() => identityRaceStore.stageVersion({
        presetId: 'race', version: 1, presetName: 'Race', sourceDataset: 'my-images', sourceRoot,
        selectedPaths: ['b.png'], captionExt: 'txt', loaderConfig, note: null, maskService: identityRaceMasks,
      }), /source.*changed|identity/i);
      assert.equal(existsSync(join(identityRaceData, 'dataset_presets/race/v1')), false);

      const inPlaceRaceData = join(ownedRoot, 'mask-source-in-place-race-data');
      const inPlaceRaceStore = createDatasetPresetSnapshotStore(inPlaceRaceData, { randomId: () => 'in-place-race' });
      const originalSource = readFileSync(join(sourceRoot, 'b.png'));
      const inPlaceRaceMasks = { ...maskService, async read() {
        const identity = sourceIdentity('b.png');
        writeFileSync(join(sourceRoot, 'b.png'), Buffer.from('same-inode-replacement'));
        const digest = sourceSha256('b.png');
        writeFileSync(join(sourceRoot, 'b.png'), originalSource);
        return { exists: true, width: 1, height: 1, png: Buffer.from('replacement-mask'),
          source_identity: identity, source_sha256: digest };
      } };
      await assert.rejects(() => inPlaceRaceStore.stageVersion({
        presetId: 'race', version: 1, presetName: 'Race', sourceDataset: 'my-images', sourceRoot,
        selectedPaths: ['b.png'], captionExt: 'txt', loaderConfig, note: null, maskService: inPlaceRaceMasks,
      }), /source.*changed|identity/i);
      assert.equal(existsSync(join(inPlaceRaceData, 'dataset_presets/race/v1')), false);

      const childRaceData = join(ownedRoot, 'mask-child-race-data');
      liveMasks.set('b.png', Buffer.from('child-race-mask'));
      const childRaceRoot = join(childRaceData, 'dataset_presets/race/.staging-child-race');
      const childRaceStore = createDatasetPresetSnapshotStore(childRaceData, {
        randomId: () => 'child-race',
        maskFilesystemStrategy: 'portable',
        beforeMaskDestinationOpen: () => {
          renameSync(join(childRaceRoot, 'masks'), join(childRaceRoot, 'masks-real'));
          symlinkSync(raceOutside, join(childRaceRoot, 'masks'), process.platform === 'win32' ? 'junction' : 'dir');
        },
      });
      await assert.rejects(() => childRaceStore.stageVersion({
        presetId: 'race', version: 1, presetName: 'Race', sourceDataset: 'my-images', sourceRoot,
        selectedPaths: ['b.png'], captionExt: 'txt', loaderConfig, note: null, maskService,
      }), /identity|symlink|masks|root/i);
      assert.equal(readFileSync(join(raceOutside, 'sentinel'), 'utf8'), 'keep');
      assert.equal(existsSync(join(raceOutside, 'b.png')), false);

      const portableRaceData = join(ownedRoot, 'mask-portable-race-data');
      const portableRaceRoot = join(portableRaceData, 'dataset_presets/race/.staging-portable-race');
      const portableRaceStore = createDatasetPresetSnapshotStore(portableRaceData, {
        randomId: () => 'portable-race',
        maskFilesystemStrategy: 'portable',
        beforePortableMaskRename: () => {
          renameSync(join(portableRaceRoot, 'masks'), join(portableRaceRoot, 'masks-real'));
          symlinkSync(raceOutside, join(portableRaceRoot, 'masks'), process.platform === 'win32' ? 'junction' : 'dir');
        },
      });
      await assert.rejects(() => portableRaceStore.stageVersion({
        presetId: 'race', version: 1, presetName: 'Race', sourceDataset: 'my-images', sourceRoot,
        selectedPaths: ['b.png'], captionExt: 'txt', loaderConfig, note: null, maskService,
      }), /identity|symlink|masks|root/i);
      assert.equal(readFileSync(join(raceOutside, 'sentinel'), 'utf8'), 'keep');
      assert.equal(existsSync(join(raceOutside, 'b.png')), false);
    }
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
    assert.deepEqual(
      publication.manifest.files.map(file => file.source_path),
      ['b.png', 'sub/a.jpg'],
    );
    const escapedManifest = publication.manifest;
    escapedManifest.files[0].source_path = 'mutated.png';
    assert.equal(publication.manifest.files[0].source_path, 'b.png');
    await publication.publish();

    await expectRejects(
      () =>
        store.stageVersion({
          presetId: 'preset-1',
          version: 99,
          presetName: 'Faces',
          sourceDataset: 'my-images',
          sourceRoot,
          selectedPaths: [],
          retainedPaths: ['b.png'],
          priorManifestPath: publication.manifestPath,
          captionExt: 'cap',
          loaderConfig: { ...loaderConfig, caption_ext: '.cap' },
          note: null,
        }),
      /caption extension.*retained|retained.*caption extension/i,
    );
    assert.equal(existsSync(join(dataRoot, 'dataset_presets/preset-1/v99')), false);

    const aggregatePublication = await store.stageVersion({
      presetId: 'aggregate-missing',
      version: 1,
      presetName: 'Aggregate Missing',
      sourceDataset: 'my-images',
      sourceRoot,
      selectedPaths: aggregatePaths,
      captionExt: 'txt',
      loaderConfig,
      note: null,
    });
    await aggregatePublication.publish();
    for (const index of [0, 1, 2]) {
      unlinkSync(join(aggregatePublication.versionRoot, `media/missing${index}.png`));
    }
    for (const index of [3, 4, 5]) {
      unlinkSync(join(aggregatePublication.versionRoot, `media/missing${index}.txt`));
    }
    await assert.rejects(
      () => store.verifyFast(aggregatePublication.manifestPath),
      error =>
        error instanceof Error &&
        JSON.stringify((error as Error & { missingPaths?: string[] }).missingPaths) ===
          JSON.stringify(['missing0.png', 'missing1.png', 'missing2.png', 'missing3.txt', 'missing4.txt']),
      'verification deterministically reports at most five missing media and source caption sidecars',
    );
    const managedIdentity = statSync(join(dataRoot, 'dataset_presets'), { bigint: true });
    assert.equal(typeof managedIdentity.dev, 'bigint');
    assert.equal(typeof managedIdentity.ino, 'bigint');
    if (process.platform !== 'win32') {
      assert.equal(managedIdentity.mode & BigInt(0o777), BigInt(0o700));
      assert.equal(statSync(dirname(publication.versionRoot), { bigint: true }).mode & BigInt(0o777), BigInt(0o700));
      assert.equal(statSync(publication.versionRoot, { bigint: true }).mode & BigInt(0o777), BigInt(0o700));
    }
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
      () =>
        store.stageVersion({
          presetId: 'missing-source',
          version: 1,
          presetName: 'Missing',
          sourceDataset: 'my-images',
          sourceRoot,
          selectedPaths: ['gone.jpg'],
          captionExt: 'txt',
          loaderConfig,
          note: null,
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
        () =>
          store.stageVersion({
            presetId: 'escaped-source',
            version: 1,
            presetName: 'Escape',
            sourceDataset: 'my-images',
            sourceRoot,
            selectedPaths: ['escape.jpg'],
            captionExt: 'txt',
            loaderConfig,
            note: null,
          }),
        /symlink|outside|escape|root/i,
      );
      writeFileSync(join(sourceRoot, 'dangling.jpg'), 'image');
      symlinkSync(join(ownedRoot, 'does-not-exist.txt'), join(sourceRoot, 'dangling.txt'));
      await expectRejects(
        () =>
          store.stageVersion({
            presetId: 'dangling-caption',
            version: 1,
            presetName: 'Dangling',
            sourceDataset: 'my-images',
            sourceRoot,
            selectedPaths: ['dangling.jpg'],
            captionExt: 'txt',
            loaderConfig,
            note: null,
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
      () =>
        changingStore.stageVersion({
          presetId: 'changing',
          version: 1,
          presetName: 'Changing',
          sourceDataset: 'my-images',
          sourceRoot,
          selectedPaths: ['changing.jpg'],
          captionExt: 'txt',
          loaderConfig,
          note: null,
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
        () =>
          swapStore.stageVersion({
            presetId: 'swap',
            version: 1,
            presetName: 'Swap',
            sourceDataset: 'my-images',
            sourceRoot: swapSourceRoot,
            selectedPaths: ['one.jpg', 'two.jpg'],
            captionExt: 'txt',
            loaderConfig,
            note: null,
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
        () =>
          aggregateStore.stageVersion({
            presetId: 'aggregate',
            version: 1,
            presetName: 'Aggregate',
            sourceDataset: 'my-images',
            sourceRoot,
            selectedPaths: ['aggregate.jpg'],
            captionExt: 'txt',
            loaderConfig,
            note: null,
          }),
        error =>
          error instanceof AggregateError &&
          error.errors.some(item => /changed|copy/i.test(String(item))) &&
          error.errors.some(item => /identity|symlink|root|parent/i.test(String(item))),
      );
      assert.equal(readFileSync(join(aggregateOutsideRoot, 'sentinel'), 'utf8'), 'keep');
      unlinkSync(aggregatePresetRoot);
      renameSync(aggregateMovedRoot, aggregatePresetRoot);
    }

    writeFileSync(join(sourceRoot, 'orphan.jpg'), 'orphan image');
    const outputCollisionV1 = await store.stageVersion({
      presetId: 'output-collision',
      version: 1,
      presetName: 'Collision',
      sourceDataset: 'my-images',
      sourceRoot,
      selectedPaths: ['orphan.jpg'],
      captionExt: 'txt',
      loaderConfig,
      note: null,
    });
    await outputCollisionV1.publish();
    writeFileSync(join(sourceRoot, 'orphan.txt'), 'now a media file');
    await expectRejects(
      () =>
        store.stageVersion({
          presetId: 'output-collision',
          version: 2,
          presetName: 'Collision',
          sourceDataset: 'my-images',
          sourceRoot,
          selectedPaths: ['orphan.txt'],
          retainedPaths: ['orphan.jpg'],
          priorManifestPath: outputCollisionV1.manifestPath,
          captionExt: 'cap',
          loaderConfig,
          note: null,
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
    assert.deepEqual(
      (await store.verifyFull(retained.manifestPath)).files.map(file => file.source_path),
      ['new.webp', 'sub/a.jpg'],
    );
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
        () =>
          retainedSwapStore.stageVersion({
            presetId: 'preset-1',
            version: 99,
            presetName: 'Faces',
            sourceDataset: 'my-images',
            sourceRoot,
            selectedPaths: [],
            retainedPaths: ['sub/a.jpg', 'new.webp'],
            priorManifestPath: retained.manifestPath,
            captionExt: 'txt',
            loaderConfig,
            note: null,
          }),
        /symlink|identity|outside|root/i,
      );
      unlinkSync(retainedNewMedia);
      renameSync(retainedNewBackup, retainedNewMedia);
    }
    await expectRejects(
      () =>
        store.stageVersion({
          presetId: 'preset-1',
          version: 3,
          presetName: 'Faces',
          sourceDataset: 'my-images',
          sourceRoot,
          selectedPaths: ['new.webp'],
          retainedPaths: ['new.webp'],
          priorManifestPath: retained.manifestPath,
          captionExt: 'txt',
          loaderConfig,
          note: null,
        }),
      /both|overlap|duplicate/i,
    );
    await expectRejects(
      () =>
        store.stageVersion({
          presetId: 'preset-1',
          version: 3,
          presetName: 'Faces',
          sourceDataset: 'my-images',
          sourceRoot,
          selectedPaths: ['new.webp'],
          retainedPaths: ['not-in-prior.jpg'],
          priorManifestPath: retained.manifestPath,
          captionExt: 'txt',
          loaderConfig,
          note: null,
        }),
      /retained|missing|prior/i,
    );

    const beforePublishRollback = await store.stageVersion({
      presetId: 'rollback-stage',
      version: 1,
      presetName: 'Rollback',
      sourceDataset: 'my-images',
      sourceRoot,
      selectedPaths: ['new.webp'],
      captionExt: 'txt',
      loaderConfig,
      note: null,
    });
    const stagingParent = dirname(beforePublishRollback.versionRoot);
    assert.equal(
      readdirSync(stagingParent).some(name => name.startsWith('.staging-')),
      true,
    );
    await beforePublishRollback.rollback();
    await beforePublishRollback.rollback();
    assert.equal(
      readdirSync(stagingParent).some(name => name.startsWith('.staging-')),
      false,
    );

    const afterPublishRollback = await store.stageVersion({
      presetId: 'rollback-published',
      version: 1,
      presetName: 'Rollback',
      sourceDataset: 'my-images',
      sourceRoot,
      selectedPaths: ['new.webp'],
      captionExt: 'txt',
      loaderConfig,
      note: null,
    });
    await afterPublishRollback.publish();
    await afterPublishRollback.rollback();
    await afterPublishRollback.rollback();
    assert.equal(existsSync(afterPublishRollback.versionRoot), false);

    if (symlinksSupported) {
      const secureRollback = await store.stageVersion({
        presetId: 'secure-rollback',
        version: 1,
        presetName: 'Secure rollback',
        sourceDataset: 'my-images',
        sourceRoot,
        selectedPaths: ['new.webp'],
        captionExt: 'txt',
        loaderConfig,
        note: null,
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

    if (process.platform !== 'win32' && process.getuid?.() !== 0) {
      const retryStore = createDatasetPresetSnapshotStore(join(ownedRoot, 'retry-delete-data'), {
        randomId: () => 'retry-delete',
      });
      const retryPublication = await retryStore.stageVersion({
        presetId: 'retry-delete',
        version: 1,
        presetName: 'Retry delete',
        sourceDataset: 'my-images',
        sourceRoot,
        selectedPaths: ['new.webp'],
        captionExt: 'txt',
        loaderConfig,
        note: null,
      });
      await retryPublication.publish();
      const retryTombstone = join(ownedRoot, 'retry-delete-data/dataset_presets/.tombstone-retry-delete');
      const lockedMedia = join(retryPublication.versionRoot, 'media');
      chmodSync(lockedMedia, 0o000);
      try {
        await expectRejects(() => retryPublication.rollback(), /EACCES|permission|operation|denied/i);
        assert.equal(existsSync(retryTombstone), true);
        chmodSync(join(retryTombstone, 'media'), 0o700);
        await retryPublication.rollback();
        assert.equal(existsSync(retryTombstone), false);
      } finally {
        if (existsSync(lockedMedia)) chmodSync(lockedMedia, 0o700);
        if (existsSync(join(retryTombstone, 'media'))) chmodSync(join(retryTombstone, 'media'), 0o700);
      }
    }

    const winner = await store.stageVersion({
      presetId: 'collision',
      version: 1,
      presetName: 'Collision',
      sourceDataset: 'my-images',
      sourceRoot,
      selectedPaths: ['new.webp'],
      captionExt: 'txt',
      loaderConfig,
      note: null,
    });
    const loser = await store.stageVersion({
      presetId: 'collision',
      version: 1,
      presetName: 'Collision',
      sourceDataset: 'my-images',
      sourceRoot,
      selectedPaths: ['b.png'],
      captionExt: 'txt',
      loaderConfig,
      note: null,
    });
    await winner.publish();
    let collisionError: DatasetPresetSnapshotConflictError | undefined;
    await assert.rejects(
      () => loser.publish(),
      error => {
        if (!(error instanceof DatasetPresetSnapshotConflictError)) return false;
        collisionError = error;
        return error.code === 'version_exists';
      },
    );
    assert.equal(collisionError?.cause instanceof Error, true);
    assert.equal(collisionError?.message.includes(dataRoot), false);
    await loser.rollback();
    assert.equal(existsSync(winner.versionRoot), true);

    if (symlinksSupported) {
      const genericFailure = await store.stageVersion({
        presetId: 'generic-publish-failure',
        version: 1,
        presetName: 'Generic',
        sourceDataset: 'my-images',
        sourceRoot,
        selectedPaths: ['new.webp'],
        captionExt: 'txt',
        loaderConfig,
        note: null,
      });
      const genericPresetRoot = dirname(genericFailure.versionRoot);
      const genericPresetMoved = `${genericPresetRoot}-real`;
      const genericOutside = join(ownedRoot, 'generic-publish-outside');
      mkdirSync(genericOutside);
      renameSync(genericPresetRoot, genericPresetMoved);
      symlinkSync(genericOutside, genericPresetRoot, process.platform === 'win32' ? 'junction' : 'dir');
      await assert.rejects(
        () => genericFailure.publish(),
        error => error instanceof Error && !(error instanceof DatasetPresetSnapshotConflictError),
      );
      unlinkSync(genericPresetRoot);
      renameSync(genericPresetMoved, genericPresetRoot);
      await genericFailure.rollback();
    }

    const verifyPublication = await store.stageVersion({
      presetId: 'verification',
      version: 1,
      presetName: 'Verify',
      sourceDataset: 'my-images',
      sourceRoot,
      selectedPaths: ['b.png'],
      captionExt: 'txt',
      loaderConfig,
      note: null,
    });
    await verifyPublication.publish();
    const verifyMedia = join(verifyPublication.versionRoot, 'media/b.png');
    const verifyManifestFile = join(verifyPublication.versionRoot, 'manifest.json');
    const legacyStoredManifest = JSON.parse(readFileSync(verifyManifestFile, 'utf8')) as { loader_config: Record<string, unknown> };
    delete legacyStoredManifest.loader_config.mask_min_value;
    delete legacyStoredManifest.loader_config.invert_mask;
    writeFileSync(verifyManifestFile, `${JSON.stringify(legacyStoredManifest, null, 2)}\n`);
    const verifiedLegacyManifest = await store.verifyFast(verifyPublication.manifestPath);
    assert.equal(verifiedLegacyManifest.loader_config.mask_min_value, 0.1, 'legacy verification exposes mask threshold default');
    assert.equal(verifiedLegacyManifest.loader_config.invert_mask, false, 'legacy verification exposes invert-mask default');
    writeFileSync(verifyManifestFile, serializeManifest(verifyPublication.manifest));
    writeFileSync(verifyMedia, Buffer.from([9, 9, 9]));
    assert.equal((await store.verifyFast(verifyPublication.manifestPath)).media_count, 1);
    await assert.rejects(
      () => store.verifyFull(verifyPublication.manifestPath),
      error =>
        error instanceof DatasetPresetSnapshotVerificationError &&
        error.presetId === 'verification' &&
        error.version === 1 &&
        JSON.stringify(error.mismatches) ===
          JSON.stringify([
            {
              kind: 'hash',
              asset: 'media',
              path: 'b.png',
              expected: verifyPublication.manifest.files[0].media_sha256,
              actual: 'e740a6faf2db65f5853148d75d9a335d7c4b94ab106fe5f237bc34fdcfc74584',
            },
          ]) &&
        !JSON.stringify(error).includes(dataRoot),
      'media hash mismatch is exact and root-free',
    );
    writeFileSync(verifyMedia, Buffer.from([5, 6, 7]));
    writeFileSync(join(verifyPublication.versionRoot, 'media/b.txt'), 'x');
    await assert.rejects(
      () => store.verifyFast(verifyPublication.manifestPath),
      error =>
        error instanceof DatasetPresetSnapshotVerificationError &&
        error.mismatches[0]?.kind === 'size' &&
        error.mismatches[0]?.asset === 'caption' &&
        error.mismatches[0]?.path === 'b.txt' &&
        error.mismatches[0]?.expected === 0 &&
        error.mismatches[0]?.actual === 1,
    );
    writeFileSync(join(verifyPublication.versionRoot, 'media/b.txt'), '');
    renameSync(verifyMedia, `${verifyMedia}.saved`);
    await assert.rejects(
      () => store.verifyFast(verifyPublication.manifestPath),
      error =>
        error instanceof DatasetPresetSnapshotVerificationError &&
        JSON.stringify(error.mismatches) ===
          JSON.stringify([{ kind: 'missing', asset: 'media', path: 'b.png', expected: 'present', actual: 'missing' }]),
      'missing managed files report only their source-relative paths',
    );
    mkdirSync(verifyMedia);
    await assert.rejects(
      () => store.verifyFast(verifyPublication.manifestPath),
      error =>
        error instanceof DatasetPresetSnapshotVerificationError &&
        error.mismatches[0]?.kind === 'missing' &&
        error.mismatches[0]?.actual === 'unreadable',
    );
    rmSync(verifyMedia, { recursive: true });
    renameSync(`${verifyMedia}.saved`, verifyMedia);
    const manifestFile = join(verifyPublication.versionRoot, 'manifest.json');
    writeFileSync(manifestFile, serializeManifest(verifyPublication.manifest).replace(/^\{/, '{ '));
    await assert.rejects(
      () => store.verifyFast(verifyPublication.manifestPath),
      error =>
        error instanceof DatasetPresetSnapshotVerificationError &&
        JSON.stringify(error.mismatches) ===
          JSON.stringify([
            {
              kind: 'manifest',
              asset: 'manifest',
              path: 'manifest.json',
              expected: 'canonical valid manifest',
              actual: 'invalid',
            },
          ]) &&
        !error.message.includes(dataRoot),
    );
    writeFileSync(manifestFile, serializeManifest(verifyPublication.manifest));

    const invalidUtf8Publication = await store.stageVersion({
      presetId: 'invalid-manifest-utf8',
      version: 1,
      presetName: 'Replacement �',
      sourceDataset: 'my-images',
      sourceRoot,
      selectedPaths: ['new.webp'],
      captionExt: 'txt',
      loaderConfig,
      note: null,
    });
    await invalidUtf8Publication.publish();
    const invalidUtf8ManifestPath = join(invalidUtf8Publication.versionRoot, 'manifest.json');
    const canonicalManifestBytes = readFileSync(invalidUtf8ManifestPath);
    const replacementIndex = canonicalManifestBytes.indexOf(Buffer.from('�'));
    assert.notEqual(replacementIndex, -1);
    writeFileSync(
      invalidUtf8ManifestPath,
      Buffer.concat([
        canonicalManifestBytes.subarray(0, replacementIndex),
        Buffer.from([0xff]),
        canonicalManifestBytes.subarray(replacementIndex + Buffer.byteLength('�')),
      ]),
    );
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
      presetId: 'caption-hash',
      version: 1,
      presetName: 'Caption hash',
      sourceDataset: 'my-images',
      sourceRoot,
      selectedPaths: ['new.webp'],
      captionExt: 'txt',
      loaderConfig,
      note: null,
    });
    await captionHashPublication.publish();
    writeFileSync(join(captionHashPublication.versionRoot, 'media/new.txt'), 'NEW');
    assert.equal((await store.verifyFast(captionHashPublication.manifestPath)).media_count, 1);
    await assert.rejects(
      () => store.verifyFull(captionHashPublication.manifestPath),
      error =>
        error instanceof DatasetPresetSnapshotVerificationError &&
        error.mismatches[0]?.kind === 'hash' &&
        error.mismatches[0]?.asset === 'caption' &&
        error.mismatches[0]?.path === 'new.txt' &&
        typeof error.mismatches[0]?.expected === 'string' &&
        typeof error.mismatches[0]?.actual === 'string',
    );

    const treeSource = join(ownedRoot, 'exact-tree-source');
    mkdirSync(join(treeSource, 'nested'), { recursive: true });
    writeFileSync(join(treeSource, 'nested/expected.jpg'), 'expected');
    writeFileSync(join(treeSource, 'nested/expected.txt'), 'caption');
    const treePublication = await store.stageVersion({
      presetId: 'exact-tree',
      version: 1,
      presetName: 'Exact tree',
      sourceDataset: 'my-images',
      sourceRoot: treeSource,
      selectedPaths: ['nested/expected.jpg'],
      captionExt: 'txt',
      loaderConfig,
      note: null,
    });
    await treePublication.publish();
    assert.equal((await store.verifyFull(treePublication.manifestPath)).media_count, 1, 'nested expected dirs verify');
    const treeMediaRoot = join(treePublication.versionRoot, 'media');
    for (const [relativePath, contents, asset] of [
      ['nested/extra.jpg', 'image', 'media'],
      ['nested/extra.txt', 'caption', 'caption'],
      ['nested/arbitrary.bin', 'arbitrary', 'media'],
    ] as const) {
      const absolutePath = join(treeMediaRoot, relativePath);
      writeFileSync(absolutePath, contents);
      await assert.rejects(
        () => store.verifyFull(treePublication.manifestPath),
        error =>
          error instanceof DatasetPresetSnapshotVerificationError &&
          error.mismatches.some(
            mismatch =>
              mismatch.kind === 'unexpected' &&
              mismatch.asset === asset &&
              mismatch.path === relativePath &&
              mismatch.expected === 'absent' &&
              mismatch.actual === 'file',
          ) &&
          !JSON.stringify(error.mismatches).includes(dataRoot),
        `${relativePath} is rejected without leaking the managed root`,
      );
      unlinkSync(absolutePath);
    }
    mkdirSync(join(treeMediaRoot, 'unexpected-directory'));
    await assert.rejects(
      () => store.verifyFull(treePublication.manifestPath),
      error =>
        error instanceof DatasetPresetSnapshotVerificationError &&
        error.mismatches.some(
          mismatch =>
            mismatch.kind === 'unexpected' &&
            mismatch.path === 'unexpected-directory' &&
            mismatch.actual === 'directory',
        ),
      'extra directories are rejected',
    );
    rmSync(join(treeMediaRoot, 'unexpected-directory'), { recursive: true });
    for (const name of ['z.bin', 'd.bin', 'c.bin', 'b.bin', 'a.bin', 'e.bin']) {
      writeFileSync(join(treeMediaRoot, 'nested', name), name);
    }
    await assert.rejects(
      () => store.verifyFull(treePublication.manifestPath),
      error =>
        error instanceof DatasetPresetSnapshotVerificationError &&
        error.mismatches.length === 5 &&
        JSON.stringify(error.mismatches.map(mismatch => mismatch.path)) ===
          JSON.stringify(['nested/a.bin', 'nested/b.bin', 'nested/c.bin', 'nested/d.bin', 'nested/e.bin']),
      'unexpected entries are deterministic and bounded to five',
    );
    for (const name of ['z.bin', 'd.bin', 'c.bin', 'b.bin', 'a.bin', 'e.bin']) {
      unlinkSync(join(treeMediaRoot, 'nested', name));
    }
    if (symlinksSupported) {
      symlinkSync(join(treeMediaRoot, 'nested/expected.jpg'), join(treeMediaRoot, 'nested/extra-link.jpg'));
      await assert.rejects(
        () => store.verifyFull(treePublication.manifestPath),
        error =>
          error instanceof DatasetPresetSnapshotVerificationError &&
          error.mismatches.some(
            mismatch =>
              mismatch.kind === 'unexpected' &&
              mismatch.path === 'nested/extra-link.jpg' &&
              mismatch.actual === 'symlink',
          ),
        'symlinks are reported without being followed',
      );
      unlinkSync(join(treeMediaRoot, 'nested/extra-link.jpg'));
      const outsideTree = join(ownedRoot, 'outside-managed-tree');
      mkdirSync(outsideTree);
      writeFileSync(join(outsideTree, 'payload.jpg'), 'outside');
      renameSync(join(treeMediaRoot, 'nested'), join(treeMediaRoot, 'nested-real'));
      symlinkSync(outsideTree, join(treeMediaRoot, 'nested'), process.platform === 'win32' ? 'junction' : 'dir');
      await assert.rejects(
        () => store.verifyFull(treePublication.manifestPath),
        error =>
          error instanceof DatasetPresetSnapshotVerificationError &&
          error.mismatches.some(mismatch => mismatch.path === 'nested' && mismatch.actual === 'symlink') &&
          !JSON.stringify(error.mismatches).includes(outsideTree),
        'an expected directory replaced by a symlink is not followed',
      );
      unlinkSync(join(treeMediaRoot, 'nested'));
      renameSync(join(treeMediaRoot, 'nested-real'), join(treeMediaRoot, 'nested'));
    }

    const badUtf8Root = join(ownedRoot, 'bad-utf8');
    mkdirSync(badUtf8Root);
    writeFileSync(join(badUtf8Root, 'a.jpg'), 'image');
    writeFileSync(join(badUtf8Root, 'a.txt'), Buffer.from([0xc3, 0x28]));
    await expectRejects(
      () =>
        store.stageVersion({
          presetId: 'bad-utf8',
          version: 1,
          presetName: 'Bad UTF-8',
          sourceDataset: 'my-images',
          sourceRoot: badUtf8Root,
          selectedPaths: ['a.jpg'],
          captionExt: 'txt',
          loaderConfig,
          note: null,
        }),
      /UTF-8|encoding/i,
    );

    const quarantinePublication = await store.stageVersion({
      presetId: 'quarantine',
      version: 1,
      presetName: 'Quarantine',
      sourceDataset: 'my-images',
      sourceRoot,
      selectedPaths: ['new.webp'],
      captionExt: 'txt',
      loaderConfig,
      note: null,
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
        presetId: 'secure-quarantine',
        version: 1,
        presetName: 'Secure quarantine',
        sourceDataset: 'my-images',
        sourceRoot,
        selectedPaths: ['new.webp'],
        captionExt: 'txt',
        loaderConfig,
        note: null,
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
    utimesSync(
      join(cleanupPresetRoot, '.staging-old'),
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-01T00:00:00.000Z'),
    );
    utimesSync(join(cleanupPresetRoot, '.staging-new'), cutoff, cutoff);
    assert.deepEqual(await store.cleanupStaging(cutoff), {
      reportedRemoved: ['cleanup/.staging-old'], totalRemoved: 1, truncatedRemoved: 0,
      skippedCandidates: 0, reportedSkippedCandidates: [],
    });
    assert.equal(existsSync(join(cleanupPresetRoot, '.staging-old')), false);
    assert.equal(lstatSync(join(cleanupPresetRoot, '.staging-new')).isDirectory(), true);
    assert.equal(lstatSync(join(cleanupPresetRoot, '.quarantine-v1-ignore')).isDirectory(), true);
    assert.equal(lstatSync(join(cleanupPresetRoot, 'v9')).isDirectory(), true);
    const safeDotPresetRoot = join(dataRoot, 'dataset_presets/.safe-dot-preset');
    // Dot-prefixed preset IDs are valid. Only the reserved root tombstone
    // namespace is skipped by cleanup.
    const rootTombstone = join(dataRoot, 'dataset_presets/.tombstone-owned');
    const newerRootTombstone = join(dataRoot, 'dataset_presets/.tombstone-newer');
    mkdirSync(join(safeDotPresetRoot, '.staging-old'), { recursive: true });
    mkdirSync(join(rootTombstone, '.staging-old'), { recursive: true });
    mkdirSync(join(newerRootTombstone, 'content'), { recursive: true });
    const older = new Date('2026-01-01T00:00:00.000Z');
    utimesSync(join(safeDotPresetRoot, '.staging-old'), older, older);
    utimesSync(join(rootTombstone, '.staging-old'), older, older);
    utimesSync(rootTombstone, older, older);
    utimesSync(newerRootTombstone, cutoff, cutoff);
    assert.deepEqual(await store.cleanupStaging(cutoff), {
      reportedRemoved: ['.safe-dot-preset/.staging-old'], totalRemoved: 1, truncatedRemoved: 0,
      skippedCandidates: 0, reportedSkippedCandidates: [],
    });
    assert.equal(existsSync(join(safeDotPresetRoot, '.staging-old')), false);
    assert.equal(existsSync(rootTombstone), true);
    assert.equal(existsSync(newerRootTombstone), true);

    const priorPublished = publishedManifestPaths(dataRoot);
    const referencedVersion = join(dataRoot, 'dataset_presets/recovery/v1');
    const orphanVersion = join(dataRoot, 'dataset_presets/recovery/v2');
    mkdirSync(referencedVersion, { recursive: true });
    mkdirSync(orphanVersion, { recursive: true });
    writeFileSync(join(referencedVersion, 'manifest.json'), '{}');
    writeFileSync(join(orphanVersion, 'manifest.json'), '{}');
    assertOrphanPaths(
      await store.findPublishedOrphans([
        ...priorPublished,
        'recovery/v1/manifest.json',
        'recovery/v1/manifest.json',
        '../malformed/manifest.json',
        join(ownedRoot, 'absolute/manifest.json'),
      ]),
      ['recovery/v2'],
    );
    assert.equal(existsSync(orphanVersion), true, 'orphan discovery must never delete a published version');
    assert.equal(existsSync(referencedVersion), true, 'orphan discovery must never touch a referenced version');

    mkdirSync(join(dataRoot, 'dataset_presets/recovery/.quarantine-v3-ignore'));
    mkdirSync(join(dataRoot, 'dataset_presets/recovery/.staging-ignore'));
    writeFileSync(join(dataRoot, 'dataset_presets/recovery/unrelated.txt'), 'keep');
    assertOrphanPaths(
      await store.findPublishedOrphans([...priorPublished, 'recovery/v1/manifest.json']),
      ['recovery/v2'],
    );
    const validDotPresetVersion = join(dataRoot, 'dataset_presets/.quarantine-valid-preset/v1');
    mkdirSync(validDotPresetVersion, { recursive: true });
    writeFileSync(join(validDotPresetVersion, 'manifest.json'), '{}');
    assertOrphanPaths(
      await store.findPublishedOrphans([...priorPublished, 'recovery/v1/manifest.json']),
      ['.quarantine-valid-preset/v1', 'recovery/v2'],
      'a root dot-name outside the reserved tombstone namespace is a valid preset ID',
    );
    const authoritativeWithDot = [
      ...priorPublished,
      'recovery/v1/manifest.json',
      '.quarantine-valid-preset/v1/manifest.json',
    ];

    if (process.platform !== 'win32') {
      const unsafeVersion = join(dataRoot, 'dataset_presets/recovery/v3');
      mkdirSync(unsafeVersion, { mode: 0o777 });
      writeFileSync(join(unsafeVersion, 'manifest.json'), '{}');
      chmodSync(unsafeVersion, 0o777);
      const unsafeVersionScan = await store.findPublishedOrphans(authoritativeWithDot);
      assertOrphanPaths(unsafeVersionScan, ['recovery/v2']);
      assert.ok(unsafeVersionScan.skippedCandidates >= 1);
      assert.ok(unsafeVersionScan.reportedSkippedCandidates.includes('recovery/v3'));
      chmodSync(unsafeVersion, 0o700);

      const unsafeManifestVersion = join(dataRoot, 'dataset_presets/recovery/v5');
      mkdirSync(unsafeManifestVersion);
      const unsafeManifest = join(unsafeManifestVersion, 'manifest.json');
      writeFileSync(unsafeManifest, '{}');
      chmodSync(unsafeManifest, 0o666);
      const unsafeManifestScan = await store.findPublishedOrphans([
        ...authoritativeWithDot, 'recovery/v3/manifest.json',
      ]);
      assertOrphanPaths(unsafeManifestScan, ['recovery/v2']);
      assert.ok(unsafeManifestScan.skippedCandidates >= 1);
      assert.ok(unsafeManifestScan.reportedSkippedCandidates.includes('recovery/v5'));
      chmodSync(unsafeManifest, 0o600);
    }

    for (let index = 0; index < 10_005; index += 1) {
      writeFileSync(join(dataRoot, 'dataset_presets', `aaa-prefix-${String(index).padStart(5, '0')}`), 'x');
    }
    const lateCleanup = join(dataRoot, 'dataset_presets/zz-late-cleanup/.staging-old');
    mkdirSync(lateCleanup, { recursive: true });
    utimesSync(lateCleanup, older, older);
    assert.deepEqual(await store.cleanupStaging(cutoff), {
      reportedRemoved: ['zz-late-cleanup/.staging-old'], totalRemoved: 1, truncatedRemoved: 0,
      skippedCandidates: 0, reportedSkippedCandidates: [],
    });
    assert.equal(existsSync(lateCleanup), false, 'complete traversal processes staging after a >10k prefix');

    const boundedRoot = join(dataRoot, 'dataset_presets/bounded');
    for (let index = 1; index <= 105; index += 1) {
      const versionRoot = join(boundedRoot, `v${index}`);
      mkdirSync(versionRoot, { recursive: true });
      writeFileSync(join(versionRoot, 'manifest.json'), '{}');
    }
    const lateOrphan = join(dataRoot, 'dataset_presets/zz-late-orphan/v1');
    mkdirSync(lateOrphan, { recursive: true });
    writeFileSync(join(lateOrphan, 'manifest.json'), '{}');
    const lateAuthoritative = join(dataRoot, 'dataset_presets/zz-late-authoritative/v1');
    mkdirSync(lateAuthoritative, { recursive: true });
    writeFileSync(join(lateAuthoritative, 'manifest.json'), '{}');
    const boundedOrphans = await store.findPublishedOrphans([
      ...authoritativeWithDot, 'recovery/v3/manifest.json', 'recovery/v5/manifest.json',
      'zz-late-authoritative/v1/manifest.json',
    ]);
    assert.equal(boundedOrphans.reportedOrphans.length, 100, 'orphan reporting must be bounded');
    assert.equal(boundedOrphans.totalOrphans, 107, 'complete traversal counts all 105 bounded, recovery, and late orphans');
    assert.equal(boundedOrphans.truncatedOrphans, 7);
    assert.deepEqual(boundedOrphans.reportedOrphans, [...boundedOrphans.reportedOrphans].sort());
    assert.ok(boundedOrphans.reportedOrphans.every(path => !isAbsolute(path) && !path.includes('..')));
    const largeAuthoritativeScan = await store.findPublishedOrphans([
      ...Array.from({ length: 10_001 }, () => 'recovery/v1/manifest.json'),
      'zz-late-authoritative/v1/manifest.json',
    ]);
    assert.ok(largeAuthoritativeScan.totalOrphans > 0, 'authoritative sets over 10k are scanned instead of rejected');

    if (symlinksSupported) {
      const cleanupOutside = join(ownedRoot, 'cleanup-outside');
      mkdirSync(join(cleanupOutside, '.staging-old'), { recursive: true });
      writeFileSync(join(cleanupOutside, '.staging-old/sentinel'), 'keep');
      symlinkSync(
        cleanupOutside,
        join(dataRoot, 'dataset_presets/cleanup-link'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      const afterSymlinkStaging = join(dataRoot, 'dataset_presets/zz-after-symlink/.staging-old');
      mkdirSync(afterSymlinkStaging, { recursive: true });
      utimesSync(afterSymlinkStaging, older, older);
      const cleanupWithSymlink = await store.cleanupStaging(cutoff);
      assert.equal(cleanupWithSymlink.totalRemoved, 1);
      assert.deepEqual(cleanupWithSymlink.reportedRemoved, ['zz-after-symlink/.staging-old']);
      assert.ok(cleanupWithSymlink.skippedCandidates >= 1);
      assert.ok(cleanupWithSymlink.reportedSkippedCandidates.includes('cleanup-link'));
      assert.equal(readFileSync(join(cleanupOutside, '.staging-old/sentinel'), 'utf8'), 'keep');
      unlinkSync(join(dataRoot, 'dataset_presets/cleanup-link'));

      const orphanOutside = join(ownedRoot, 'orphan-outside');
      mkdirSync(orphanOutside);
      writeFileSync(join(orphanOutside, 'manifest.json'), '{}');
      symlinkSync(orphanOutside, join(dataRoot, 'dataset_presets/recovery/v4'), 'dir');
      const found = await store.findPublishedOrphans([
        ...authoritativeWithDot, 'recovery/v3/manifest.json', 'recovery/v5/manifest.json',
      ]);
      assert.equal(found.reportedOrphans.includes('recovery/v4'), false, 'orphan discovery must not follow version symlinks');
      assert.ok(found.skippedCandidates >= 1);
      assert.ok(found.reportedSkippedCandidates.includes('recovery/v4'));

      const manifestLinkVersion = join(dataRoot, 'dataset_presets/recovery/v6');
      mkdirSync(manifestLinkVersion);
      symlinkSync(join(orphanOutside, 'manifest.json'), join(manifestLinkVersion, 'manifest.json'));
      const manifestLinkScan = await store.findPublishedOrphans(authoritativeWithDot);
      assert.ok(manifestLinkScan.reportedSkippedCandidates.includes('recovery/v6'));

      const racedVersion = join(dataRoot, 'dataset_presets/zz-raced/v1');
      mkdirSync(racedVersion, { recursive: true });
      writeFileSync(join(racedVersion, 'manifest.json'), '{}');
      const raceStore = createDatasetPresetSnapshotStore(dataRoot, {
        beforeOrphanCandidateCheck: relativePath => {
          if (relativePath === 'zz-raced/v1') rmSync(racedVersion, { recursive: true });
        },
      });
      const raced = await raceStore.findPublishedOrphans(authoritativeWithDot);
      assert.ok(raced.skippedCandidates >= 1);
      assert.ok(raced.reportedSkippedCandidates.includes('zz-raced/v1'));
    }
  } finally {
    if (existsSync(ownedRoot)) rmSync(ownedRoot, { recursive: true });
  }
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
