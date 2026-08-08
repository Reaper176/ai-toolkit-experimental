import prisma from '@/server/prisma';
import { createTrainingPresetCollectionHandlers } from '@/server/trainingPresetRouteHandlers';
import { createTrainingPresetService } from '@/server/trainingPresetService';

const service = createTrainingPresetService(prisma.trainingPreset);
const handlers = createTrainingPresetCollectionHandlers(service);

export async function GET(): Promise<Response> {
  return handlers.GET();
}

export async function POST(request: Request): Promise<Response> {
  return handlers.POST(request);
}
