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

  const gpus: GpuInfo[] = [];
  let hasMalformedCard = false;

  for (const [cardKey, value] of Object.entries(parsed)) {
    const match = /^card(\d+)$/.exec(cardKey);
    if (!match || !value || typeof value !== 'object' || Array.isArray(value)) {
      hasMalformedCard = true;
      continue;
    }

    const card = value as RocmCard;
    const totalBytes = numberValue(card, 'VRAM Total Memory (B)', Number.NaN);
    if (!Number.isFinite(totalBytes)) {
      hasMalformedCard = true;
      continue;
    }
    if (totalBytes < MIN_TRAINABLE_VRAM_BYTES) {
      continue;
    }

    const name = typeof card['Card Series'] === 'string' ? card['Card Series'].trim() : '';
    const usedBytes = numberValue(card, 'VRAM Total Used Memory (B)', Number.NaN);
    if (!name || !Number.isFinite(usedBytes)) {
      hasMalformedCard = true;
      continue;
    }

    const total = Math.round(totalBytes / 1024 ** 2);
    const used = Math.round(usedBytes / 1024 ** 2);
    const powerDraw = numberValue(
      card,
      'Average Graphics Package Power (W)',
      numberValue(card, 'Current Socket Graphics Package Power (W)'),
    );

    gpus.push({
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
    });
  }

  if (gpus.length === 0 && hasMalformedCard) {
    throw new Error('ROCm card data is missing required fields');
  }

  return gpus.sort((a, b) => a.index - b.index);
}
