import { NextResponse } from 'next/server';
import { executeDefaultDatasetPresetRoute } from '@/server/datasetPresetRouteHandlers';

export async function GET(): Promise<Response> {
  const result = await executeDefaultDatasetPresetRoute(handlers => handlers.list());
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request): Promise<Response> {
  const result = await executeDefaultDatasetPresetRoute(handlers => handlers.create(request));
  return NextResponse.json(result.body, { status: result.status });
}
