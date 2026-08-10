import { NextResponse } from 'next/server';
import { executeDefaultDatasetPresetRoute } from '@/server/datasetPresetRouteHandlers';

interface Context {
  params: Promise<{ versionId: string }>;
}

export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const result = await executeDefaultDatasetPresetRoute(async handlers => handlers.version((await params).versionId));
  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(_request: Request, { params }: Context): Promise<Response> {
  const result = await executeDefaultDatasetPresetRoute(async handlers =>
    handlers.removeVersion((await params).versionId),
  );
  return NextResponse.json(result.body, { status: result.status });
}
