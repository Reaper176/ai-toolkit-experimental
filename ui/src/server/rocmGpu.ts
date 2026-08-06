import type { GpuInfo } from '../types';

const MIN_TRAINABLE_VRAM_BYTES = 2 * 1024 ** 3;

type RocmCard = Record<string, unknown>;

function numberValue(card: RocmCard, key: string, fallback = 0): number {
  const value = Number.parseFloat(String(card[key] ?? ''));
  return Number.isFinite(value) ? value : fallback;
}

export function parseRocmSmiJson(output: string): GpuInfo[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error('Invalid ROCm SMI JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid ROCm SMI JSON');
  }

  return Object.entries(parsed)
    .map(([cardKey, value]) => {
      const match = /^card(\d+)$/.exec(cardKey);
      if (!match || !value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`ROCm card ${cardKey} is missing required fields`);
      }

      const card = value as RocmCard;
      const name = typeof card['Card Series'] === 'string' ? card['Card Series'].trim() : '';
      const totalBytes = numberValue(card, 'VRAM Total Memory (B)', Number.NaN);
      const usedBytes = numberValue(card, 'VRAM Total Used Memory (B)', Number.NaN);
      if (!name || !Number.isFinite(totalBytes) || !Number.isFinite(usedBytes)) {
        throw new Error(`ROCm card ${cardKey} is missing required fields`);
      }

      const total = Math.round(totalBytes / 1024 ** 2);
      const used = Math.round(usedBytes / 1024 ** 2);
      const powerDraw = numberValue(
        card,
        'Average Graphics Package Power (W)',
        numberValue(card, 'Current Socket Graphics Package Power (W)'),
      );

      return {
        totalBytes,
        gpu: {
          index: Number.parseInt(match[1], 10),
          name,
          driverVersion: 'ROCm',
          temperature: numberValue(card, 'Temperature (Sensor edge) (C)'),
          utilization: {
            gpu: numberValue(card, 'GPU use (%)'),
            memory: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0,
          },
          memory: {
            total,
            free: Math.max(0, total - used),
            used,
          },
          power: { draw: powerDraw, limit: 0 },
          clocks: { graphics: 0, memory: 0 },
          fan: { speed: 0 },
        } satisfies GpuInfo,
      };
    })
    .filter(({ totalBytes }) => totalBytes >= MIN_TRAINABLE_VRAM_BYTES)
    .map(({ gpu }) => gpu)
    .sort((a, b) => a.index - b.index);
}
