import prisma from '@/server/prisma';
import {
  createTrainingPresetDetailHandlers,
  type TrainingPresetDetailRouteContext,
} from '@/server/trainingPresetRouteHandlers';
import { createTrainingPresetService } from '@/server/trainingPresetService';

const service = createTrainingPresetService(prisma.trainingPreset);
const handlers = createTrainingPresetDetailHandlers(service);

export async function PUT(request: Request, context: TrainingPresetDetailRouteContext): Promise<Response> {
  return handlers.PUT(request, context);
}

export async function DELETE(request: Request, context: TrainingPresetDetailRouteContext): Promise<Response> {
  return handlers.DELETE(request, context);
}
