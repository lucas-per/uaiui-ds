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
2. `npm run tokens` gera `src/styles/tokens.css` e `src/styles/tokens-wrapper.css` (roda sozinho em `dev` e `build`).

Tema: `data-theme="light|dark"` no `<html>` (sem atributo, segue o sistema). Densidade: `data-density="mobile|compact"` (sem atributo, Desktop).

## Usar como dependência

O pacote publica só os tokens e o CSS dos componentes. Instale fixando a versão por tag:

```bash
pnpm add github:lucas-per/uaiui-ds#v0.2.0   # ou npm i
```

```css
@import 'uaiui-ds/tokens-wrapper.css';
@import 'uaiui-ds/components/button.css';
@import 'uaiui-ds/components/accordion.css';
@import 'uaiui-ds/components/toast.css';
```

Os tokens valem só dentro do wrapper `.uaiui`; nada vai para o `:root`:

```html
<div class="uaiui">…componentes…</div>
<div class="uaiui" data-uaiui-theme="dark" data-uaiui-density="compact">…</div>
```

- Tema: `data-uaiui-theme="dark"`. Sem atributo vale o claro, sem seguir `prefers-color-scheme`.
- Densidade: `data-uaiui-density="mobile|compact"`. Sem atributo, Desktop.
- `uaiui-ds/tokens.css` é a versão em `:root` (tema e densidade em `<html>`), usada pelo site de documentação.
- Fontes: os componentes usam `--font-family-label` ("JetBrains Mono", peso `--font-weight-label`) e `--font-family-body` ("DM Sans"). O projeto que consome carrega as duas famílias; o pacote não traz arquivos de fonte.
- `npm run tokens` gera `tokens.css` e `tokens-wrapper.css`. `npm run check` falha se o wrapper tiver seletor fora de `.uaiui`.

## Estrutura

- `src/styles/components/`: CSS de cada componente, só com tokens.
- `src/pages/docs/components/`: uma página por componente.
- `src/data/nav.ts`: menu e busca.
- `src/components/Example.astro`: Preview/Código do mesmo HTML.

## Primeira versão

Accordion, button (com botão de ícone) e toast. Para documentar outro componente: acrescente as variables dele ao arquivo de exportação, crie o CSS, a página e a entrada em `nav.ts`.
