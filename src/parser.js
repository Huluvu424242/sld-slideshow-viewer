import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

export function renderSlideContent(slide, assetResolver) {
  const raw = slide.contentText ?? '';
  const format = (slide.format || inferFormat(slide.contentPath)).toLowerCase();

  if (format === 'wm') {
    return renderWikiMarkup(raw, assetResolver);
  }

  const renderer = new marked.Renderer();
  renderer.image = ({ href, title, text }) => {
    const resolved = assetResolver(href);
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    const alt = escapeHtml(text || '');

    if (resolved instanceof Promise) {
      return `<img src="" data-original-src="${escapeHtml(href)}" alt="${alt}"${titleAttr}>`;
    }

    return `<img src="${resolved}" alt="${alt}"${titleAttr}>`;
  };

  return marked.parse(raw, { renderer });
}

export function inferFormat(path = '') {
  const normalized = path.toLowerCase();
  if (normalized.endsWith('.wm')) {
    return 'wm';
  }
  return 'md';
}

function renderWikiMarkup(input, assetResolver) {
  const lines = input.replace(/\r/g, '').split('\n');
  const blocks = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      blocks.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    if (!line.trim()) {
      closeList();
      continue;
    }

    const heading = line.match(/^(=+)\s*(.*?)\s*\1$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length, 6);
      blocks.push(`<h${level}>${inlineWiki(heading[2], assetResolver)}</h${level}>`);
      continue;
    }

    if (line.startsWith('* ')) {
      if (!inList) {
        blocks.push('<ul>');
        inList = true;
      }
      blocks.push(`<li>${inlineWiki(line.slice(2), assetResolver)}</li>`);
      continue;
    }

    closeList();
    blocks.push(`<p>${inlineWiki(line, assetResolver)}</p>`);
  }

  closeList();
  return blocks.join('\n');
}

function inlineWiki(text, assetResolver) {
  return escapeHtml(text)
    .replace(/'''(.*?)'''/g, '<strong>$1</strong>')
    .replace(/''(.*?)''/g, '<em>$1</em>')
    .replace(/\[\[(.*?)\|(.*?)\]\]/g, (_, href, label) => `<a href="${assetResolver(href)}" target="_blank" rel="noreferrer">${label}</a>`)
    .replace(/\[\[(.*?)\]\]/g, (_, href) => `<a href="${assetResolver(href)}" target="_blank" rel="noreferrer">${href}</a>`);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
