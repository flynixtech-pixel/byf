function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(text: string) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}

/** Strips markdown syntax down to plain text, for use in card previews. */
export function stripMarkdown(content: string): string {
  return content
    .replace(/\n+/g, " ")
    .replace(/[*_`>-]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Renders the lightweight markdown subset produced by the admin blog editor
 * (bold, italic, inline code, bullet lists, quotes, paragraphs) to safe HTML.
 */
export function renderBlogContent(content: string): string {
  const blocks = content.trim().split(/\n{2,}/);

  return blocks
    .map((block) => {
      const lines = block.split("\n").filter((line) => line.trim().length > 0);
      if (lines.length === 0) return "";

      if (lines.every((line) => line.trim().startsWith("- "))) {
        const items = lines.map((line) => `<li>${inline(line.trim().slice(2))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }

      if (lines.every((line) => line.trim().startsWith("> "))) {
        const quote = lines.map((line) => inline(line.trim().slice(2))).join("<br/>");
        return `<blockquote>${quote}</blockquote>`;
      }

      return `<p>${lines.map(inline).join("<br/>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}
