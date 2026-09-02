import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import TrainingGuideMarkdown from '@/components/TrainingGuideMarkdown';
import {
  TrainingGuideChapterNavigation,
  TrainingGuidePageOutline,
  TrainingGuidePreviousNext,
} from '@/components/TrainingGuideNavigation';
import { loadTrainingGuidePage, trainingGuideRepositoryRoot } from '@/server/trainingGuideReader';

interface TrainingGuideRouteProps {
  params: Promise<{ slug?: string[] }>;
}

const loadTrainingGuideRoutePage = cache((repositoryRoot: string, ...slug: string[]) =>
  loadTrainingGuidePage(repositoryRoot, slug),
);

async function loadTrainingGuideRouteResult(params: TrainingGuideRouteProps['params']) {
  const slug = (await params).slug ?? [];
  return loadTrainingGuideRoutePage(trainingGuideRepositoryRoot(), ...slug);
}

function TrainingGuideUnavailable() {
  return (
    <section className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-white">Training Guide unavailable</h1>
      <p className="mt-3 leading-7 text-gray-300">
        The offline training guide files are not available. Check the local installation and try again.
      </p>
    </section>
  );
}

export async function generateMetadata({ params }: TrainingGuideRouteProps): Promise<Metadata> {
  const result = await loadTrainingGuideRouteResult(params);
  if (result.kind === 'found') return { title: result.page.title };
  return { title: 'Training Guide' };
}

export default async function TrainingGuidePage({ params }: TrainingGuideRouteProps) {
  const result = await loadTrainingGuideRouteResult(params);
  if (result.kind === 'not-found') notFound();
  if (result.kind === 'unavailable') return <TrainingGuideUnavailable />;

  const { page } = result;
  return (
    <div className="grid h-full min-w-0 grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)_14rem]">
      <TrainingGuideChapterNavigation groups={page.groups} currentPath={page.path} />
      <div className="min-w-0 overflow-y-auto px-4 py-8 sm:px-8">
        <article className="mx-auto max-w-4xl">
          <TrainingGuideMarkdown markdown={page.markdown} currentPath={page.path} allowedPaths={page.allowedPaths} />
          <TrainingGuidePreviousNext previous={page.previous} next={page.next} />
        </article>
      </div>
      <TrainingGuidePageOutline headings={page.headings} />
    </div>
  );
}
