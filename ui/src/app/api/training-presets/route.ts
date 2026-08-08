import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import {
  createTrainingPresetService,
  mapTrainingPresetError,
  parsePresetRequestText,
} from '@/server/trainingPresetService';

const service = createTrainingPresetService(prisma.trainingPreset);

function errorResponse(error: unknown, operation: string): NextResponse {
  const mapped = mapTrainingPresetError(error);
  if (mapped.shouldLog) console.error(`Failed to ${operation} training preset:`, error);
  return NextResponse.json({ error: mapped.error }, { status: mapped.status });
}

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ presets: await service.list() });
  } catch (error) {
    return errorResponse(error, 'list');
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = parsePresetRequestText(await request.text());
    return NextResponse.json(await service.create(body.name, body.job_config), { status: 201 });
  } catch (error) {
    return errorResponse(error, 'create');
  }
}
