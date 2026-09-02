'use client';

import React from 'react';
import type { BuiltInTrainingPresetRecord } from '../helpers/trainingPresets';
import { trainingPresetRecipeUrl, validateBuiltInTrainingPresetRecord } from '../helpers/builtInTrainingPresets';

export interface TrainingPresetDetailsProps {
  preset: BuiltInTrainingPresetRecord;
}

const EVIDENCE_LABELS: Record<BuiltInTrainingPresetRecord['evidence'], string> = {
  'configuration-validated': 'Configuration validated',
  'launch-tested': 'Launch tested',
  'training-tested': 'Training tested',
};

export function TrainingPresetDetails({ preset }: TrainingPresetDetailsProps) {
  const accepted = validateBuiltInTrainingPresetRecord(preset);
  return (
    <aside className="w-full rounded border border-gray-700 bg-gray-900 p-3 text-sm text-gray-200">
      <h3 className="font-medium text-gray-100">{accepted.name}</h3>
      <p data-preset-summary className="mt-1 text-gray-300">{accepted.summary}</p>
      <p className="mt-2 text-xs text-gray-400">
        Evidence: <span data-preset-evidence>{EVIDENCE_LABELS[accepted.evidence]}</span>
      </p>
      <section className="mt-2">
        <h4 className="font-medium">Prerequisites</h4>
        <ul data-preset-prerequisites className="list-disc pl-5">
          {accepted.prerequisites.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </section>
      <section className="mt-2">
        <h4 className="font-medium">Warnings</h4>
        <ul data-preset-warnings className="list-disc pl-5">
          {accepted.warnings.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </section>
      <a
        className="mt-2 inline-block underline"
        href={trainingPresetRecipeUrl(accepted.recipe_path)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open recipe
      </a>
    </aside>
  );
}

export default TrainingPresetDetails;
