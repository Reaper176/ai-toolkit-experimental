import { NextResponse } from 'next/server';
import { createDefaultDatasetPresetRouteHandlers } from '@/server/datasetPresetRouteHandlers';

interface Context {
  params: Promise<{ versionId: string }>;
}

export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const handlers = await createDefaultDatasetPresetRouteHandlers();
  const result = await handlers.version((await params).versionId);
  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(_request: Request, { params }: Context): Promise<Response> {
  const handlers = await createDefaultDatasetPresetRouteHandlers();
  const result = await handlers.removeVersion((await params).versionId);
  return NextResponse.json(result.body, { status: result.status });
}
