import { NextResponse } from 'next/server';
import { executeDefaultDatasetPresetRoute } from '@/server/datasetPresetRouteHandlers';

interface Context {
  params: Promise<{ presetId: string }>;
}

export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const result = await executeDefaultDatasetPresetRoute(async handlers => handlers.versions((await params).presetId));
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request, { params }: Context): Promise<Response> {
  const result = await executeDefaultDatasetPresetRoute(async handlers =>
    handlers.publish((await params).presetId, request),
  );
  return NextResponse.json(result.body, { status: result.status });
}
