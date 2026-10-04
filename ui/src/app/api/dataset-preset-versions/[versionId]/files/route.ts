import { serveFrozenVersionFile } from '@/server/datasetPresetFileRouteHandler';

export async function GET(request: Request, { params }: { params: Promise<{ versionId: string }> }): Promise<Response> {
  return serveFrozenVersionFile(request, (await params).versionId);
}
