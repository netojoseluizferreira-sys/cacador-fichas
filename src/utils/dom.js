// Utilitários compartilhados de DOM e texto. Mantidos globais para preservar o
// carregamento simples via GitHub Pages, sem etapa de build.
const $ = (id) => document.getElementById(id);

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
