import { BookOpen } from 'lucide-react';

export const TRAINING_GUIDE_URL =
  'https://github.com/Reaper176/ai-toolkit-experimental/blob/main/docs/book/README.md';

const TrainingGuideLink = () => (
  <a
    href={TRAINING_GUIDE_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Open LoRA Training Guide"
    className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
  >
    <BookOpen className="w-5 h-5 mr-3" />
    Training Guide
  </a>
);

export default TrainingGuideLink;
