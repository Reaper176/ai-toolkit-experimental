import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import DatasetProvenance, { formatDatasetPresetBytes } from '../src/components/DatasetProvenance';
import DatasetPresetLifecycleControls from '../src/components/DatasetPresetLifecycleControls';
import type { ConfirmState } from '../src/components/ConfirmModal';
import type { DatasetPresetDetail, DatasetPresetVersionDetail } from '../src/hooks/useDatasetPresets';
import type { JobDatasetPresetUsageView } from '../src/types';
import useJob from '../src/hooks/useJob';
import { apiClient } from '../src/utils/api';
import type { Job } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type JobWithDatasetPresetUsages = Job & { dataset_preset_usages?: JobDatasetPresetUsageView[] };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args);
};

const loader = {
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
  shrink_video_to_frames: true,
  fps: 24,
  auto_frame_count: false,
  do_i2v: false,
  do_audio: false,
  audio_normalize: false,
  audio_preserve_pitch: false,
  controls: [],
};

function usage(overrides: Partial<JobDatasetPresetUsageView> = {}): JobDatasetPresetUsageView {
  return {
    dataset_index: 0,
    preset_version_id: 'version-1',
    preset_name: 'My images',
    preset_version: 3,
    manifest_sha256: 'a'.repeat(64),
    resolved_loader_config: { ...loader, resolution: [768, 512], num_repeats: 12 },
    source_dataset: 'source-images',
    media_count: 15,
    total_bytes: '9007199254740993',
    version_created_at: '2026-08-02T03:04:05.000Z',
    note: 'the exact training subset',
    ...overrides,
  };
}

function responseBody(item: JobDatasetPresetUsageView) {
  return {
    id: item.preset_version_id,
    preset_id: 'preset-1',
    version: item.preset_version,
    source_dataset: item.source_dataset,
    manifest_path: 'preset-1/v3/manifest.json',
    manifest_sha256: item.manifest_sha256,
    loader_config: loader,
    note: item.note,
    media_count: item.media_count,
    total_bytes: item.total_bytes,
    created_at: item.version_created_at,
    reference_count: 1,
    manifest: { schema_version: 1, files: [] },
  };
}

function textOf(node: ReactTestInstance): string {
  return node.children.map(child => (typeof child === 'string' ? child : textOf(child))).join('');
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

async function run(): Promise<void> {
  const overviewSource = readFileSync(resolve(process.cwd(), 'src/components/JobOverview.tsx'), 'utf8');
  assert.match(overviewSource, /<DatasetProvenance\s+usages=\{job\.dataset_preset_usages\s*\?\?\s*\[\]\}/);
  assert.ok(
    overviewSource.indexOf('Job Info Grid') < overviewSource.indexOf('<DatasetProvenance'),
    'provenance is integrated below the job info grid',
  );
  assert.equal(formatDatasetPresetBytes('9007199254740993'), '9,007,199,254,740,993 bytes');

  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<DatasetProvenance usages={[]} />);
  });
  assert.match(textOf(renderer.root), /No saved dataset preset provenance/);
  await act(async () => renderer.unmount());

  const lifecycleUsage = usage();
  const lifecycleVersion = {
    ...responseBody(lifecycleUsage),
    manifest: responseBody(lifecycleUsage).manifest,
  } as unknown as DatasetPresetVersionDetail;
  const lifecyclePreset = {
    id: 'preset-1',
    name: 'My images',
    archived_at: null,
    latest_version: 3,
    version_count: 2,
    media_count: 15,
    total_bytes: lifecycleUsage.total_bytes,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-02T00:00:00.000Z',
    versions: [lifecycleVersion],
  } as DatasetPresetDetail;
  let confirmation: ConfirmState | null = null;
  let lifecycleCalls: Array<{ url: string; init?: RequestInit }> = [];
  let changed = 0;
  const lifecycleFetch = deferred<Response>();
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    lifecycleCalls.push({ url: String(input), init });
    return lifecycleFetch.promise;
  }) as typeof fetch;
  await act(async () => {
    renderer = TestRenderer.create(
      <DatasetPresetLifecycleControls
        preset={lifecyclePreset}
        version={{ ...lifecycleVersion, reference_count: 0 }}
        selectionDirty
        confirm={(next: ConfirmState) => {
          confirmation = next;
        }}
        onChanged={async () => {
          changed += 1;
        }}
      />,
    );
  });
  const lifecycleButton = (label: string) => {
    const found = renderer.root.findAllByType('button').find(node => textOf(node).includes(label));
    assert.ok(found, `lifecycle button ${label}`);
    return found;
  };
  assert.match(textOf(renderer.root), /9,007,199,254,740,993 bytes/, 'active version displays bigint-safe storage');
  await act(async () => {
    lifecycleButton('Manage preset').props.onClick();
  });
  assert.equal(
    renderer.root.findAllByType('button').some(node => textOf(node).includes('Delete version permanently')),
    false,
    'dirty selection hides permanent delete',
  );
  await act(async () => {
    renderer.update(
      <DatasetPresetLifecycleControls
        preset={lifecyclePreset}
        version={{ ...lifecycleVersion, reference_count: 0 }}
        confirm={(next: ConfirmState) => {
          confirmation = next;
        }}
        onChanged={async () => {
          changed += 1;
        }}
      />,
    );
  });
  await act(async () => {
    lifecycleButton('Delete version permanently').props.onClick();
  });
  const deleteConfirmation = confirmation as ConfirmState | null;
  assert.ok(deleteConfirmation?.message);
  assert.match(deleteConfirmation.message, /My images.*version 3.*15 media.*9,007,199,254,740,993 bytes/i);
  await act(async () => {
    const firstDelete = deleteConfirmation.onConfirm?.();
    const secondDelete = deleteConfirmation.onConfirm?.();
    assert.equal(lifecycleCalls.length, 1, 'double confirmation sends one delete');
    lifecycleFetch.resolve(
      new Response(JSON.stringify({ error: 'Dataset preset version is referenced by one or more jobs' }), {
        status: 409,
      }),
    );
    await Promise.all([firstDelete, secondDelete]);
  });
  assert.equal(changed, 0, 'failed delete leaves active page state unchanged');
  assert.match(textOf(renderer.root.findAll(node => node.props.role === 'alert')[0]), /referenced/);
  assert.match(lifecycleCalls[0].url, /\/api\/dataset-preset-versions\/version-1$/);
  assert.equal(lifecycleCalls[0].init?.method, 'DELETE');

  lifecycleCalls = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    lifecycleCalls.push({ url: String(input), init });
    return new Response(JSON.stringify({ ...lifecyclePreset, name: 'Renamed preset' }), { status: 200 });
  }) as typeof fetch;
  await act(async () => {
    lifecycleButton('Rename preset').props.onClick();
  });
  const renameInput = renderer.root.findByProps({ id: 'dataset-preset-rename' });
  await act(async () => {
    renameInput.props.onChange({ target: { value: '  Renamed   preset  ' } });
  });
  const renameForm = renderer.root.findByProps({ 'aria-label': 'Rename dataset preset' });
  await act(async () => {
    renameForm.props.onSubmit({ preventDefault() {} });
    await Promise.resolve();
  });
  assert.equal(lifecycleCalls[0].init?.method, 'PATCH');
  assert.deepEqual(JSON.parse(String(lifecycleCalls[0].init?.body)), { name: 'Renamed   preset' });
  assert.equal(changed, 1, 'successful rename updates parent state once');

  const archivedPreset = { ...lifecyclePreset, name: 'Renamed preset', archived_at: '2026-08-03T00:00:00.000Z' };
  await act(async () => {
    renderer.update(
      <DatasetPresetLifecycleControls
        preset={archivedPreset}
        version={{ ...lifecycleVersion, reference_count: 0 }}
        confirm={(next: ConfirmState) => {
          confirmation = next;
        }}
        onChanged={async () => {
          changed += 1;
        }}
      />,
    );
  });
  await act(async () => {
    lifecycleButton('Manage preset').props.onClick();
  });
  lifecycleCalls = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    lifecycleCalls.push({ url: String(input), init });
    return new Response(JSON.stringify({ ...archivedPreset, archived_at: null }), { status: 200 });
  }) as typeof fetch;
  await act(async () => {
    lifecycleButton('Restore preset').props.onClick();
  });
  const restoreConfirmation = confirmation as ConfirmState | null;
  await act(async () => {
    await restoreConfirmation?.onConfirm?.();
  });
  assert.deepEqual(JSON.parse(String(lifecycleCalls[0].init?.body)), { archived: false });

  await act(async () => {
    lifecycleButton('Manage preset').props.onClick();
  });
  lifecycleCalls = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    lifecycleCalls.push({ url: String(input), init });
    return new Response(JSON.stringify({ valid: true, version: lifecycleVersion }), { status: 200 });
  }) as typeof fetch;
  await act(async () => {
    lifecycleButton('Verify active version').props.onClick();
    await Promise.resolve();
  });
  assert.match(lifecycleCalls[0].url, /\/version-1\/verify$/);
  assert.equal(lifecycleCalls[0].init?.method, 'POST');
  assert.match(textOf(renderer.root), /Full integrity verification passed/);

  await act(async () => {
    lifecycleButton('Manage preset').props.onClick();
  });
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: 'Dataset preset verification failed',
        preset_id: 'preset-1',
        version_id: 'version-1',
        version: 3,
        mismatches: [
          {
            kind: 'hash',
            asset: 'caption',
            path: 'sub/image.txt',
            expected: 'a'.repeat(64),
            actual: 'b'.repeat(64),
          },
        ],
      }),
      { status: 422 },
    )) as typeof fetch;
  await act(async () => {
    lifecycleButton('Verify active version').props.onClick();
    await Promise.resolve();
    await Promise.resolve();
  });
  const mismatchText = textOf(renderer.root.findAll(node => node.props.role === 'alert')[0]);
  assert.match(mismatchText, /caption.*hash.*sub\/image\.txt/i);
  assert.match(mismatchText, new RegExp(`${'a'.repeat(64)}.*${'b'.repeat(64)}`, 'i'));
  assert.doesNotMatch(mismatchText, /\/private\/|dataset_presets\//);

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: 'Dataset preset verification failed',
        preset_id: 'preset-1',
        version_id: 'version-1',
        version: 3,
        mismatches: Array.from({ length: 5 }, (_, index) => ({
          kind: 'hash',
          asset: 'media',
          path: `nested/image-${index}.jpg`,
          expected: String(index).repeat(64),
          actual: String(index + 1).repeat(64),
        })),
      }),
      { status: 422 },
    )) as typeof fetch;
  await act(async () => {
    lifecycleButton('Verify active version').props.onClick();
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.ok(
    textOf(renderer.root.findAll(node => node.props.role === 'alert')[0]).length <= 240,
    'structured lifecycle failures remain bounded as a whole',
  );

  await act(async () => {
    renderer.update(
      <DatasetPresetLifecycleControls
        preset={lifecyclePreset}
        version={{ ...lifecycleVersion, reference_count: 1 }}
        confirm={(next: ConfirmState) => {
          confirmation = next;
        }}
        onChanged={async () => {
          changed += 1;
        }}
      />,
    );
  });
  assert.equal(
    renderer.root.findAllByType('button').some(node => textOf(node).includes('Delete version permanently')),
    false,
    'referenced or unknown versions do not expose permanent deletion',
  );
  await act(async () => renderer.unmount());

  async function staleLifecycleMutation(kind: 'verify' | 'rename' | 'archive', succeeds: boolean): Promise<void> {
    const pendingRequest = deferred<Response>();
    const pendingEvents: boolean[] = [];
    const applied: boolean[] = [];
    let globalRefreshes = 0;
    let localConfirmation: ConfirmState | null = null;
    globalThis.fetch = (() => pendingRequest.promise) as typeof fetch;
    const onChanged = async (_change: unknown, applyToActiveIdentity: boolean) => {
      globalRefreshes += 1;
      applied.push(applyToActiveIdentity);
    };
    await act(async () => {
      renderer = TestRenderer.create(
        <DatasetPresetLifecycleControls
          preset={lifecyclePreset}
          version={{ ...lifecycleVersion, reference_count: 0 }}
          confirm={(next: ConfirmState) => {
            localConfirmation = next;
          }}
          onPendingChange={(value: boolean) => pendingEvents.push(value)}
          onChanged={onChanged}
        />,
      );
    });
    const actionButton = (label: string) => {
      const found = renderer.root.findAllByType('button').find(node => textOf(node).includes(label));
      assert.ok(found, `stale lifecycle button ${label}`);
      return found;
    };
    await act(async () => actionButton('Manage preset').props.onClick());
    if (kind === 'verify') {
      await act(async () => actionButton('Verify active version').props.onClick());
    } else if (kind === 'rename') {
      await act(async () => actionButton('Rename preset').props.onClick());
      const input = renderer.root.findByProps({ id: 'dataset-preset-rename' });
      await act(async () => input.props.onChange({ target: { value: 'Old renamed' } }));
      await act(async () =>
        renderer.root.findByProps({ 'aria-label': 'Rename dataset preset' }).props.onSubmit({ preventDefault() {} }),
      );
    } else {
      await act(async () => actionButton('Archive preset').props.onClick());
      const archiveConfirmation = localConfirmation as ConfirmState | null;
      await act(async () => {
        archiveConfirmation?.onConfirm?.();
      });
    }
    assert.equal(pendingEvents.at(-1), true, `${kind} reports page-level pending`);
    const newPreset = { ...lifecyclePreset, id: 'preset-2', name: 'New active' };
    const newVersion = { ...lifecycleVersion, id: 'version-2', preset_id: 'preset-2', reference_count: 0 };
    await act(async () => {
      renderer.update(
        <DatasetPresetLifecycleControls
          preset={newPreset}
          version={newVersion}
          confirm={(next: ConfirmState) => {
            localConfirmation = next;
          }}
          onPendingChange={(value: boolean) => pendingEvents.push(value)}
          onChanged={onChanged}
        />,
      );
    });
    assert.equal(pendingEvents.at(-1), false, `${kind} identity change clears page-level pending`);
    assert.doesNotMatch(textOf(renderer.root), /Working/);
    const successBody =
      kind === 'verify'
        ? { valid: true, version: lifecycleVersion }
        : kind === 'rename'
          ? { ...lifecyclePreset, name: 'Old renamed' }
          : { ...lifecyclePreset, archived_at: '2026-08-04T00:00:00.000Z' };
    await act(async () => {
      pendingRequest.resolve(
        new Response(JSON.stringify(succeeds ? successBody : { error: 'old request failed' }), {
          status: succeeds ? 200 : 500,
        }),
      );
      await pendingRequest.promise;
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.equal(globalRefreshes, succeeds ? 1 : 0, `${kind} stale success refreshes globally exactly once`);
    assert.deepEqual(applied, succeeds ? [false] : [], `${kind} stale result cannot update the new identity`);
    assert.equal(
      renderer.root.findAll(node => node.props.role === 'alert').length,
      0,
      `${kind} old failure stays hidden`,
    );
    assert.doesNotMatch(textOf(renderer.root), /Full integrity verification passed|Saved\./);
    await act(async () => renderer.unmount());
  }

  await staleLifecycleMutation('verify', true);
  await staleLifecycleMutation('rename', true);
  await staleLifecycleMutation('archive', true);
  await staleLifecycleMutation('verify', false);

  const sameIdentityRequest = deferred<Response>();
  const sameIdentityPending: boolean[] = [];
  globalThis.fetch = (() => sameIdentityRequest.promise) as typeof fetch;
  await act(async () => {
    renderer = TestRenderer.create(
      <DatasetPresetLifecycleControls
        preset={lifecyclePreset}
        version={{ ...lifecycleVersion, reference_count: 0 }}
        onPendingChange={(value: boolean) => sameIdentityPending.push(value)}
        onChanged={() => undefined}
      />,
    );
  });
  await act(async () => lifecycleButton('Manage preset').props.onClick());
  await act(async () => lifecycleButton('Verify active version').props.onClick());
  await act(async () => {
    renderer.update(
      <DatasetPresetLifecycleControls
        preset={{ ...lifecyclePreset, name: 'Same identity renamed' }}
        version={{ ...lifecycleVersion, reference_count: 0 }}
        onPendingChange={(value: boolean) => sameIdentityPending.push(value)}
        onChanged={() => undefined}
      />,
    );
  });
  assert.equal(sameIdentityPending.at(-1), true, 'same-ID metadata refresh does not clear mutation busy state');
  assert.match(textOf(renderer.root), /Working/);
  await act(async () => {
    sameIdentityRequest.resolve(
      new Response(JSON.stringify({ valid: true, version: lifecycleVersion }), { status: 200 }),
    );
    await sameIdentityRequest.promise;
    await Promise.resolve();
  });
  await act(async () => renderer.unmount());

  let currentJob: JobWithDatasetPresetUsages | null = null;
  let currentJobStatus = '';
  let currentJobError: string | null | undefined;
  const observedJob = () => currentJob as JobWithDatasetPresetUsages | null;
  let refreshCurrent!: () => Promise<void>;
  function JobHarness({ id }: { id: string }) {
    const result = useJob(id);
    currentJob = result.job;
    currentJobStatus = result.status;
    currentJobError = result.error;
    refreshCurrent = result.refreshJob;
    return null;
  }
  const requestA = deferred<{ data: JobWithDatasetPresetUsages }>();
  const requestB = deferred<{ data: JobWithDatasetPresetUsages }>();
  const queued = [requestA, requestB];
  const originalGet = apiClient.get;
  apiClient.get = (() => queued.shift()!.promise) as typeof apiClient.get;
  const jobA = { id: 'job-a', name: 'A', dataset_preset_usages: [usage()] } as unknown as JobWithDatasetPresetUsages;
  const jobB = {
    id: 'job-b',
    name: 'B',
    dataset_preset_usages: [usage({ preset_name: 'B preset' })],
  } as unknown as JobWithDatasetPresetUsages;
  await act(async () => {
    renderer = TestRenderer.create(<JobHarness id="job-a" />);
    await Promise.resolve();
  });
  await act(async () => {
    renderer.update(<JobHarness id="job-b" />);
    await Promise.resolve();
  });
  await act(async () => {
    requestB.resolve({ data: jobB });
    await requestB.promise;
  });
  assert.equal(observedJob()?.id, 'job-b');
  await act(async () => {
    requestA.resolve({ data: jobA });
    await requestA.promise;
  });
  assert.equal(observedJob()?.id, 'job-b', 'a stale job response cannot pair old provenance with the new job');

  const compactResponse = deferred<{ data: JobWithDatasetPresetUsages }>();
  queued.push(compactResponse);
  await act(async () => {
    const refresh = refreshCurrent();
    compactResponse.resolve({ data: { ...jobB, status: 'running', dataset_preset_usages: undefined } });
    await refresh;
  });
  assert.equal(observedJob()?.dataset_preset_usages?.[0]?.preset_name, 'B preset', 'compact polls preserve provenance');
  apiClient.get = (async () => ({ data: null })) as typeof apiClient.get;
  await act(async () => {
    await refreshCurrent();
  });
  assert.equal(observedJob(), null, 'a valid null job response clears job state');
  assert.equal(currentJobStatus, 'success');
  apiClient.get = (async () => ({ data: ['not', 'a', 'job'] })) as typeof apiClient.get;
  await act(async () => {
    await refreshCurrent();
  });
  assert.equal(observedJob(), null, 'malformed response cannot be object-spread into job state');
  assert.equal(currentJobStatus, 'error');
  assert.ok(currentJobError && currentJobError.length <= 240 && !currentJobError.includes('not,a,job'));
  apiClient.get = originalGet;
  await act(async () => renderer.unmount());

  const first = usage({ dataset_index: 2, preset_name: 'Second input', preset_version_id: 'v2' });
  const second = usage({
    dataset_index: 0,
    preset_name: 'First input',
    preset_version_id: 'v1',
    resolved_loader_config: { ...loader, num_repeats: 99 },
  });
  const pending = deferred<Response>();
  const calls: string[] = [];
  globalThis.fetch = ((input: string | URL | Request) => {
    calls.push(String(input));
    return pending.promise;
  }) as typeof fetch;

  await act(async () => {
    renderer = TestRenderer.create(<DatasetProvenance usages={[first, second]} />);
  });
  const compact = renderer.root.findAll(node => node.props['data-dataset-index'] !== undefined);
  assert.deepEqual(
    compact.map(node => node.props['data-dataset-index']),
    [0, 2],
    'cards sort by dataset index',
  );
  assert.match(textOf(compact[0]), /Dataset 1.*First input.*Version 3.*Integrity: Not verified/);
  assert.doesNotMatch(textOf(compact[0]), /source-images/, 'details stay lazy');

  const expand = compact[0].findByType('button');
  await act(async () => {
    expand.props.onClick();
  });
  assert.deepEqual(calls, ['/api/dataset-preset-versions/v1']);
  assert.match(textOf(renderer.root), /Loading version details/);
  await act(async () => {
    pending.resolve(new Response(JSON.stringify(responseBody(second)), { status: 200 }));
    await pending.promise;
  });
  const expandedText = textOf(renderer.root);
  assert.match(expandedText, /Source dataset.*source-images/);
  assert.match(expandedText, /Media.*15/);
  assert.match(expandedText, /9,007,199,254,740,993 bytes/);
  assert.match(expandedText, /Aug 2, 2026|2026/, 'created time is rendered');
  assert.match(expandedText, /aaaaaaaaaaaa…aaaaaaaa/);
  assert.match(expandedText, /the exact training subset/);
  assert.ok(
    expandedText.indexOf('auto_frame_count') < expandedText.indexOf('caption_ext') &&
      expandedText.indexOf('caption_ext') < expandedText.indexOf('num_repeats'),
    'resolved settings are sorted',
  );
  assert.match(expandedText, /num_repeats.*99/, 'usage-specific final settings are shown');

  await act(async () => {
    expand.props.onClick();
    expand.props.onClick();
  });
  assert.equal(calls.length, 1, 'repeated expansion reuses version detail');
  await act(async () => renderer.unmount());

  const failed = usage({ preset_version_id: 'failed-version' });
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: 'x'.repeat(1000) }), { status: 500 })) as typeof fetch;
  await act(async () => {
    renderer = TestRenderer.create(<DatasetProvenance usages={[failed]} />);
  });
  await act(async () => {
    renderer.root.findByType('button').props.onClick();
    await Promise.resolve();
  });
  const failure = renderer.root.findAll(node => node.props.role === 'alert')[0];
  assert.ok(failure);
  assert.ok(textOf(failure).length <= 260, 'failure text is bounded');

  const stale = deferred<Response>();
  globalThis.fetch = (() => stale.promise) as typeof fetch;
  await act(async () => {
    renderer.update(<DatasetProvenance usages={[usage({ preset_version_id: 'old' })]} />);
  });
  await act(async () => {
    renderer.root.findByType('button').props.onClick();
  });
  await act(async () => {
    renderer.update(<DatasetProvenance usages={[usage({ preset_version_id: 'new', preset_name: 'New' })]} />);
  });
  await act(async () => {
    stale.resolve(new Response(JSON.stringify(responseBody(usage({ preset_version_id: 'old' }))), { status: 200 }));
    await stale.promise;
  });
  assert.doesNotMatch(textOf(renderer.root), /Source dataset/, 'stale detail does not attach to a new usage');
  await act(async () => renderer.unmount());
}

run().then(
  () => {
    console.error = originalError;
    console.log('dataset provenance renderer contracts passed');
  },
  error => {
    console.error = originalError;
    throw error;
  },
);
