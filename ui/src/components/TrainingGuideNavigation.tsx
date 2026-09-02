'use client';

import { useEffect, useRef, useState } from 'react';

import type { TrainingGuideHeading } from '@/helpers/trainingGuideMarkdown';
import type { TrainingGuideNavigationGroup, TrainingGuideNavigationItem } from '@/server/trainingGuideReader';

interface TrainingGuideChapterNavigationProps {
  groups: readonly TrainingGuideNavigationGroup[];
  currentPath: string;
}

interface TrainingGuidePageOutlineProps {
  headings: readonly TrainingGuideHeading[];
}

interface TrainingGuidePreviousNextProps {
  previous?: TrainingGuideNavigationItem;
  next?: TrainingGuideNavigationItem;
}

function itemHref(item: TrainingGuideNavigationItem): string {
  return item.slug === '' ? '/book' : `/book/${item.slug}`;
}

function ChapterGroups({
  groups,
  currentPath,
  onNavigate,
}: TrainingGuideChapterNavigationProps & { onNavigate?: () => void }) {
  return (
    <div className="space-y-6">
      {groups.map(group => (
        <section key={group.key}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{group.label}</h2>
          <ul className="space-y-1">
            {group.items.map(item => {
              const active = item.path === currentPath;
              return (
                <li key={item.path}>
                  <a
                    href={itemHref(item)}
                    aria-current={active ? 'page' : undefined}
                    onClick={onNavigate}
                    className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-blue-600/20 font-medium text-blue-300'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function TrainingGuideChapterNavigation({ groups, currentPath }: TrainingGuideChapterNavigationProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen || typeof document === 'undefined') return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target !== null &&
        !drawerRef.current?.contains(event.target as Node) &&
        !toggleRef.current?.contains(event.target as Node)
      ) {
        setDrawerOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawerOpen]);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        aria-controls="training-guide-chapter-drawer"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(open => !open)}
        className="relative z-[60] m-4 inline-flex items-center rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-700 lg:hidden"
      >
        Chapters
      </button>

      <nav
        aria-label="Training guide chapters"
        className="hidden overflow-y-auto border-r border-gray-800 bg-gray-950/40 px-4 py-8 lg:block"
      >
        <ChapterGroups groups={groups} currentPath={currentPath} />
      </nav>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden">
          <div
            ref={drawerRef}
            id="training-guide-chapter-drawer"
            data-training-guide-drawer
            className="h-full w-72 max-w-[85vw] overflow-y-auto border-r border-gray-700 bg-gray-950 px-4 pb-8 pt-20 shadow-xl"
          >
            <nav aria-label="Mobile training guide chapters">
              <ChapterGroups groups={groups} currentPath={currentPath} onNavigate={() => setDrawerOpen(false)} />
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function TrainingGuidePageOutline({ headings }: TrainingGuidePageOutlineProps) {
  const visibleHeadings = headings.filter(heading => heading.depth <= 4);
  return (
    <aside className="hidden overflow-y-auto border-l border-gray-800 px-4 py-8 lg:block">
      <nav aria-label="On this page">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">On this page</h2>
        <ul className="space-y-2">
          {visibleHeadings.map(heading => (
            <li key={heading.id} style={{ paddingLeft: `${Math.max(heading.depth - 1, 0) * 0.75}rem` }}>
              <a href={`#${heading.id}`} className="block text-sm leading-5 text-gray-400 hover:text-gray-100">
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export function TrainingGuidePreviousNext({ previous, next }: TrainingGuidePreviousNextProps) {
  return (
    <nav aria-label="Chapter pagination" className="mt-12 grid gap-4 border-t border-gray-700 pt-6 sm:grid-cols-2">
      {previous ? (
        <a
          href={itemHref(previous)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-left hover:border-gray-600 hover:bg-gray-800"
        >
          <span className="block text-xs uppercase tracking-wide text-gray-500">Previous</span>
          <span className="mt-1 block font-medium text-gray-100">{previous.label}</span>
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a
          href={itemHref(next)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-right hover:border-gray-600 hover:bg-gray-800"
        >
          <span className="block text-xs uppercase tracking-wide text-gray-500">Next</span>
          <span className="mt-1 block font-medium text-gray-100">{next.label}</span>
        </a>
      ) : null}
    </nav>
  );
}
