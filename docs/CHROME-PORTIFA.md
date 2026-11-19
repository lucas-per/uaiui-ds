# Cabeçalho e rodapé do Portifa neste site

O cabeçalho (desktop e mobile) e o rodapé (desktop e mobile) deste site de documentação são uma **cópia** do chrome do site lpereira.me (repositório Portifa), com as adaptações abaixo e só elas. A identidade deles é a do portfólio, não a da UaiUI: ficam sempre claros, mesmo no tema escuro do docs.

## Origem

- Commit de origem: `a0e8583ad32f6cb6511c98124f42cf791658d5d3` (repositório lucas-per/portifa, PR #71, site v.1.5.1).

## Como saber se a cópia está defasada

No repositório do Portifa (`~/Projetos/portifa`):

```bash
git diff a0e8583..main -- src/components/layout src/components/ui src/config src/utils/header-link.ts src/utils/cases.ts src/styles/tokens src/layouts/BaseLayout.astro src/content/cases src/content.config.ts
```

Os caminhos daqui espelham os de lá: `src/components/portifa-chrome/{layout,ui,config,utils}/` equivale a `src/components/{layout,ui}`, `src/config` e `src/utils` do Portifa; `src/styles/portifa-chrome/` equivale a `src/styles/tokens/`.

## O que foi copiado

| Aqui | No Portifa |
|---|---|
| `src/components/portifa-chrome/layout/` Header, HeaderLink, HeaderCases, HeaderMobile, HeaderMobileMenu, Footer, FooterMobile | `src/components/layout/` |
| `src/components/portifa-chrome/ui/` Button, Divider, ContactIcon | `src/components/ui/` |
| `src/components/portifa-chrome/config/` navigation, contact, version | `src/config/` |
| `src/components/portifa-chrome/utils/` header-link, cases | `src/utils/` |
| `src/styles/portifa-chrome/tokens.css` | `primitives.css` e `semantics.css`, só o que o chrome usa |
| `src/styles/portifa-chrome/typography.css` | só `.text-label-md`, `.text-label-sm`, `.text-body-caption` |
| `src/styles/portifa-chrome/fonts.css` | `fonts.css`, só DM Sans e JetBrains Mono 700 |
| `src/styles/portifa-chrome/isolamento.css` | novo (ver "Vazamentos do docs") |
| `src/assets/fonts/`, `src/assets/icons/` | `src/assets/fonts/`, `src/assets/icons/` |

Não vêm: o `<head>`, as metatags, o Umami, o `<body>` e a regra `main :where(...)` do `BaseLayout`; o `typography.css` inteiro; Plus Jakarta Sans (fonte de títulos); os favicons; os testes do Portifa.

Os quatro componentes e o skip link são **filhos diretos do `<body>`** (`src/layouts/DocsLayout.astro`): o script do menu mobile marca como `inert` os filhos diretos do `body` que não contêm o cabeçalho, e dentro de um wrapper isso não funcionaria. Ordem no DOM: skip link, cabeçalho desktop, cabeçalho mobile, cabeçalho do docs, conteúdo, busca, rodapé desktop, rodapé mobile. Os quatro ficam no DOM; um de cada par é `display: none`. Os pontos de troca são diferentes: 888px no cabeçalho (mobile até 887px) e 768px no rodapé (mobile até 767px).

## Adaptações

Cada adaptação está marcada no código com o comentário `ADAPTAÇÃO UaiUI: <motivo>` (`grep -rn "ADAPTAÇÃO UaiUI" src`).

- **A1.** `.site-header` (desktop) ganha `background-color: var(--surface-bg-off-white-primary)`. No Portifa o fundo vem do `body`; aqui o `body` seguia o tema da UaiUI e o logo completo (#3B2F40) sumiria no escuro. Desde a PR da documentação no padrão do Portifa (ver `docs/DOCS-PORTIFA.md`) o `body` é sempre off-white; o A1 ficou redundante e continua, sem efeito colateral.
- **A2.** Tokens. Os nomes do Portifa (`--scale-*`, `--surface-*`, `--text-*`, `--button-*`, `--border-*`, `--icon-*`, `--shadow-*`) são genéricos e podem colidir com os da UaiUI. Ficam declarados só nos quatro contêineres (`.site-header`, `.site-header-mobile`, `.site-footer`, `.site-footer-mobile`), nunca em `:root`, e só os que o chrome usa. Nada do chrome fica em `:root` (inclusive `--header-mobile-core`, `--header-mobile-divider` e `--header-mobile-height`, que ficam nos contêineres; ver A9).
- **A3.** Tipografia: só `.text-label-md`, `.text-label-sm` e `.text-body-caption`, escopadas nos quatro contêineres com `:where()` (a especificidade continua a da classe).
- **A4.** Todo `href` do chrome é URL absoluta de lpereira.me (logo, "Sobre mim" `#sobre-mim`, Paletaria, os cases), exceto "UaiUI DS" (decisão 2). Abrem na mesma aba; só LinkedIn, GitHub e CV abrem em nova aba.
- **A5.** "Baixar CV" vira "Ver CV": o atributo `download` não funciona entre origens. Ícone `external`, `https://lpereira.me/cv-lucas-pereira.pdf`, `target="_blank" rel="noopener noreferrer"`, sem `download`. O nome acessível é "Ver CV, PDF em nova aba" (começa pelo texto visível, WCAG 2.5.3), com `ariaLabelWithText` ligado.
- **A6.** O rodapé e o mini-rodapé do menu mostram a versão do `@uaiui/ds`, lida do `package.json` no build (`config/version.ts`): "UaiUI DS v.X.Y.Z", no lugar da versão do site.
- **A7.** Fontes: os dois woff2 e o `@font-face`, com **nomes próprios**, "Portifa DM Sans" e "Portifa JetBrains Mono". O docs já declara DM Sans e JetBrains Mono (`@fontsource`, em `site.css`, hoje `src/styles/portifa-docs/base.css`) com os nomes normais, e os mesmos nomes no chrome mudariam o texto do docs. `--font-family-label` e `--font-family-body` apontam para elas, com fallback genérico (`monospace`, `sans-serif`). Licenças (SIL OFL 1.1, confirmadas nos repositórios oficiais): DM Sans, "Copyright 2014 The DM Sans Project Authors" (https://github.com/googlefonts/dm-fonts); JetBrains Mono, "Copyright 2020 The JetBrains Mono Project Authors" (https://github.com/JetBrains/JetBrainsMono). O texto de cada uma está em `src/assets/fonts/OFL-*.txt`.
- **A8.** Skip link "Pular para o conteúdo": o docs já tinha um. Continua um só, é o primeiro focável do `<body>` (antes do chrome) e leva ao `<main id="conteudo" tabindex="-1">`. O outline global do docs não aparece no `<main>` focado por programa (`main[tabindex="-1"]:focus`, hoje em `src/styles/portifa-docs/base.css`). O skip link tem a classe `uaiui` no próprio `<a>`: os tokens do DS não estão mais no `:root`.
- **A9.** Deslocamento sob o cabeçalho mobile. O cabeçalho mobile é sticky, como no Portifa (decisão 11 da PR da documentação; antes não era, ver a seção abaixo). `--header-mobile-height` fica nos contêineres e em `.uaiui-docs`, não em `:root`.

### Decisões do Lucas

1. Cabeçalho e rodapé sempre claros (`color-scheme: light` nos quatro contêineres).
2. "UaiUI DS" aponta para a raiz do docs (`/`), com `aria-current` fixo: `page` na home e `true` nas demais páginas. Não usa `getAriaCurrent`, que para a seção `/` não devolve `true` nas rotas filhas.
3. Cabeçalho mobile não sticky (A9). **Revertida** na PR da documentação (decisão 11): sem o `.docs-header`, o motivo acabou.
4. Favicon: o do Portifa não foi copiado.
5. Lista de cases fixa (sem `astro:content`), ver "Lista de cases".
6. Cabeçalho do docs: `.site-header` virou `.docs-header` (e `__in`), e o `<header>` do docs virou `<div>`: o `<header>` do chrome é o único `banner` visível. O `.docs-header` saiu na PR da documentação (decisão 2a).

### Ajustes que não vêm de A1 a A9

- `color-scheme: light` nos quatro contêineres (barras de rolagem e controles nativos também ficam claros).
- `main[tabindex="-1"]:focus { outline: none }` em `site.css` (hoje `portifa-docs/base.css`).
- `isolamento.css`: o foco dos links do logo.
- O rename do cabeçalho do docs e o `z-index` dele (os dois saíram com o `.docs-header`).

## A9: o cabeçalho mobile e o deslocamento sob ele

**Hoje (desde a PR da documentação no padrão do Portifa):** o cabeçalho mobile (até 887px, 83px de altura) é sticky, como no Portifa: `position: sticky; top: 0; z-index: 10`, igual ao original. `--header-mobile-height` (`calc(var(--scale-x4) * 2 + var(--header-mobile-core) + var(--header-mobile-divider))`, 83px) voltou e está definido em dois lugares, sem `:root`:

- nos quatro contêineres do chrome (`src/styles/portifa-chrome/tokens.css`), junto de `--header-mobile-core` e `--header-mobile-divider`, como no Portifa. O chrome não lê a altura;
- em `.uaiui-docs` (`src/styles/portifa-docs/tokens.css`), que é quem a lê: o `scroll-margin-top` dos `h2` até 887px e o `top`/`max-height` do menu lateral de 768 a 887px (`uaiui-docs.css`, cópia literal). Os contêineres do chrome não envolvem o docs, então a variável precisa estar nos dois.

**Antes (PR #21):** o cabeçalho mobile não era sticky. O docs tinha um cabeçalho próprio sticky (`.docs-header`, 64 a 86px), e os dois somariam cerca de 150px fixos no topo (WCAG 2.4.11 e 1.4.10). Com a saída do `.docs-header`, o motivo acabou e a adaptação foi revertida (decisão 11).

## Mapa de z-index (docs e chrome)

| Elemento | z-index | Observação |
|---|---|---|
| `.skip` | 100 | `absolute`; sobre tudo, só aparece com foco |
| busca (`dialog.uaiui-docs__search`) | camada superior | `showModal()`: sempre acima de qualquer z-index |
| `.header-cases__panel` (chrome, desktop) | 20 | acima do menu lateral sticky da documentação |
| `.site-header-mobile` (chrome, sticky) | 10 | contexto próprio; o painel do menu mobile (`absolute`) fica dentro dele e cobre o conteúdo |
| `.site-header-mobile__bar` (chrome) | 1 | só dentro do cabeçalho mobile (ordem de pintura da sombra do botão) |
| opção de densidade com foco (`.uaiui-docs__segment`) | 1 | só dentro do controle de densidade (o anel de foco passa por cima da vizinha) |
| menu lateral (`.uaiui-docs__sidebar`, a partir de 768px) | sem z-index | `sticky` a 40px do topo; de 768 a 887px, abaixo do cabeçalho mobile (`--header-mobile-height` + 40px) |

Saíram o `.docs-header` (5) e a gaveta `.sidebar` (30). Medido no navegador (Chromium): a 767, 768 e 887px, com a página na âncora `#acessibilidade`, o `h2` fica a 91px do topo e o cabeçalho mobile termina em 83px; a 768 e 887px o menu lateral fica a 123px (83 + 40). A 888px o cabeçalho mobile some e o menu fica a 40px. A 888px o painel Cases abre por cima do menu lateral.

## Vazamentos do docs para dentro do chrome

**Histórico (PR #21).** O `site.css` não existe mais; a base da página é `src/styles/portifa-docs/base.css`, sem `a`, `body`/`html` com fonte e cor, nem `:focus-visible` global. A medição abaixo vale para o docs anterior.

As regras globais de `site.css` que atingem elementos do chrome foram medidas no navegador: cada regra desativada, e o estilo calculado e a posição de cada elemento comparados.

- `*, ::before, ::after { box-sizing: border-box }`: atinge todos os elementos; nenhuma posição ou tamanho muda. Mantida.
- `a { color; text-underline-offset }`: só muda a cor do `<a>` do logo (só tem uma imagem) e o offset de um sublinhado que o chrome não usa (`text-decoration: none`). Mantida.
- `body` e `html` (`font`, `color`, `line-height`, `color-scheme`): nenhum texto do chrome herda; todo texto tem fonte, cor e altura de linha próprias. Mantidas.
- `:focus-visible { outline: ... var(--ui-focus-ring) }`: **muda o visual** nos links do logo, que não têm `:focus-visible` próprio (no Portifa vale o anel do navegador). No tema escuro a cor do anel é quase branca sobre o fundo claro do chrome, e o foco some. Neutralizado em `isolamento.css` com `outline: revert`.

No sentido contrário, as 131 regras do chrome no CSS gerado não atingem nenhum elemento fora dos quatro contêineres (medido).

## Lista de cases

A lista de cases do cabeçalho (desktop e menu mobile) é **fixa**, em `src/components/portifa-chrome/utils/cases.ts`: "Área de pagamentos" (`https://lpereira.me/cases/jornada-pagamentos`) e "Redesign de produto" (`https://lpereira.me/cases/redesign`), nessa ordem.

No Portifa o título e o status de cada case vêm de `src/content/cases` (campos `title` e `status`), e a ordem vem de `homeCaseOrder` em `src/utils/cases.ts`. **Case novo publicado (status `published`) = atualizar esta lista à mão.** O comando de defasagem acima inclui `src/content/cases`, `src/content.config.ts` e `src/utils/cases.ts` para isso aparecer no diff.

## Testes

`tests/portifa-chrome/`, na raiz, depois de `npm run build`:

```bash
node --test "tests/portifa-chrome/*.test.mjs"
```

Cobrem: colisão dos tokens do chrome com os 970 nomes da UaiUI (0 em `:root`), todo `var()` do chrome com definição, nenhum `href` relativo no chrome (exceto "UaiUI DS") e nenhum caminho `/uaiui` no HTML gerado, sha256 dos woff2 iguais aos do commit de origem, marcadores `ADAPTAÇÃO UaiUI` de A1 a A9, e o cabeçalho mobile com `position: sticky` (decisão 11 da PR da documentação; até ela, o teste exigia o contrário).

**Pendência:** estes testes não rodam no `npm run check` nem no CI (`package.json` e `scripts/` estavam fora do escopo da PR). Para entrarem, é preciso acrescentá-los a `scripts/ci.sh` e a `.github/workflows/ci.yml` (que têm de listar os mesmos comandos) e rodar `npm run build` antes.

## Limites conhecidos

- **Texto ampliado a 200% e zoom:** não verificados. O Portifa tem regras próprias para isso (as quebras de linha dos cabeçalhos e do rodapé); a conferência neste site fica à mão.
- **Landmarks e dívidas do Portifa:** o `<header>` do chrome é o `banner` da página e o `<footer>` do chrome é o `contentinfo`. A cópia é fiel e mantém as dívidas do Portifa (sem `<nav>` no cabeçalho desktop; `aria-label` do botão do menu que muda entre "Abrir menu" e "Fechar menu"): a correção chega depois, pelo diff.
- **O docs e o chrome têm dois cabeçalhos visíveis** (o do chrome e o do docs, que fica logo abaixo).
