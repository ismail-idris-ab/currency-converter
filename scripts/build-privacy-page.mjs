/**
 * Renders PRIVACY_POLICY.md into docs/index.html, the page GitHub Pages serves
 * at the URL the app's Settings screen links to.
 *
 * Generated rather than hand-written: a policy that disagrees with itself
 * depending on where you read it is worse than having no page at all.
 *
 * Run: node scripts/build-privacy-page.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const source = readFileSync(new URL('../PRIVACY_POLICY.md', import.meta.url), 'utf8');

const escape = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Bold, code spans and bare URLs. Applied after escaping, never before. */
function inline(text) {
  return escape(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1">$1</a>')
    .replace(/\b([\w.]+@[\w.]+\.\w+)\b/g, '<a href="mailto:$1">$1</a>');
}

const lines = source.split('\n');
const html = [];
let list = false;
let paragraph = [];

const flushParagraph = () => {
  if (paragraph.length === 0) return;
  html.push(`<p>${inline(paragraph.join(' '))}</p>`);
  paragraph = [];
};

const closeList = () => {
  if (!list) return;
  html.push('</ul>');
  list = false;
};

for (const raw of lines) {
  const line = raw.trimEnd();

  if (line === '') {
    flushParagraph();
    closeList();
    continue;
  }

  const heading = /^(#{1,3})\s+(.*)$/.exec(line);
  if (heading) {
    flushParagraph();
    closeList();
    const level = heading[1].length;
    html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    continue;
  }

  const bullet = /^-\s+(.*)$/.exec(line);
  if (bullet) {
    flushParagraph();
    if (!list) {
      html.push('<ul>');
      list = true;
    }
    html.push(`<li>${inline(bullet[1])}</li>`);
    continue;
  }

  // A continuation line inside a bullet belongs to that bullet, not to a new
  // paragraph, because the source wraps at 80 columns.
  if (list && /^\s+\S/.test(raw)) {
    const last = html.pop();
    html.push(last.replace(/<\/li>$/, ` ${inline(line.trim())}</li>`));
    continue;
  }

  paragraph.push(line.trim());
}

flushParagraph();
closeList();

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy Policy — All Currency Converter</title>
<meta name="description" content="Privacy policy for the All Currency Converter Android app.">
<style>
  :root { color-scheme: light dark; --ink: #1c1c1e; --muted: #6b7280; --bg: #ffffff; --brand: #1f8a66; }
  @media (prefers-color-scheme: dark) {
    :root { --ink: #f5f5f7; --muted: #9ca3af; --bg: #111312; --brand: #34c79a; }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem 1rem 4rem; background: var(--bg); color: var(--ink);
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  main { max-width: 42rem; margin: 0 auto; }
  h1 { font-size: 1.75rem; line-height: 1.25; margin: 0 0 .5rem; }
  h2 { font-size: 1.2rem; margin: 2.25rem 0 .5rem; }
  h3 { font-size: 1rem; margin: 1.5rem 0 .5rem; }
  p, li { color: var(--ink); }
  ul { padding-left: 1.25rem; }
  li { margin: .35rem 0; }
  a { color: var(--brand); overflow-wrap: anywhere; }
  code { font-size: .9em; background: rgba(127,127,127,.15); padding: .1em .35em; border-radius: .25em; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid rgba(127,127,127,.3); color: var(--muted); font-size: .85rem; }
</style>
</head>
<body>
<main>
${html.join('\n')}
<footer>All Currency Converter · <a href="https://github.com/ismail-idris-ab/currency-converter">Source on GitHub</a></footer>
</main>
</body>
</html>
`;

mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/index.html', import.meta.url), page);
console.log(`docs/index.html written, ${page.length} bytes`);
