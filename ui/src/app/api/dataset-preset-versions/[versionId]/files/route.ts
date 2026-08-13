import prisma from '@/server/prisma';
import { getDataRoot } from '@/server/settings';
import { readFrozenPresetMask } from '@/server/datasetPresetFileService';

interface FrozenFileDependencies { findVersion(id: string): Promise<{ manifest_path: string; manifest_sha256: string } | null>; dataRoot(): Promise<string>; read(root: string, manifest: string, path: string, checksum?: string): Promise<Buffer> }
export async function serveFrozenVersionFile(request: Request, versionId: string, deps: FrozenFileDependencies = {
  findVersion: (id: string) => prisma.datasetPresetVersion.findUnique({ where: { id }, select: { manifest_path: true, manifest_sha256: true } }),
  dataRoot: getDataRoot,
  read: readFrozenPresetMask,
}): Promise<Response> {
  try {
    const version = await deps.findVersion(versionId);
    if (!version) return Response.json({ error: 'Dataset preset version not found' }, { status: 404 });
    const path = new URL(request.url).searchParams.get('path');
    if (!path) return Response.json({ error: 'Frozen mask path is required' }, { status: 400 });
    const bytes = await deps.read(await deps.dataRoot(), version.manifest_path, path, version.manifest_sha256);
    const type = /\.jpe?g$/i.test(path) ? 'image/jpeg' : /\.webp$/i.test(path) ? 'image/webp' : /\.gif$/i.test(path) ? 'image/gif' : 'image/png';
    return new Response(bytes, { headers: { 'content-type': type, 'cache-control': 'private, immutable' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Snapshot integrity mismatch') return Response.json({ error: 'Frozen snapshot integrity verification failed' }, { status: 409 });
    if (message.startsWith('Invalid') || message.includes('escaped')) return Response.json({ error: 'Invalid frozen mask path' }, { status: 400 });
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return Response.json({ error: 'Frozen mask not found' }, { status: 404 });
    console.error('Frozen preset mask read failed:', error);
    return Response.json({ error: 'Frozen mask read failed' }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ versionId: string }> }): Promise<Response> {
  return serveFrozenVersionFile(request, (await params).versionId);
}
