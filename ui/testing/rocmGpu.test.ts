import assert from 'node:assert/strict';
import {
  isRocmMonitorSampleDue,
  parseRocmSmiJson,
  queryRocmGpuStats,
  ROCM_MONITOR_SAMPLE_MS,
  ROCM_SMI_ARGS,
} from '../src/server/rocmGpu';

assert.ok(ROCM_SMI_ARGS.includes('--showmetrics'), 'ROCm query requests clock and fan metrics');
assert.equal(isRocmMonitorSampleDue(0, 100), true, 'first monitor sample is immediate');
assert.equal(isRocmMonitorSampleDue(100, 100 + ROCM_MONITOR_SAMPLE_MS - 1), false, 'samples are throttled');
assert.equal(isRocmMonitorSampleDue(100, 100 + ROCM_MONITOR_SAMPLE_MS), true, 'sample runs when interval elapses');

const TWO_CARD_OUTPUT = JSON.stringify({
  card0: {
    'Temperature (Sensor edge) (C)': '53.0',
    'Temperature (Sensor junction) (C)': '62.0',
    'Average Graphics Package Power (W)': '92.0',
    'GPU use (%)': '27',
    'VRAM Total Memory (B)': '25753026560',
    'VRAM Total Used Memory (B)': '5476655104',
    'Card Series': 'AMD Radeon RX 7900 XTX',
    'current_gfxclk (MHz)': '1295',
    'current_uclk (MHz)': '1249',
    'current_fan_speed (rpm)': '875',
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
  clocks: { graphics: 1295, memory: 1249 },
  fan: { speed: 875, unit: 'RPM' },
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
assert.deepEqual(cardZero.clocks, { graphics: 0, memory: 0 });
assert.deepEqual(cardZero.fan, { speed: 0, unit: 'RPM' });
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

async function testRocmQuery() {
  let invocation: { executable: string; args: string[]; options: Record<string, unknown> } | null = null;
  const queried = await queryRocmGpuStats(async (executable, args, options) => {
    invocation = { executable, args, options };
    return { stdout: TWO_CARD_OUTPUT };
  });

  assert.equal(invocation?.executable, 'rocm-smi');
  assert.deepEqual(invocation?.args, ROCM_SMI_ARGS);
  assert.equal(invocation?.options.encoding, 'utf-8');
  assert.equal(queried.length, 1);
  assert.equal(queried[0].name, 'AMD Radeon RX 7900 XTX');
}

testRocmQuery()
  .then(() => console.log('ROCm GPU parser and query tests passed'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
