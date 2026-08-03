import { Fragment, type ReactNode } from 'react';

// Deliberately not a full markdown parser (react-markdown/remark would be
// overkill for a single chat bubble) — the Career Coach model only ever
// produces **bold** emphasis and occasional line breaks, so this just
// handles those two things.
const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;

function renderLine(line: string, lineKey: number): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  const pattern = new RegExp(BOLD_PATTERN);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line))) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    parts.push(<strong key={`${lineKey}-${match.index}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }
  return parts;
}

export function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {renderLine(line, i)}
        </Fragment>
      ))}
    </>
  );
}
