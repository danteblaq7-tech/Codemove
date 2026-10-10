// =====================================================================
// NEW FILE – server/lib/lessonText.js
// Lesson notes are now written as PLAIN TEXT. This file is the "backend presentation":
// it turns that text into HTML for learners, so teachers never type tags.
//
//   Blank line ............ new paragraph          Single Enter ........ line break
//   ## Heading ............ section heading        - item  /  • item .... bullet list
//   1. item ............... numbered list          | a | b | .......... table (one row per line)
//   **bold**   *italic*   `code`
//   [image: https://link | caption]    a link to a picture
//   [video: https://link | caption]    a link to a video
//   [link:  https://link | text]       any other link
//   Leave the link empty -> [image: | caption] shows a grey "picture coming soon" note.
//
// Old lessons saved as HTML still work: they are converted to this plain-text format
// automatically (htmlToText) when shown or opened for editing.
// =====================================================================

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s) => String(s).replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');

// Only http(s) links are ever clickable (blocks javascript: and similar).
function safeUrl(u) {
  u = String(u).trim();
  if (/^(www\.|[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$))/i.test(u) && !/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;   // "www.site.com/x" -> https://
  try { const x = new URL(u); return ['http:', 'https:'].includes(x.protocol) ? x.href : ''; } catch { return ''; }
}

const MEDIA = {
  image: { icon: '📷', word: 'Picture', verb: 'View picture' },
  picture: { icon: '📷', word: 'Picture', verb: 'View picture' },
  video: { icon: '🎬', word: 'Video', verb: 'Watch video' },
  link: { icon: '🔗', word: 'Link', verb: 'Open link' },
};

/* ---------- inline formatting (input is ALREADY escaped) ---------- */
function inline(s) {
  const keep = [];
  const hold = (html) => `\u0000${keep.push(html) - 1}\u0000`;
  // media/links first, from the ESCAPED text (so the URL is unescaped before validation)
  s = s.replace(/\[(image|picture|video|link)\s*:([^\]|]*)(?:\|([^\]]*))?\]/gi, (_m, kind, url, label) => {
    const m = MEDIA[kind.toLowerCase()];
    const href = safeUrl(unesc(url));
    const text = (label || '').trim();
    if (!href) return hold(`<span class="media-soon">${m.icon} ${m.word} coming soon${text ? `: ${text}` : ''}</span>`);
    return hold(`<a class="media-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${m.icon} ${text || m.verb}</a>`);
  });
  s = s.replace(/`([^`\n]+)`/g, (_m, c) => hold(`<code>${c}</code>`));
  // [text](https://…) style links
  s = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
    const href = safeUrl(unesc(url));
    return href ? hold(`<a class="media-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">🔗 ${text}</a>`) : m;
  });
  // bare links typed or pasted straight into the text
  s = s.replace(/(^|[\s(])((?:https?:\/\/|www\.)[^\s<>]+)/gi, (m, pre, raw) => {
    const trail = (raw.match(/(?:[.,;:!?)]|&quot;|&gt;)+$/) || [''])[0];
    const url = raw.slice(0, raw.length - trail.length);
    const href = safeUrl(unesc(url));
    return href ? pre + hold(`<a class="media-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${url}</a>`) + trail : m;
  });
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?![*\w])/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_m, i) => keep[+i]);
}

/* ---------- plain text -> HTML ---------- */
export function textToHtml(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const isBullet = (l) => /^\s*(?:[-•]|\*(?!\*))\s+/.test(l);
  const isNum = (l) => /^\s*\d+[.)]\s+/.test(l);
  const isTable = (l) => /^\s*\|.*\|\s*$/.test(l);
  const isHead = (l) => /^\s*#{1,3}\s+\S/.test(l);
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (isHead(l)) { out.push(`<h3>${inline(esc(l.replace(/^\s*#{1,3}\s+/, '').trim()))}</h3>`); i++; continue; }
    if (isBullet(l) || isNum(l)) {
      const num = isNum(l), test = num ? isNum : isBullet, strip = num ? /^\s*\d+[.)]\s+/ : /^\s*(?:[-•]|\*)\s+/;
      const items = [];
      while (i < lines.length && test(lines[i])) {
        let item = lines[i].replace(strip, '');
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !test(lines[i])) item += '\n' + lines[i++].trim();   // indented continuation
        items.push(`<li>${inline(esc(item.trim())).replace(/\n/g, '<br>')}</li>`);
      }
      out.push(`<${num ? 'ol' : 'ul'}>${items.join('')}</${num ? 'ol' : 'ul'}>`);
      continue;
    }
    if (isTable(l)) {
      const rows = [];
      while (i < lines.length && isTable(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        i++;
        if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;       // |---|---| separator row
        rows.push(cells);
      }
      const [head, ...body] = rows;
      out.push(`<div class="tbl"><table><thead><tr>${head.map((c) => `<th>${inline(esc(c))}</th>`).join('')}</tr></thead>` +
        `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(esc(c))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const para = [];                                                  // paragraph: lines until a blank line or a block starts
    while (i < lines.length && lines[i].trim() && !isHead(lines[i]) && !isBullet(lines[i]) && !isNum(lines[i]) && !isTable(lines[i])) para.push(lines[i++].trim());
    out.push(`<p>${inline(esc(para.join('\n'))).replace(/\n/g, '<br>')}</p>`);
  }
  return out.join('\n');
}

/* ---------- legacy HTML -> plain text ---------- */
export const looksLikeHtml = (s) => /<\/?(p|h[1-6]|ul|ol|li|table|tr|td|div|strong|em|br|code|a|span)\b[^>]*>/i.test(String(s ?? ''));

let stash = [];   // code snippets are parked here so their <tags> survive the tag-stripping below
function inlineHtmlToText(s) {
  return s
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, t) => `[link: ${unesc(href)} | ${t.replace(/<[^>]+>/g, '')}]`)
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<code>([\s\S]*?)<\/code>/gi, (_m, c) => `\u0001${stash.push('`' + unesc(c.replace(/<[^>]+>/g, '')) + '`') - 1}\u0001`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
}

export function htmlToText(html) {
  stash = [];
  let s = String(html ?? '').replace(/\r\n?/g, '\n');
  // the old "📷 Picture to be added: …" notes become a link slot the teacher can fill in
  s = s.replace(/<p>\s*<em>\s*📷\s*Picture to be added:?\s*([\s\S]*?)<\/em>\s*<\/p>/gi, (_m, d) => `<p>[image: | ${d.replace(/<[^>]+>/g, '').trim()}]</p>`);
  s = s.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_m, t) => {
    const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) =>
      '| ' + [...r[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => inlineHtmlToText(c[1]).replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim()).join(' | ') + ' |');
    if (rows.length > 1) rows.splice(1, 0, '| ' + rows[0].split('|').slice(1, -1).map(() => '---').join(' | ') + ' |');
    return `\n\n${rows.join('\n')}\n\n`;
  });
  s = s.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_m, t) => `\n\n## ${inlineHtmlToText(t).trim()}\n\n`);
  s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, t) => { let n = 0; return '\n\n' + t.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_x, li) => `${++n}. ${inlineHtmlToText(li).trim().replace(/\n/g, '\n   ')}\n`) + '\n'; });
  s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, t) => '\n\n' + t.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_x, li) => `- ${inlineHtmlToText(li).trim().replace(/\n/g, '\n  ')}\n`) + '\n');
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, t) => `\n\n${inlineHtmlToText(t).trim()}\n\n`);
  s = inlineHtmlToText(s);
  return unesc(s).replace(/\u0001(\d+)\u0001/g, (_m, i) => stash[+i]).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// What the editor shows: plain text, converting old HTML lessons on the fly.
export const toEditable = (c) => (looksLikeHtml(c) ? htmlToText(c) : String(c ?? ''));
// What learners get: HTML built from the plain text.
export const renderLesson = (c) => textToHtml(toEditable(c));