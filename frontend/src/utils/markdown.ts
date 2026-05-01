import MarkdownIt from 'markdown-it';

const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

md.validateLink = (url) => {
  const scheme = url.trim().toLowerCase().split(':', 1)[0];
  return ALLOWED_SCHEMES.has(scheme);
};

export function renderMarkdown(source: string): string {
  return md.render(source);
}

export function renderMarkdownInline(source: string): string {
  return md.renderInline(source);
}
