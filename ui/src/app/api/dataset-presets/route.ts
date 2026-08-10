import { NextResponse } from 'next/server';
import { createDefaultDatasetPresetRouteHandlers } from '@/server/datasetPresetRouteHandlers';

export async function GET(): Promise<Response> {
  const handlers = await createDefaultDatasetPresetRouteHandlers();
  const result = await handlers.list();
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request): Promise<Response> {
  const handlers = await createDefaultDatasetPresetRouteHandlers();
  const result = await handlers.create(request);
  return NextResponse.json(result.body, { status: result.status });
}
