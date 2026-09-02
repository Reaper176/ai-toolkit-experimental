import assert from 'node:assert/strict';
import {
  BUILT_IN_PRESET_ROWS,
  materializeBuiltInTrainingPresetRow,
} from '../src/helpers/builtInTrainingPresetDefinitions';
import {
  trainingPresetCatalogIdDigest,
  trainingPresetCatalogIdLogDigest,
} from '../src/server/trainingPresetCatalogDigest';
import {
  getBuiltInTrainingPresetCatalog,
  loadBuiltInTrainingPresetCatalog,
  type TrainingPresetCatalogEntryEvent,
  type TrainingPresetCatalogProviderEvent,
} from '../src/server/trainingPresetCatalogRuntime';

function collectEvents(): {
  events: TrainingPresetCatalogEntryEvent[];
  logger: (event: TrainingPresetCatalogEntryEvent) => void;
} {
  const events: TrainingPresetCatalogEntryEvent[] = [];
  return { events, logger: event => events.push(event) };
}

const providerEvent: TrainingPresetCatalogProviderEvent = { code: 'BUILTIN_PRESET_PROVIDER_FAILED' };
assert.deepEqual(providerEvent, { code: 'BUILTIN_PRESET_PROVIDER_FAILED' });

assert.equal(
  trainingPresetCatalogIdDigest('builtin:anima:character-identity@1'),
  '66606e16d08a712439bc3470d344fcb6f76a7ea58dc312a300e88317959e8b1a',
  'the digest helper exposes the full lowercase SHA-256 digest',
);
assert.equal(trainingPresetCatalogIdLogDigest('builtin:anima:character-identity@1'), '66606e16d08a');

{
  const { events, logger } = collectEvents();
  const readonlyRows = [BUILT_IN_PRESET_ROWS[0]] as const;
  const actual = loadBuiltInTrainingPresetCatalog(readonlyRows, logger);
  const expected = materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[0]);
  assert.deepEqual(actual, [expected]);
  assert.notEqual(actual[0], expected, 'the loader returns a copy of its accepted value');
  assert.equal(Object.isFrozen(actual[0]), false, 'callers receive mutable copies');
  assert.deepEqual(events, []);
}

{
  const malformed = { ...BUILT_IN_PRESET_ROWS[0], id: 'builtin:anima:wrong@1' };
  const { events, logger } = collectEvents();
  const actual = loadBuiltInTrainingPresetCatalog([malformed, BUILT_IN_PRESET_ROWS[1]], logger);
  assert.deepEqual(actual, [materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[1])]);
  assert.deepEqual(events, [{ code: 'BUILTIN_PRESET_INVALID', id_digest: '287d77226dca' }]);
}

{
  const malformed = { ...BUILT_IN_PRESET_ROWS[0], id: 'builtin:anima:wrong@1' };
  const events: TrainingPresetCatalogEntryEvent[] = [];
  const actual = loadBuiltInTrainingPresetCatalog([malformed, BUILT_IN_PRESET_ROWS[1]], event => {
    events.push(event);
    throw new Error('private logger detail');
  });
  assert.deepEqual(actual, [materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[1])]);
  assert.deepEqual(events, [{ code: 'BUILTIN_PRESET_INVALID', id_digest: '287d77226dca' }]);
}

{
  const duplicateId = BUILT_IN_PRESET_ROWS[0].id;
  const { events, logger } = collectEvents();
  const actual = loadBuiltInTrainingPresetCatalog(
    [structuredClone(BUILT_IN_PRESET_ROWS[0]), structuredClone(BUILT_IN_PRESET_ROWS[0]), BUILT_IN_PRESET_ROWS[1]],
    logger,
  );
  assert.deepEqual(actual, [materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[1])]);
  assert.deepEqual(events, [
    { code: 'BUILTIN_PRESET_ID_COLLISION', id_digest: trainingPresetCatalogIdLogDigest(duplicateId) },
    { code: 'BUILTIN_PRESET_ID_COLLISION', id_digest: trainingPresetCatalogIdLogDigest(duplicateId) },
  ]);
}

{
  const events: TrainingPresetCatalogEntryEvent[] = [];
  const actual = loadBuiltInTrainingPresetCatalog(
    [structuredClone(BUILT_IN_PRESET_ROWS[0]), structuredClone(BUILT_IN_PRESET_ROWS[0]), BUILT_IN_PRESET_ROWS[1]],
    event => {
      events.push(event);
      throw new Error('private logger detail');
    },
  );
  assert.deepEqual(actual, [materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[1])]);
  assert.deepEqual(events, [
    { code: 'BUILTIN_PRESET_ID_COLLISION', id_digest: '66606e16d08a' },
    { code: 'BUILTIN_PRESET_ID_COLLISION', id_digest: '66606e16d08a' },
  ]);
}

{
  const valid = structuredClone(BUILT_IN_PRESET_ROWS[0]);
  const invalidWithSameRawId = { ...valid, name: '' };
  const { events, logger } = collectEvents();
  const actual = loadBuiltInTrainingPresetCatalog([valid, invalidWithSameRawId], logger);
  assert.deepEqual(actual, [], 'raw collisions exclude valid and invalid participants before validation');
  assert.deepEqual(events, [
    { code: 'BUILTIN_PRESET_ID_COLLISION', id_digest: '66606e16d08a' },
    { code: 'BUILTIN_PRESET_ID_COLLISION', id_digest: '66606e16d08a' },
  ]);
}

{
  const lowercase = { ...BUILT_IN_PRESET_ROWS[0], id: 'builtin:anima:wrong@1' };
  const uppercase = { ...BUILT_IN_PRESET_ROWS[0], id: 'BUILTIN:ANIMA:WRONG@1' };
  const { events, logger } = collectEvents();
  assert.deepEqual(loadBuiltInTrainingPresetCatalog([lowercase, uppercase], logger), []);
  assert.deepEqual(events.map(event => event.code), ['BUILTIN_PRESET_INVALID', 'BUILTIN_PRESET_INVALID']);
  assert.notEqual(events[0].id_digest, events[1].id_digest, 'complete IDs remain case-sensitive');
}

{
  const missingId = { ...BUILT_IN_PRESET_ROWS[0] } as Record<string, unknown>;
  delete missingId.id;
  const nonstringId = { ...BUILT_IN_PRESET_ROWS[1], id: 7 };
  const { events, logger } = collectEvents();
  assert.deepEqual(loadBuiltInTrainingPresetCatalog([missingId, nonstringId], logger), []);
  assert.deepEqual(events, [
    { code: 'BUILTIN_PRESET_INVALID', id_digest: 'af3f74e95d77' },
    { code: 'BUILTIN_PRESET_INVALID', id_digest: 'd195b43dc9ba' },
  ]);
}

{
  const sparseRows: unknown[] = [BUILT_IN_PRESET_ROWS[0], , BUILT_IN_PRESET_ROWS[1]];
  const { events, logger } = collectEvents();
  assert.deepEqual(loadBuiltInTrainingPresetCatalog(sparseRows, logger), [
    materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[0]),
    materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[1]),
  ]);
  assert.deepEqual(events, [
    { code: 'BUILTIN_PRESET_INVALID', id_digest: 'd195b43dc9ba' },
  ]);
}

{
  let firstIndexReads = 0;
  const changingRows = new Proxy([BUILT_IN_PRESET_ROWS[0], BUILT_IN_PRESET_ROWS[1]], {
    get: (target, key, receiver) => {
      if (key === '0') {
        firstIndexReads += 1;
        return firstIndexReads === 1 ? BUILT_IN_PRESET_ROWS[0] : BUILT_IN_PRESET_ROWS[1];
      }
      return Reflect.get(target, key, receiver);
    },
  });
  const { events, logger } = collectEvents();
  assert.deepEqual(loadBuiltInTrainingPresetCatalog(changingRows, logger), [
    materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[0]),
    materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[1]),
  ]);
  assert.equal(firstIndexReads, 1, 'each numeric row index is snapshotted exactly once');
  assert.deepEqual(events, []);
}

{
  const throwingRows: unknown[] = [BUILT_IN_PRESET_ROWS[0], undefined, BUILT_IN_PRESET_ROWS[1]];
  let throwingIndexReads = 0;
  Object.defineProperty(throwingRows, 1, {
    enumerable: true,
    configurable: true,
    get: () => {
      throwingIndexReads += 1;
      throw new Error('private row provider detail');
    },
  });
  const { events, logger } = collectEvents();
  assert.deepEqual(loadBuiltInTrainingPresetCatalog(throwingRows, logger), [
    materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[0]),
    materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[1]),
  ]);
  assert.equal(throwingIndexReads, 1);
  assert.deepEqual(events, [
    { code: 'BUILTIN_PRESET_INVALID', id_digest: 'd195b43dc9ba' },
  ]);
}

{
  const { events, logger } = collectEvents();
  const first = getBuiltInTrainingPresetCatalog(logger) as any[];
  assert.equal(first.length, BUILT_IN_PRESET_ROWS.length);
  first[0].warnings[0] = 'caller mutation';
  first[0].snapshot.config.process[0].model.model_kwargs.mutated = true;

  const second = getBuiltInTrainingPresetCatalog(logger) as any[];
  assert.equal(second[0].warnings[0], BUILT_IN_PRESET_ROWS[0].warnings[0]);
  assert.equal('mutated' in second[0].snapshot.config.process[0].model.model_kwargs, false);
  assert.notEqual(first[0], second[0]);
  assert.deepEqual(events, []);
}

console.log('training preset catalog runtime tests passed');
