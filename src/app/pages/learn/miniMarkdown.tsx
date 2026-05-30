// Dependency-free, minimal Markdown-ish renderer.
// Supports: # h1..### h3, **bold**, *italic*, `inline code`, ``` fenced code ```,
// - bullet lists, numbered lists, [links](url), and paragraphs.
// This is intentionally NOT a full CommonMark impl; it covers what tutors
// realistically need for Reading / Cheatsheet / Exercise prompts.

import { type JSX } from 'react';

interface MiniMarkdownProps {
  source: string;
  className?: string;
}

function renderInline(text: string, keyPrefix: string): (JSX.Element | string)[] {
  // Order: code, bold, italic, link.
  const tokens: (JSX.Element | string)[] = [];
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;

  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let idx = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIndex) tokens.push(text.slice(lastIndex, m.index));
    const t = m[0];
    const k = `${keyPrefix}-i-${idx++}`;
    if (t.startsWith('`')) {
      tokens.push(
        <code key={k} className="px-1.5 py-0.5 rounded bg-slate-700/70 text-pink-200 text-[0.92em]">
          {t.slice(1, -1)}
        </code>
      );
    } else if (t.startsWith('**')) {
      tokens.push(
        <strong key={k} className="font-semibold text-white">
          {t.slice(2, -2)}
        </strong>
      );
    } else if (t.startsWith('*')) {
      tokens.push(
        <em key={k} className="italic">
          {t.slice(1, -1)}
        </em>
      );
    } else if (t.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t);
      if (linkMatch) {
        tokens.push(
          <a
            key={k}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-purple-300 hover:text-purple-200 underline"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }
    lastIndex = m.index + t.length;
  }

  if (lastIndex < text.length) tokens.push(text.slice(lastIndex));
  return tokens;
}

export function MiniMarkdown({ source, className }: MiniMarkdownProps) {
  if (!source?.trim()) return null;

  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: JSX.Element[] = [];

  let i = 0;
  let blockIdx = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // closing ```
      blocks.push(
        <pre
          key={`b-${blockIdx++}`}
          className="bg-slate-950/80 border border-slate-700 rounded-lg p-4 my-3 overflow-x-auto text-sm text-slate-100"
        >
          {lang && (
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{lang}</div>
          )}
          <code>{buf.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Headings
    const h = /^(#{1,3})\s+(.+)/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2];
      const sizeClass = level === 1
        ? 'text-2xl font-bold mt-6 mb-3'
        : level === 2
          ? 'text-xl font-bold mt-5 mb-2'
          : 'text-lg font-semibold mt-4 mb-2';
      const Tag = (`h${level}` as 'h1' | 'h2' | 'h3');
      blocks.push(
        <Tag key={`b-${blockIdx++}`} className={`${sizeClass} text-white`}>
          {renderInline(text, `b${blockIdx}`)}
        </Tag>
      );
      i += 1;
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ul key={`b-${blockIdx++}`} className="list-disc pl-6 space-y-1 my-3 text-slate-200">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `b${blockIdx}-${idx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ol key={`b-${blockIdx++}`} className="list-decimal pl-6 space-y-1 my-3 text-slate-200">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `b${blockIdx}-${idx}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank line → skip
    if (!line.trim()) { i += 1; continue; }

    // Paragraph: collect consecutive non-empty, non-block lines.
    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !lines[i].startsWith('```') &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={`b-${blockIdx++}`} className="leading-relaxed text-slate-200 my-3">
        {renderInline(para.join(' '), `b${blockIdx}`)}
      </p>
    );
  }

  return <div className={className}>{blocks}</div>;
}
