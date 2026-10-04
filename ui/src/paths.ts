import path from 'path';
const workingDirectory = process.cwd();
export const TOOLKIT_ROOT = path.basename(workingDirectory) === 'ui'
	? path.resolve(workingDirectory, '..')
	: workingDirectory;
export const defaultTrainFolder = path.join(TOOLKIT_ROOT, 'output');
export const defaultDatasetsFolder = path.join(TOOLKIT_ROOT, 'datasets');
export const defaultDataRoot = path.join(TOOLKIT_ROOT, 'data');
export const defaultModelsFolder = path.join(TOOLKIT_ROOT, 'models');
