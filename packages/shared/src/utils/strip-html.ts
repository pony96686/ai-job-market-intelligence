import { convert } from 'html-to-text';

const MAX_DESCRIPTION_LENGTH = 50_000;

export function stripHtml(html: string): string {
  const text = convert(html, {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
    ],
  })
    .replace(/\n{2,}/g, '\n')
    .trim();

  return text.length > MAX_DESCRIPTION_LENGTH ? text.slice(0, MAX_DESCRIPTION_LENGTH) : text;
}
