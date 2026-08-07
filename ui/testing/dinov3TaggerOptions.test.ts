import assert from 'node:assert/strict';
import { captionerTypes, maxResOptions } from '../src/helpers/captionOptions';
import {
  DEFAULT_DINOV3_INCLUDED_CATEGORIES,
  DINOV3_CATEGORIES,
  normalizeOptionalVocabPath,
  normalizeThreshold,
  normalizeTopK,
  toggleCategory,
} from '../src/helpers/dinov3TaggerOptions';

assert.deepEqual(DINOV3_CATEGORIES, [
  ['unassigned', 'Unassigned'],
  ['general', 'General'],
  ['artist', 'Artist'],
  ['contributor', 'Contributor'],
  ['copyright', 'Copyright'],
  ['character', 'Character'],
  ['species_meta', 'Species / Meta'],
  ['disambiguation', 'Disambiguation'],
  ['meta', 'Meta'],
  ['lore', 'Lore'],
]);
assert.deepEqual(DEFAULT_DINOV3_INCLUDED_CATEGORIES, ['general', 'character', 'species_meta']);
assert.equal(normalizeThreshold('0.50'), 0.5);
assert.equal(normalizeThreshold('0'), 0);
assert.equal(normalizeThreshold('1'), 1);
assert.throws(() => normalizeThreshold('1.1'));
assert.throws(() => normalizeThreshold('NaN'));
assert.equal(normalizeTopK('30'), 30);
assert.throws(() => normalizeTopK('0'));
assert.throws(() => normalizeTopK('2.5'));

assert.equal(normalizeOptionalVocabPath(undefined), undefined);
assert.equal(normalizeOptionalVocabPath(null), undefined);
assert.equal(normalizeOptionalVocabPath('   \t'), undefined);
assert.equal(normalizeOptionalVocabPath(' /models/my vocab.json '), ' /models/my vocab.json ');

const original = ['general'];
assert.deepEqual(toggleCategory(original, 'character', true), ['general', 'character']);
assert.deepEqual(toggleCategory(original, 'general', true), ['general']);
assert.deepEqual(toggleCategory(original, 'general', false), []);
assert.deepEqual(original, ['general']);
assert.notEqual(toggleCategory(original, 'general', true), original);

const option = captionerTypes.find(value => value.name === 'DINOv3TaggerCaptioner');
assert.ok(option);
assert.equal(option.label, 'DINOv3 Tagger');
assert.equal(option.group, 'image');
assert.equal(option.supportsQuantization, false);
assert.equal(option.supportsLowVram, false);
assert.deepEqual(option.defaults?.['config.process[0].caption.model_name_or_path'], ['', '']);
assert.equal(option.defaults?.['config.process[0].caption.vocab_path'][0], undefined);
assert.equal(option.defaults?.['config.process[0].caption.max_res'][0], 1024);
assert.equal(option.defaults?.['config.process[0].caption.threshold'][0], 0.5);
assert.equal(option.defaults?.['config.process[0].caption.top_k'][0], 30);
assert.ok(option.additionalSections?.includes('caption.vocab_path'));
assert.ok(option.additionalSections?.includes('caption.threshold_or_top_k'));
assert.ok(maxResOptions.some(value => value.value === '1024'));
assert.ok(!JSON.stringify(option.defaults).includes('/run/media/john/'));

console.log('DINOv3 tagger option tests passed');
