import { NextResponse } from 'next/server';
import { executeDefaultDatasetPresetRoute } from '@/server/datasetPresetRouteHandlers';

interface Context {
  params: Promise<{ presetId: string }>;
}

export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const result = await executeDefaultDatasetPresetRoute(async handlers => handlers.detail((await params).presetId));
  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(request: Request, { params }: Context): Promise<Response> {
  const result = await executeDefaultDatasetPresetRoute(async handlers =>
    handlers.update((await params).presetId, request),
  );
  return NextResponse.json(result.body, { status: result.status });
}
