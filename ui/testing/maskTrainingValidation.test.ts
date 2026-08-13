import assert from 'node:assert/strict';
import { validateMaskTraining } from '../src/helpers/maskTrainingValidation';

const masked = [{ mask_path: '/managed/masks' }];
const maskless = [{ mask_path: null }];

assert.doesNotThrow(() => validateMaskTraining({
  enabled: true, multiplier: 0.5, trainTurbo: false, datasets: masked,
}));
assert.doesNotThrow(() => validateMaskTraining({
  enabled: true, multiplier: 0, trainTurbo: false, datasets: masked,
}), 'zero disables the prior-loss contribution without being an invalid loss weight');
assert.doesNotThrow(() => validateMaskTraining({
  enabled: false, multiplier: 0.5, trainTurbo: true, datasets: maskless,
}));

for (const multiplier of [-0.1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
  assert.throws(
    () => validateMaskTraining({ enabled: false, multiplier, trainTurbo: false, datasets: maskless }),
    /multiplier.*finite nonnegative/i,
  );
}
assert.throws(
  () => validateMaskTraining({ enabled: true, multiplier: 0.5, trainTurbo: false, datasets: maskless }),
  /resolved mask/i,
);
for (const invalid of [
  { enabled: null }, { enabled: 'true' }, { multiplier: null }, { trainTurbo: null }, { trainTurbo: 1 },
]) {
  assert.throws(
    () => validateMaskTraining({
      enabled: false, multiplier: 0.5, trainTurbo: false, datasets: maskless, ...invalid,
    } as never),
    /inverted mask prior|turbo/i,
  );
}
assert.throws(
  () => validateMaskTraining({ enabled: true, multiplier: 0.5, trainTurbo: true, datasets: masked }),
  /turbo/i,
);

console.log('mask training validation tests passed');
