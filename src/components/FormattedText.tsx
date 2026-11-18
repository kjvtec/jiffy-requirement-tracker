'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Safely parses plain text into React elements with support for:
 * - Auto-hyperlinks (https://..., http://...)
 * - Markdown links: [title](url)
 * - Bold: **text**
 * - Italic: *text*
 * - Underline: <u>text</u>
 * - Strikethrough: ~~text~~
 * - Inline code: `code`
 */
function renderInline(text: string): React.ReactNode[] {
  // Regex pattern matching:
  // 1. Markdown link: [title](url)
  // 2. Raw URL: https?://\S+
  // 3. Bold: \*\*([^*]+)\*\*
  // 4. Italic: \*([^*]+)\*
  // 5. Underline: <u>([\s\S]*?)<\/u>
  // 6. Strikethrough: ~~([^~]+)~~
  // 7. Inline code: `([^`]+)`
  const tokenRegex =
    /(\[[^\]]+\]\(https?:\/\/[^\s)]+\))|(https?:\/\/[^\s<]+)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(<u>[\s\S]*?<\/u>)|(~~[^~]+~~)|(`[^`]+`)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith('[') && token.includes('](')) {
      // Markdown link [title](url)
      const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(token);
      if (linkMatch) {
        const [, label, url] = linkMatch;
        nodes.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0086FF] hover:text-[#044492] underline font-medium inline-flex items-center gap-0.5 break-all hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
          >
            <span>{label}</span>
            <ExternalLink className="w-3 h-3 inline shrink-0" aria-hidden />
          </a>
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      // Raw URL auto-hyperlink
      // Trim any trailing punctuation like . , )
      let cleanUrl = token;
      let trailing = '';
      const trailMatch = /[.,;:)!?]+$/.exec(cleanUrl);
      if (trailMatch) {
        trailing = trailMatch[0];
        cleanUrl = cleanUrl.slice(0, cleanUrl.length - trailing.length);
      }
      nodes.push(
        <a
          key={match.index}
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0086FF] hover:text-[#044492] underline font-medium inline-flex items-center gap-0.5 break-all hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
        >
          <span>{cleanUrl}</span>
          <ExternalLink className="w-3 h-3 inline shrink-0" aria-hidden />
        </a>
      );
      if (trailing) nodes.push(trailing);
    } else if (token.startsWith('**') && token.endsWith('**')) {
      // Bold
      nodes.push(
        <strong key={match.index} className="font-bold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      // Italic
      nodes.push(
        <em key={match.index} className="italic text-slate-800">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('<u>') && token.endsWith('</u>')) {
      // Underline
      nodes.push(
        <span key={match.index} className="underline text-slate-900">
          {token.slice(3, -4)}
        </span>
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      // Strikethrough
      nodes.push(
        <del key={match.index} className="line-through text-slate-400">
          {token.slice(2, -2)}
        </del>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      // Inline code
      nodes.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-slate-100 text-[#0C2553] border border-slate-200 rounded"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export default function FormattedText({ text, className = '' }: FormattedTextProps) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className={`space-y-1 text-sm leading-relaxed text-slate-800 ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Blockquote (> ...)
        if (trimmed.startsWith('>')) {
          const quoteContent = trimmed.replace(/^>\s*/, '');
          return (
            <blockquote
              key={idx}
              className="border-l-4 border-amber-400 bg-amber-50/60 text-slate-700 pl-3 py-1 my-1 rounded-r-md italic text-xs sm:text-sm"
            >
              {renderInline(quoteContent)}
            </blockquote>
          );
        }

        // Bullet list (- item, * item, • item)
        if (/^[-*•]\s+/.test(trimmed)) {
          const itemContent = trimmed.replace(/^[-*•]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="text-[#0086FF] font-bold text-base leading-none select-none mt-0.5">•</span>
              <div className="flex-1 min-w-0">{renderInline(itemContent)}</div>
            </div>
          );
        }

        // Numbered list (1. item, 2. item, etc.)
        const numMatch = /^(\d+)\.\s+(.*)$/.exec(trimmed);
        if (numMatch) {
          const [, num, numContent] = numMatch;
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="font-mono text-xs font-bold text-slate-500 min-w-[18px] text-right select-none mt-0.5">
                {num}.
              </span>
              <div className="flex-1 min-w-0">{renderInline(numContent)}</div>
            </div>
          );
        }

        // Normal paragraph line
        return (
          <div key={idx} className="break-words">
            {renderInline(line)}
          </div>
        );
      })}
    </div>
  );
}
