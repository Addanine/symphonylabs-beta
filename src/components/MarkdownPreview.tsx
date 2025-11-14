"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  content: string;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Style headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold tracking-wide mb-4 mt-6">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold tracking-wide mb-3 mt-5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold tracking-wide mb-2 mt-4">
              {children}
            </h3>
          ),
          // Style paragraphs
          p: ({ children }) => (
            <p className="text-sm tracking-wide leading-relaxed mb-4">
              {children}
            </p>
          ),
          // Style links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-black font-bold underline hover:no-underline transition-all"
            >
              {children}
            </a>
          ),
          // Style lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-2 mb-4 text-sm tracking-wide">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 text-sm tracking-wide">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm tracking-wide">{children}</li>
          ),
          // Style code blocks
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-gray-100 px-1.5 py-0.5 text-xs font-mono border border-black">
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-gray-100 p-3 text-xs font-mono border-2 border-black overflow-x-auto mb-4">
                {children}
              </code>
            );
          },
          // Style blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-black pl-4 my-4 italic">
              {children}
            </blockquote>
          ),
          // Style horizontal rules
          hr: () => <hr className="border-t-2 border-black my-6" />,
          // Style tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border-2 border-black">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-black text-white">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-black px-4 py-2 text-left text-xs font-bold tracking-wide">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-black px-4 py-2 text-sm tracking-wide">
              {children}
            </td>
          ),
          // Style strong/bold
          strong: ({ children }) => (
            <strong className="font-bold">{children}</strong>
          ),
          // Style emphasis/italic
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
