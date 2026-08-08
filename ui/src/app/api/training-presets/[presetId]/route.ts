import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import {
  createTrainingPresetService,
  mapTrainingPresetError,
  parsePresetRequestText,
} from '@/server/trainingPresetService';

const service = createTrainingPresetService(prisma.trainingPreset);

interface RouteContext {
  params: Promise<{ presetId: string }>;
}

function errorResponse(error: unknown, operation: string): NextResponse {
  const mapped = mapTrainingPresetError(error);
  if (mapped.shouldLog) console.error(`Failed to ${operation} training preset:`, error);
  return NextResponse.json({ error: mapped.error }, { status: mapped.status });
}

export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { presetId } = await context.params;
    const body = parsePresetRequestText(await request.text());
    return NextResponse.json(await service.update(presetId, body.job_config));
  } catch (error) {
    return errorResponse(error, 'update');
  }
}

export async function DELETE(_request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { presetId } = await context.params;
    await service.remove(presetId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, 'delete');
  }
}
