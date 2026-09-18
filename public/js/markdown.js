
export function renderMarkdown(md = "") {
  const esc = s => s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  let x = esc(md);
  x = x.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  x = x.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  x = x.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  x = x.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  x = x.replace(/\*(.+?)\*/g, "<em>$1</em>");
  x = x.replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>");
  x = x.replace(/^---$/gm, "<hr>");
  x = x.replace(/^\- (.*)$/gm, "<div class='md-bullet'>• $1</div>");
  x = x.replace(/^(\d+)\. (.*)$/gm, "<div class='md-numbered'>$1. $2</div>");
  x = x.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, `<a href="$2" target="_blank" rel="noopener">$1</a>`);
  x = x.replace(/\n{2,}/g, "</p><p>");
  return `<p>${x}</p>`;
}

export function wrapSelection(textarea, before, after = before) {
  const s = textarea.selectionStart;
  const e = textarea.selectionEnd;
  const value = textarea.value;
  textarea.value = value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e);
  textarea.focus();
  textarea.selectionStart = s + before.length;
  textarea.selectionEnd = e + before.length;
}
