import fs from 'fs';
import { getDatasetsRoot, getTrainingFolder } from '@/server/settings';
import { createDatasetMaskService } from '@/server/datasetMaskService';
import { MAX_MASK_PNG_BYTES, createImageDeleteHandler } from '@/server/datasetMaskRouteHandlers';

const fileExists = (p: string) => fs.promises.access(p).then(() => true).catch(() => false);

export async function POST(request: Request) {
  try {
    const datasetsRoot = await getDatasetsRoot();
    return createImageDeleteHandler({
      masks: createDatasetMaskService({ datasetsRoot, maxPngBytes: MAX_MASK_PNG_BYTES }),
      resolveRoots: async () => ({ datasetsRoot, trainingRoot: await getTrainingFolder() }),
      exists: fileExists,
      unlink: path => fs.promises.unlink(path),
    })(request);
  } catch {
    return Response.json({ error: 'Failed to create dataset' }, { status: 500 });
  }
}
