import type { ReactNode } from 'react';

import { TopBar } from '@/components/layout';

export default function TrainingGuideLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate h-full min-h-0">
      <TopBar className="md:hidden" />
      <div className="absolute inset-x-0 bottom-0 top-12 min-h-0 md:top-0">{children}</div>
    </div>
  );
}
