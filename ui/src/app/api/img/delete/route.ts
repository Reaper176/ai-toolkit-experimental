import { getDatasetsRoot, getTrainingFolder } from '@/server/settings';
import { createDatasetMaskService } from '@/server/datasetMaskService';
import { MAX_MASK_PNG_BYTES, createImageDeleteHandler } from '@/server/datasetMaskRouteHandlers';

export async function POST(request: Request) {
  try {
    const datasetsRoot = await getDatasetsRoot();
    return createImageDeleteHandler({
      masks: createDatasetMaskService({ datasetsRoot, maxPngBytes: MAX_MASK_PNG_BYTES }),
      resolveRoots: async () => ({ datasetsRoot, trainingRoot: await getTrainingFolder() }),
    })(request);
  } catch {
    return Response.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
