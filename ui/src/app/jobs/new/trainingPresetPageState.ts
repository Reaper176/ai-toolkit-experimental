export interface TrainingPresetPageState {
  sourceKey: string;
  presetReady: boolean;
  readyBeforeImport: boolean;
  importing: boolean;
  generation: number;
  loadError: string | null;
}

export type TrainingPresetPageEvent =
  | { type: 'source-changed'; sourceKey: string }
  | { type: 'external-load-succeeded'; sourceKey: string }
  | { type: 'external-load-failed'; sourceKey: string; error: string }
  | { type: 'new-job-initialized'; sourceKey: string }
  | { type: 'import-started' }
  | { type: 'import-succeeded' }
  | { type: 'import-failed' }
  | { type: 'preset-applied' };

export function createTrainingPresetPageState(sourceKey: string): TrainingPresetPageState {
  return {
    sourceKey,
    presetReady: false,
    readyBeforeImport: false,
    importing: false,
    generation: 0,
    loadError: null,
  };
}

export function trainingPresetPageReducer(
  state: TrainingPresetPageState,
  event: TrainingPresetPageEvent,
): TrainingPresetPageState {
  switch (event.type) {
    case 'source-changed':
      if (event.sourceKey === state.sourceKey) return state;
      return createTrainingPresetPageState(event.sourceKey);
    case 'external-load-succeeded':
      if (event.sourceKey !== state.sourceKey) return state;
      return { ...state, presetReady: true, generation: state.generation + 1, loadError: null };
    case 'external-load-failed':
      if (event.sourceKey !== state.sourceKey) return state;
      return { ...state, presetReady: false, loadError: event.error };
    case 'new-job-initialized':
      if (event.sourceKey !== state.sourceKey || state.sourceKey !== 'new') return state;
      return { ...state, presetReady: true, loadError: null };
    case 'import-started':
      if (!state.presetReady && !state.importing) return state;
      return {
        ...state,
        readyBeforeImport: state.importing ? state.readyBeforeImport : state.presetReady,
        presetReady: false,
        importing: true,
      };
    case 'import-succeeded':
      return {
        ...state,
        presetReady: true,
        readyBeforeImport: true,
        importing: false,
        generation: state.generation + 1,
        loadError: null,
      };
    case 'import-failed':
      return {
        ...state,
        presetReady: state.readyBeforeImport,
        importing: false,
      };
    case 'preset-applied':
      return state;
  }
}
