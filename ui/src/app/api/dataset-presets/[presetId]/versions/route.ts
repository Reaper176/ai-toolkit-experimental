import { NextResponse } from 'next/server';
import { createDefaultDatasetPresetRouteHandlers } from '@/server/datasetPresetRouteHandlers';

interface Context {
  params: Promise<{ presetId: string }>;
}

export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const handlers = await createDefaultDatasetPresetRouteHandlers();
  const result = await handlers.versions((await params).presetId);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request, { params }: Context): Promise<Response> {
  const handlers = await createDefaultDatasetPresetRouteHandlers();
  const result = await handlers.publish((await params).presetId, request);
  return NextResponse.json(result.body, { status: result.status });
}
