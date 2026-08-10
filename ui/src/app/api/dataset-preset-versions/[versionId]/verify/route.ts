import { NextResponse } from 'next/server';
import { createDefaultDatasetPresetRouteHandlers } from '@/server/datasetPresetRouteHandlers';

interface Context {
  params: Promise<{ versionId: string }>;
}

export async function POST(_request: Request, { params }: Context): Promise<Response> {
  const handlers = await createDefaultDatasetPresetRouteHandlers();
  const result = await handlers.verify((await params).versionId);
  return NextResponse.json(result.body, { status: result.status });
}
