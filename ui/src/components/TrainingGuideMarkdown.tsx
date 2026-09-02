import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { createTrainingGuideHeadingSlugger, rewriteTrainingGuideHref } from '@/helpers/trainingGuideMarkdown';

interface TrainingGuideMarkdownProps {
  markdown: string;
  currentPath: string;
  allowedPaths: readonly string[];
}

function headingText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(headingText).join('');
  if (isValidElement<{ children?: ReactNode }>(children)) return headingText(children.props.children);
  return '';
}

interface MarkdownNodePosition {
  position?: {
    start: { offset?: number };
    end: { offset?: number };
  };
}

function headingTextFromSource(markdown: string, node: MarkdownNodePosition | undefined, children: ReactNode): string {
  const startOffset = node?.position?.start.offset;
  const endOffset = node?.position?.end.offset;
  if (startOffset !== undefined && endOffset !== undefined) {
    const sourceHeading = markdown.slice(startOffset, endOffset);
    const match = sourceHeading.match(/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/u);
    if (match !== null) return match[2].replace(/[ \t]+#+[ \t]*$/u, '').trim();
  }
  return headingText(children);
}

export default function TrainingGuideMarkdown({ markdown, currentPath, allowedPaths }: TrainingGuideMarkdownProps) {
  const slugHeading = createTrainingGuideHeadingSlugger();
  const allowedPathSet = new Set(allowedPaths);
  const components: Components = {
    h1: ({ node, children, ...props }) => (
      <h1
        {...props}
        id={slugHeading(headingTextFromSource(markdown, node, children))}
        className="mb-6 scroll-mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl"
      >
        {children}
      </h1>
    ),
    h2: ({ node, children, ...props }) => (
      <h2
        {...props}
        id={slugHeading(headingTextFromSource(markdown, node, children))}
        className="mb-4 mt-10 scroll-mt-6 border-b border-gray-700 pb-2 text-2xl font-semibold text-white"
      >
        {children}
      </h2>
    ),
    h3: ({ node, children, ...props }) => (
      <h3
        {...props}
        id={slugHeading(headingTextFromSource(markdown, node, children))}
        className="mb-3 mt-8 scroll-mt-6 text-xl font-semibold text-gray-100"
      >
        {children}
      </h3>
    ),
    h4: ({ node, children, ...props }) => (
      <h4
        {...props}
        id={slugHeading(headingTextFromSource(markdown, node, children))}
        className="mb-2 mt-6 scroll-mt-6 text-lg font-semibold text-gray-100"
      >
        {children}
      </h4>
    ),
    h5: ({ node, children, ...props }) => (
      <h5
        {...props}
        id={slugHeading(headingTextFromSource(markdown, node, children))}
        className="mb-2 mt-5 scroll-mt-6 font-semibold text-gray-100"
      >
        {children}
      </h5>
    ),
    h6: ({ node, children, ...props }) => (
      <h6
        {...props}
        id={slugHeading(headingTextFromSource(markdown, node, children))}
        className="mb-2 mt-5 scroll-mt-6 text-sm font-semibold uppercase tracking-wide text-gray-200"
      >
        {children}
      </h6>
    ),
    p: ({ node: _node, children, ...props }) => (
      <p {...props} className="my-4 leading-7 text-gray-200">
        {children}
      </p>
    ),
    a: ({ node: _node, children, href = '', ...props }) => {
      const rewrittenHref = rewriteTrainingGuideHref(currentPath, href, allowedPathSet);
      const external = rewrittenHref !== undefined && /^https?:\/\//iu.test(rewrittenHref);
      return (
        <a
          {...props}
          href={rewrittenHref}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className="font-medium text-blue-400 underline decoration-blue-400/50 underline-offset-2 hover:text-blue-300"
        >
          {children}
        </a>
      );
    },
    ul: ({ node: _node, children, ...props }) => (
      <ul {...props} className="my-4 list-disc space-y-2 pl-6 text-gray-200">
        {children}
      </ul>
    ),
    ol: ({ node: _node, children, ...props }) => (
      <ol {...props} className="my-4 list-decimal space-y-2 pl-6 text-gray-200">
        {children}
      </ol>
    ),
    blockquote: ({ node: _node, children, ...props }) => (
      <blockquote {...props} className="my-6 border-l-4 border-gray-600 pl-4 text-gray-300">
        {children}
      </blockquote>
    ),
    code: ({ node: _node, children, className, ...props }) => (
      <code
        {...props}
        className={`${className ?? ''} rounded bg-gray-900 px-1.5 py-0.5 font-mono text-sm text-gray-100`}
      >
        {children}
      </code>
    ),
    pre: ({ node: _node, children, ...props }) => (
      <div
        className="my-6 overflow-x-auto rounded-lg border border-gray-700 bg-gray-950"
        tabIndex={0}
        aria-label="Scrollable code example"
      >
        <pre {...props} className="min-w-max p-4 text-sm leading-6 text-gray-100">
          {children}
        </pre>
      </div>
    ),
    table: ({ node: _node, children, ...props }) => (
      <div
        className="my-6 overflow-x-auto rounded-lg border border-gray-700"
        tabIndex={0}
        aria-label="Scrollable table"
      >
        <table {...props} className="min-w-full divide-y divide-gray-700 text-left text-sm text-gray-200">
          {children}
        </table>
      </div>
    ),
    th: ({ node: _node, children, ...props }) => (
      <th {...props} className="bg-gray-800 px-4 py-3 font-semibold text-gray-100">
        {children}
      </th>
    ),
    td: ({ node: _node, children, ...props }) => (
      <td {...props} className="border-t border-gray-700 px-4 py-3 align-top">
        {children}
      </td>
    ),
    hr: ({ node: _node, ...props }) => <hr {...props} className="my-10 border-gray-700" />,
  };

  return (
    <div className="text-gray-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
