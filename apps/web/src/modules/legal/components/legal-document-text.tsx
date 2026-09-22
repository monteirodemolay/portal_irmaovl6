/**
 * Renderizador mínimo do Markdown salvo em `LegalDocumentVersion.conteudoMarkdown`
 * — evita adicionar uma dependência (`react-markdown`/`remark`) só para
 * exibir um texto institucional com formatação simples (títulos, listas,
 * negrito, citação). Suporta apenas o subconjunto usado nos documentos de
 * `docs/legal/`: `#`/`##`/`###`, `- item`, `> citação`, `**negrito**` e
 * parágrafos separados por linha em branco. Não é um parser de Markdown
 * geral — texto fora desse subconjunto aparece como parágrafo comum.
 */
export function LegalDocumentText({ markdown }: { markdown: string }) {
  const blocks = parseBlocks(markdown);

  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'h1':
            return (
              <h2 key={index} className="font-display mt-2 text-xl font-semibold">
                {renderInline(block.text)}
              </h2>
            );
          case 'h2':
            return (
              <h3 key={index} className="font-display mt-2 text-lg font-semibold">
                {renderInline(block.text)}
              </h3>
            );
          case 'h3':
            return (
              <h4 key={index} className="mt-1 text-sm font-semibold uppercase tracking-wide">
                {renderInline(block.text)}
              </h4>
            );
          case 'list':
            return (
              <ul key={index} className="text-muted list-disc pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case 'quote':
            return (
              <blockquote
                key={index}
                className="border-accent/50 text-muted border-l-2 pl-3 italic"
              >
                {renderInline(block.text)}
              </blockquote>
            );
          case 'hr':
            return <hr key={index} className="border-border my-2" />;
          default:
            return (
              <p key={index} className="text-muted">
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}

type Block =
  | { type: 'h1' | 'h2' | 'h3' | 'quote' | 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'hr' };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'p', text: paragraph.join(' ').trim() });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length > 0) {
      blocks.push({ type: 'list', items: list });
      list = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '') {
      flushParagraph();
      flushList();
      continue;
    }
    if (line === '---') {
      flushParagraph();
      flushList();
      blocks.push({ type: 'hr' });
      continue;
    }
    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h3', text: line.slice(4) });
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h2', text: line.slice(3) });
      continue;
    }
    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h1', text: line.slice(2) });
      continue;
    }
    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'quote', text: line.slice(2) });
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      list.push(line.slice(2));
      continue;
    }

    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();

  return blocks;
}

/** Só negrito (`**texto**`) — suficiente para o conteúdo real dos documentos legais. */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}
