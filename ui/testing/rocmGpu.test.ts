import assert from 'node:assert/strict';
import { parseRocmSmiJson } from '../src/server/rocmGpu';

const TWO_CARD_OUTPUT = JSON.stringify({
  card0: {
    'Temperature (Sensor edge) (C)': '53.0',
    'Temperature (Sensor junction) (C)': '62.0',
    'Average Graphics Package Power (W)': '92.0',
    'GPU use (%)': '27',
    'VRAM Total Memory (B)': '25753026560',
    'VRAM Total Used Memory (B)': '5476655104',
    'Card Series': 'AMD Radeon RX 7900 XTX',
  },
  card1: {
    'Temperature (Sensor edge) (C)': '40.0',
    'Current Socket Graphics Package Power (W)': '32.142',
    'GPU use (%)': '0',
    'VRAM Total Memory (B)': '536870912',
    'VRAM Total Used Memory (B)': '21512192',
    'Card Series': 'AMD Ryzen 7 7800X3D 8-Core Processor',
  },
});

const [gpu] = parseRocmSmiJson(TWO_CARD_OUTPUT);
assert.equal(parseRocmSmiJson(TWO_CARD_OUTPUT).length, 1);
assert.deepEqual(gpu, {
  index: 0,
  name: 'AMD Radeon RX 7900 XTX',
  driverVersion: 'ROCm',
  temperature: 53,
  utilization: { gpu: 27, memory: 21 },
  memory: { total: 24560, free: 19337, used: 5223 },
  power: { draw: 92, limit: 0 },
  clocks: { graphics: 0, memory: 0 },
  fan: { speed: 0 },
});

const cardTwoOnly = JSON.stringify({
  card2: {
    'GPU use (%)': '10',
    'VRAM Total Memory (B)': String(4 * 1024 ** 3),
    'VRAM Total Used Memory (B)': String(1024 ** 3),
    'Card Series': 'AMD Test GPU',
  },
});
const [cardTwo] = parseRocmSmiJson(cardTwoOnly);
assert.equal(cardTwo.index, 2);
assert.equal(cardTwo.temperature, 0);
assert.equal(cardTwo.power.draw, 0);

assert.throws(() => parseRocmSmiJson('not-json'), /Invalid ROCm SMI JSON/);
assert.throws(
  () => parseRocmSmiJson(JSON.stringify({ card0: { 'Card Series': 'Missing memory' } })),
  /missing required fields/i,
);

console.log('ROCm GPU parser tests passed');
