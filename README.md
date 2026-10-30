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

1. `tokens/`: JSON no padrão [Design Tokens 2025.10](https://www.designtokens.org/tr/2025.10/) (DTCG), um arquivo por coleção (`escala`, `dimensoes`, `semantica`, `componente`) e um por modo em `primitivos/` e `densidade/`. `tokens/uaiui.resolver.json` junta os arquivos e define os modos. Até o export do Figma direto para JSON, edite os JSON no repositório.
2. `npm run tokens` gera `src/styles/tokens.css` e `src/styles/tokens-wrapper.css` (roda sozinho em `dev` e `build`).

Tema: `data-theme="light|dark"` no `<html>` (sem atributo, segue o sistema). Densidade: `data-density="standard|compact"` (sem atributo ou com `comfortable`, comfortable).

## Usar como dependência

O pacote publica os tokens (CSS e JSON DTCG) e o CSS dos componentes.

```bash
npm i @uaiui/ds
```

O uso por tag do GitHub continua funcionando (`npm i github:lucas-per/uaiui-ds#v0.5.0`). Nesse caso, o nome nos imports é o da chave em `dependencies`: `uaiui-ds` nas tags até a v0.4.0, `@uaiui/ds` a partir da v0.5.0.

```css
@import '@uaiui/ds/tokens-wrapper.css';
@import '@uaiui/ds/components/button.css';
@import '@uaiui/ds/components/accordion.css';
@import '@uaiui/ds/components/toast.css';
```

Num bundler (Vite, Astro, webpack), o mesmo import vale em JavaScript:

```js
import '@uaiui/ds/tokens-wrapper.css';
import '@uaiui/ds/components/button.css';
```

Os tokens em JSON (padrão DTCG 2025.10) saem em `@uaiui/ds/tokens/*.json`, e o resolver dos modos em `@uaiui/ds/tokens/uaiui.resolver.json`.

Os tokens valem só dentro do wrapper `.uaiui`; nada vai para o `:root`:

```html
<div class="uaiui">…componentes…</div>
<div class="uaiui" data-uaiui-theme="dark" data-uaiui-density="compact">…</div>
```

- Tema: `data-uaiui-theme="dark"`. Sem atributo vale o claro, sem seguir `prefers-color-scheme`.
- Densidade: `data-uaiui-density="standard|compact"`. Sem atributo ou com `comfortable`, vale comfortable.
- `@uaiui/ds/tokens.css` é a versão em `:root` (tema e densidade em `<html>`), usada pelo site de documentação.
- Fontes: os componentes usam `--font-family-label` ("JetBrains Mono", peso `--font-weight-label`) e `--font-family-body` ("DM Sans"). O projeto que consome carrega as duas famílias; o pacote não traz arquivos de fonte.
- Medidas: os componentes usam rem, então dependem do `font-size` da raiz do site que hospeda. A base de 16 px é o padrão; uma raiz diferente reescala os componentes.
- `npm run tokens` gera `tokens.css` e `tokens-wrapper.css`. `npm run check` falha se um alias não resolver, se um token não tiver `$type`, se o CSS gerado estiver desatualizado ou se o wrapper tiver seletor fora de `.uaiui`.

## Estrutura

- `src/styles/components/`: CSS de cada componente, só com tokens.
- `src/pages/docs/components/`: uma página por componente.
- `src/data/nav.ts`: menu e busca.
- `src/components/Example.astro`: Preview/Código do mesmo HTML.

## Primeira versão

Accordion, button (com botão de ícone) e toast. Para documentar outro componente: acrescente os tokens dele aos JSON em `tokens/`, crie o CSS, a página e a entrada em `nav.ts`.
