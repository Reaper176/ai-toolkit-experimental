import { GPUApiResponse } from '../types';

export function shouldRetryGpuInfo(response: Pick<GPUApiResponse, 'backend'>): boolean {
  return response.backend === null;
}
