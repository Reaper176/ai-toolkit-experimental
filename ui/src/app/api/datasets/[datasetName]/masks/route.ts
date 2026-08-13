import { getDatasetsRoot } from '@/server/settings';
import { assertDatasetMaskSourceUnambiguous, createDatasetMaskService } from '@/server/datasetMaskService';
import { MAX_MASK_PNG_BYTES, createDatasetMaskRouteHandlers } from '@/server/datasetMaskRouteHandlers';

async function compose(datasetName: string) {
  const datasetsRoot = await getDatasetsRoot();
  const masks = createDatasetMaskService({
    datasetsRoot,
    maxPngBytes: MAX_MASK_PNG_BYTES,
    maxSourceBytes: 512 * 1024 * 1024,
    maxSourceWidth: 32_768,
    maxSourceHeight: 32_768,
    maxSourcePixels: 250_000_000,
    maxMaskWidth: 16_384,
    maxMaskHeight: 16_384,
    maxMaskPixels: 100_000_000,
  });
  return createDatasetMaskRouteHandlers({
    masks,
    assertSourceUnambiguous: (dataset, source) => assertDatasetMaskSourceUnambiguous(
      datasetsRoot,
      dataset,
      source,
      { maxDepth: 32, maxEntries: 50_000, maxDirectories: 10_000, maxFiles: 10_000 },
    ),
  });
}

type Context = { params: Promise<{ datasetName: string }> };

async function dispatch(
  request: Request,
  context: Context,
  invoke: (handlers: Awaited<ReturnType<typeof compose>>, datasetName: string) => Promise<Response>,
): Promise<Response> {
  try {
    const { datasetName } = await context.params;
    return await invoke(await compose(datasetName), datasetName);
  } catch {
    return Response.json({ error: 'Dataset mask operation failed' }, { status: 500 });
  }
}

export async function GET(request: Request, context: Context) {
  return dispatch(request, context, (handlers, datasetName) => handlers.get(datasetName, request));
}

export async function PUT(request: Request, context: Context) {
  return dispatch(request, context, (handlers, datasetName) => handlers.put(datasetName, request));
}

export async function DELETE(request: Request, context: Context) {
  return dispatch(request, context, (handlers, datasetName) => handlers.delete(datasetName, request));
}
