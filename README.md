# UaiUI DS

Site de documentação do UaiUI (Astro). Cada componente tem preview, código, instalação, atributos e requisitos de acessibilidade.

## Rodar

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/
```

## Tokens

As variables do Figma ("UaiUI – Design Tokens") são a fonte de verdade.

1. `tokens/figma-variables.txt`: exportação (uma linha por variable, um valor por modo).
2. `npm run tokens` gera `src/styles/tokens.css` (roda sozinho em `dev` e `build`).

Tema: `data-theme="light|dark"` no `<html>` (sem atributo, segue o sistema). Densidade: `data-density="mobile|compact"` (sem atributo, Desktop).

## Estrutura

- `src/styles/components/`: CSS de cada componente, só com tokens.
- `src/pages/docs/components/`: uma página por componente.
- `src/data/nav.ts`: menu e busca.
- `src/components/Example.astro`: Preview/Código do mesmo HTML.

## Primeira versão

Accordion, button (com botão de ícone) e toast. Para documentar outro componente: acrescente as variables dele ao arquivo de exportação, crie o CSS, a página e a entrada em `nav.ts`.
