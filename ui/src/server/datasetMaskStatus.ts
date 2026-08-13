import { resolveLiveMaskDirectory } from './datasetMaskService';

interface DatasetMaskStatusDependencies {
  datasetsRoot(): Promise<string>;
  resolveMasks?: typeof resolveLiveMaskDirectory;
}

export function createDatasetMaskStatusHandler(deps: DatasetMaskStatusDependencies) {
  return async function getMaskStatus(request: Request): Promise<Response> {
    const folderPath = new URL(request.url).searchParams.get('folder_path');
    if (!folderPath) return Response.json({ error: 'A live dataset path is required' }, { status: 400 });
    try {
      const maskPath = await (deps.resolveMasks ?? resolveLiveMaskDirectory)(folderPath, {
        datasetsRoot: await deps.datasetsRoot(),
      });
      return Response.json({ has_masks: maskPath !== null });
    } catch {
      return Response.json({ error: 'Invalid live dataset path' }, { status: 400 });
    }
  };
}
