import type { TrainingPresetService } from './trainingPresetService';
import { mapTrainingPresetError, parsePresetRequestText, readPresetRequestText } from './trainingPresetService';

export type TrainingPresetServiceApi = TrainingPresetService;
export type TrainingPresetRouteLogger = (operation: string, error: unknown) => void;

export interface TrainingPresetDetailRouteContext {
  params: Promise<{ presetId: string }>;
}

const defaultLogger: TrainingPresetRouteLogger = (operation, error) => {
  console.error(`Failed to ${operation} training preset:`, error);
};

function errorResponse(error: unknown, operation: string, logError: TrainingPresetRouteLogger): Response {
  const mapped = mapTrainingPresetError(error);
  if (mapped.shouldLog) logError(operation, error);
  return Response.json(
    mapped.code === undefined ? { error: mapped.error } : { error: mapped.error, code: mapped.code },
    { status: mapped.status },
  );
}

export function createTrainingPresetCollectionHandlers(
  service: TrainingPresetServiceApi,
  logError: TrainingPresetRouteLogger = defaultLogger,
) {
  return {
    async GET(): Promise<Response> {
      try {
        return Response.json({ presets: await service.list() });
      } catch (error) {
        return errorResponse(error, 'list', logError);
      }
    },

    async POST(request: Request): Promise<Response> {
      try {
        const body = parsePresetRequestText(await readPresetRequestText(request), true);
        return Response.json(await service.create(body.name, body.job_config), { status: 201 });
      } catch (error) {
        return errorResponse(error, 'create', logError);
      }
    },
  };
}

export function createTrainingPresetDetailHandlers(
  service: TrainingPresetServiceApi,
  logError: TrainingPresetRouteLogger = defaultLogger,
) {
  return {
    async PUT(request: Request, context: TrainingPresetDetailRouteContext): Promise<Response> {
      try {
        const { presetId } = await context.params;
        const body = parsePresetRequestText(await readPresetRequestText(request));
        return Response.json(await service.update(presetId, body.job_config));
      } catch (error) {
        return errorResponse(error, 'update', logError);
      }
    },

    async DELETE(_request: Request, context: TrainingPresetDetailRouteContext): Promise<Response> {
      try {
        const { presetId } = await context.params;
        await service.remove(presetId);
        return Response.json({ ok: true });
      } catch (error) {
        return errorResponse(error, 'delete', logError);
      }
    },
  };
}
