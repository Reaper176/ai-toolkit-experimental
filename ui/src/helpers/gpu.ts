import { GPUApiResponse, GpuFan } from '../types';

export function formatGpuFan(fan: GpuFan): string {
  const unit = fan.unit ?? '%';
  return unit === '%' ? `${fan.speed}%` : `${fan.speed} ${unit}`;
}

export function shouldRetryGpuInfo(response: Pick<GPUApiResponse, 'backend'>): boolean {
  return response.backend === null;
}
