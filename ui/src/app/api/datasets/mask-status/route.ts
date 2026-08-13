import { getDatasetsRoot } from '@/server/settings';
import { createDatasetMaskStatusHandler } from '@/server/datasetMaskStatus';

const getMaskStatus = createDatasetMaskStatusHandler({ datasetsRoot: getDatasetsRoot });

export async function GET(request: Request) {
  return getMaskStatus(request);
}
