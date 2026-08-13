import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { getDatasetsRoot } from '@/server/settings';
import { createDatasetMaskService } from '@/server/datasetMaskService';
import { MAX_MASK_PNG_BYTES, createDatasetMaskRouteHandlers } from '@/server/datasetMaskRouteHandlers';

async function compose(datasetName: string) {
  const datasetsRoot = await getDatasetsRoot();
  const masks = createDatasetMaskService({ datasetsRoot, maxPngBytes: MAX_MASK_PNG_BYTES });
  const listSources = async (dataset: string): Promise<string[]> => {
    const datasetRoot = join(datasetsRoot, dataset);
    const found: string[] = [];
    async function visit(directory: string): Promise<void> {
      const entries = await readdir(directory, { withFileTypes: true });
      await Promise.all(entries.map(async entry => {
        if (entry.name.startsWith('.')) return;
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await visit(path);
        else if (entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name)) found.push(relative(datasetRoot, path).split(sep).join('/'));
      }));
    }
    await visit(datasetRoot);
    return found;
  };
  return createDatasetMaskRouteHandlers({ masks, listSources });
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
