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

const gpus = parseRocmSmiJson(TWO_CARD_OUTPUT);
assert.equal(gpus.length, 1);
const [gpu] = gpus;
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

const SPARSE_CARD_OUTPUT = JSON.stringify({
  card2: {
    'GPU use (%)': '10',
    'VRAM Total Memory (B)': String(4 * 1024 ** 3),
    'VRAM Total Used Memory (B)': String(1024 ** 3),
    'Card Series': 'AMD Test GPU 2',
    'Current Socket Graphics Package Power (W)': '32.142',
  },
  card3: {
    'GPU use (%)': '5',
    'VRAM Total Memory (B)': String(2 * 1024 ** 3 - 1),
    'VRAM Total Used Memory (B)': String(256 * 1024 ** 2),
    'Card Series': 'AMD Below Threshold GPU',
  },
  card0: {
    'GPU use (%)': '20',
    'VRAM Total Memory (B)': String(2 * 1024 ** 3),
    'VRAM Total Used Memory (B)': String(512 * 1024 ** 2),
    'Card Series': 'AMD Test GPU 0',
  },
});
const sparseCards = parseRocmSmiJson(SPARSE_CARD_OUTPUT);
assert.equal(sparseCards.length, 2);
assert.deepEqual(
  sparseCards.map(({ index }) => index),
  [0, 2],
);
const [cardZero, cardTwo] = sparseCards;
assert.equal(cardZero.temperature, 0);
assert.equal(cardZero.power.draw, 0);
assert.equal(cardTwo.power.draw, 32.142);

const MALFORMED_LOW_MEMORY_OUTPUT = JSON.stringify({
  card0: {
    'GPU use (%)': '27',
    'VRAM Total Memory (B)': String(24 * 1024 ** 3),
    'VRAM Total Used Memory (B)': String(5 * 1024 ** 3),
    'Card Series': 'AMD Radeon RX 7900 XTX',
  },
  card1: {
    'VRAM Total Memory (B)': String(512 * 1024 ** 2),
  },
});
const cardsWithMalformedIntegratedGpu = parseRocmSmiJson(MALFORMED_LOW_MEMORY_OUTPUT);
assert.equal(cardsWithMalformedIntegratedGpu.length, 1);
assert.equal(cardsWithMalformedIntegratedGpu[0].name, 'AMD Radeon RX 7900 XTX');

assert.throws(() => parseRocmSmiJson('not-json'), /Invalid ROCm SMI JSON/);
assert.throws(() => parseRocmSmiJson('null'), /Invalid ROCm SMI JSON/);
assert.throws(() => parseRocmSmiJson('[]'), /Invalid ROCm SMI JSON/);
assert.throws(
  () => parseRocmSmiJson(JSON.stringify({ card0: { 'Card Series': 'Missing memory' } })),
  /missing required fields/i,
);

console.log('ROCm GPU parser tests passed');
