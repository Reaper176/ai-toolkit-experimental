import prisma from '@/server/prisma';
import { getDataRoot } from '@/server/settings';
import { readFrozenPresetMask } from '@/server/datasetPresetFileService';

export async function GET(request: Request, { params }: { params: Promise<{ versionId: string }> }): Promise<Response> {
  try {
    const { versionId } = await params;
    const version = await prisma.datasetPresetVersion.findUnique({ where: { id: versionId }, select: { manifest_path: true } });
    if (!version) return Response.json({ error: 'Dataset preset version not found' }, { status: 404 });
    const path = new URL(request.url).searchParams.get('path');
    if (!path) return Response.json({ error: 'Frozen mask path is required' }, { status: 400 });
    const bytes = await readFrozenPresetMask(await getDataRoot(), version.manifest_path, path);
    return new Response(bytes, { headers: { 'content-type': 'image/png', 'cache-control': 'private, immutable' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('Invalid') || message.includes('escaped')) return Response.json({ error: 'Invalid frozen mask path' }, { status: 400 });
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return Response.json({ error: 'Frozen mask not found' }, { status: 404 });
    console.error('Frozen preset mask read failed:', error);
    return Response.json({ error: 'Frozen mask read failed' }, { status: 500 });
  }
}
