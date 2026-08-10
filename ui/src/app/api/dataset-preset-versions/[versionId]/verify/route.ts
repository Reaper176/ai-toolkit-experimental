import { NextResponse } from 'next/server';
import { executeDefaultDatasetPresetRoute } from '@/server/datasetPresetRouteHandlers';

interface Context {
  params: Promise<{ versionId: string }>;
}

export async function POST(_request: Request, { params }: Context): Promise<Response> {
  const result = await executeDefaultDatasetPresetRoute(async handlers => handlers.verify((await params).versionId));
  return NextResponse.json(result.body, { status: result.status });
}
