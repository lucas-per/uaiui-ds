# Documentação no padrão do Portifa

O site de documentação (https://uaiui.lpereira.me) usa a interface da documentação do UaiUI que está no ar no Portifa (https://lpereira.me/projetos/uaiui/). Aquela interface é um porte deste site (v0.2.0), redesenhado a partir do Figma. Aqui ela volta, copiada do Portifa, com o conteúdo deste repositório.

Regra da interface: **a moldura da página usa a identidade do site (tokens do Portifa); só o exemplo, o código e as tabelas usam tokens do UaiUI.**

O cabeçalho e o rodapé do Portifa estão em `docs/CHROME-PORTIFA.md`.

## Origem

- Repositório `lucas-per/portifa`, commit **`a0e8583ad32f6cb6511c98124f42cf791658d5d3`** (site `v1.5.1`). O Portifa usa o pacote na v0.4.0; este repositório está na v0.6.0. Os 19 tokens do DS que a página lê existem no `tokens-wrapper.css` da v0.6.0.
- Material de referência: `~/Projetos/Materiais/portifa-docs-uaiui-referencia-a0e8583.md` (sha256 `31bd0df2fc01369ed2b0ac2cce4b16a0e93ad505e6bb1a19bead07daba10e455`; não entra no repositório). O código foi extraído dos blocos do material por script, sem redigitar; as contagens de linhas batem com a tabela da seção 1 dele. O woff2 da Plus Jakarta Sans veio do commit (`git -C ~/Projetos/portifa show a0e8583:…`).

Para ver o que mudou no Portifa depois do commit de origem (só leitura):

```bash
git -C ~/Projetos/portifa fetch origin
git -C ~/Projetos/portifa diff a0e8583 origin/main -- src/layouts/UaiuiDocsLayout.astro src/components/uaiui src/config/uaiui-nav.ts src/utils/stable-id.ts src/pages/projetos/uaiui src/styles/tools/uaiui-docs.css src/styles/tools/uaiui-docs-ds.css src/styles/tools/uaiui-code-font.css src/styles/tokens src/assets/fonts/plus-jakarta-sans-variable.woff2
```

## Arquivos

| Portifa (a0e8583) | Aqui | Como |
|---|---|---|
| `src/layouts/UaiuiDocsLayout.astro` | `src/layouts/DocsLayout.astro` | corpo (do wrapper em diante) literal; o BaseLayout virou `<head>` (com o preload das fontes, D12), skip link, chrome e `<main>` aqui (D1) |
| `src/components/uaiui/{DocsSidebar,DocsSearch,DocsDensity,DocsIcon,CodeBlock,Example,PropsTable}.astro`, `icons.ts`, `docs.ts` | `src/components/portifa-docs/` | literais; só os caminhos de `import` mudaram |
| `src/utils/stable-id.ts` | `src/components/portifa-docs/utils/stable-id.ts` | literal |
| `src/config/uaiui-nav.ts` | `src/components/portifa-docs/config/uaiui-nav.ts` | rotas e uma descrição (D6) |
| `src/styles/tools/uaiui-docs.css`, `uaiui-docs-ds.css` | `src/styles/portifa-docs/` | literais, com os nomes em colisão renomeados (D3) |
| `src/styles/tools/uaiui-code-font.css` | não veio | JetBrains Mono 400 do `@fontsource` (D4) |
| `primitives.css`, `semantics.css` (só o que a página lê) | `src/styles/portifa-docs/tokens.css` | em `.uaiui-docs`, não em `:root` (D2) |
| `fonts.css` (Plus Jakarta Sans) | `src/styles/portifa-docs/fonts.css` + `src/assets/fonts/plus-jakarta-sans-variable.woff2` | nome de família próprio (D4) |
| `src/pages/projetos/uaiui/{index,tokens}.astro`, `componentes/*.astro` | `src/pages/index.astro`, `tokens.astro`, `componentes/*.astro` | estrutura do Portifa, texto deste repositório (D8) |
| — | `src/styles/portifa-docs/base.css` | base da página, no lugar do antigo `site.css` (D5) |
| — | `src/pages/sitemap.xml.ts` | sitemap (D11) |
| — | `src/components/portifa-docs/DocsTheme.astro`, `tema.ts`, `src/styles/portifa-docs/uaiui-docs-tema.css` | tema dos exemplos, adição deste repositório (D13) |

Saíram: `src/pages/docs/**`, `src/components/{Header,Sidebar,Search,Example,CodeBlock,PropsTable}.astro`, `src/data/{nav,icons,url}.ts`, `src/scripts/site.ts`, `src/styles/site.css` (o hero, o cabeçalho próprio do docs com os seletores globais de tema e densidade, a gaveta e o índice "Nesta página").

## Adaptações

Cada uma está marcada no código com `ADAPTAÇÃO UaiUI` (`grep -rn "ADAPTAÇÃO UaiUI" src`). O que não está marcado é cópia literal.

- **D1. Layout.** O BaseLayout do Portifa não existe aqui: `<head>`, skip link, cabeçalho e rodapé do Portifa e o `<main>` ficam em `DocsLayout.astro`. O `<title>` é o do Portifa, `"<página> · UaiUI DS"`. Os tokens do DS vêm do `tokens-wrapper.css` (wrapper `.uaiui`, no mesmo elemento de `.uaiui-docs`), no lugar do `tokens.css` no `:root`: nada do DS fica no `:root`. Os arquivos gerados não mudaram.
- **D2. Tokens do Portifa.** Os 68 que a página lê (36 primitivos, entre cores, escala e pesos, e 32 semânticos, com `--header-mobile-*`; seção 4.1 do material) mais as 3 famílias ficam num bloco só, `.uaiui-docs { … }`, nunca em `:root`. Eles não alcançam o chrome nem o resto da página.
- **D3. Colisões.** `.uaiui` e `.uaiui-docs` estão no mesmo elemento e têm a mesma especificidade: quem vence é a ordem dos arquivos, e qualquer ordem quebra um dos lados num nome que coincide. Os nomes em colisão foram renomeados na cópia (tabela abaixo). Com isso, a ordem deixa de importar.
- **D4. Fontes.** Título: Plus Jakarta Sans do Portifa (variável, 700–800, `font-display: optional`), com o nome "Portifa Plus Jakarta Sans". Corpo: "Portifa DM Sans" variável do chrome (tem o peso 500 do rótulo de grupo do menu). Rótulos e código: JetBrains Mono do `@fontsource` (400 e 700), no lugar da 700 do Portifa e do subset 400 de `uaiui-code-font.css`: a "Portifa JetBrains Mono" só tem 700 e deixaria o código em negrito. Licença da Plus Jakarta Sans: SIL OFL 1.1, "Copyright 2020 The Plus Jakarta Sans Project Authors" (https://github.com/tokotype/PlusJakartaSans), texto em `src/assets/fonts/OFL-Plus-Jakarta-Sans.txt` (baixado do repositório oficial).
- **D5. Base da página** (`base.css`). O CSS global do Portifa não veio no material. Ficam: os `@fontsource` (as famílias que o wrapper do DS lê nos componentes dos exemplos), `box-sizing` (o docs já tinha), `html { color-scheme: light }` (a moldura é sempre clara), o fundo off-white do site no `body` (valor do primitivo `--yellow-1` copiado, porque os tokens do Portifa não alcançam o `body`), o skip link e `main[tabindex="-1"]:focus`.
- **D6. Rotas.** `/` (Introdução), `/tokens/` e `/componentes/<nome>/`, com barra final, como no Portifa. As descrições são as deste repositório; só a do Toast muda ("Aviso curto que aparece depois de uma ação ou de um evento: salvou, falhou, nova versão. Não bloqueia a tela."; a do Portifa dizia "some sozinho").
- **D7. Faixa "UaiUI design system".** A frase do Portifa ("…e em breve disponível no GitHub") ficou desatualizada; vale a do hero da página inicial anterior: "Sistema de design com bordas retas, sombras duras e temas por tokens. Cada componente tem preview, código e requisitos de acessibilidade."
- **D8. Páginas.** Estrutura do Portifa (lead como prop, h1 vindo do nav, callouts `--use`/`--avoid`, cards, tabela com região focável, amostras) com o texto deste repositório. Saíram as frases que ficariam falsas sem os seletores globais: "Use o seletor no cabeçalho para ver." (Introdução; voltou na PR 2, com o tema, como "Use os controles de cada exemplo para ver.", só na Introdução: a página Tokens não tem exemplo, e as amostras de cores ficam fora de palco), "como neste site" (Introdução, sobre `tokens.css`) e "Mude o tema no cabeçalho para ver as cores trocarem." (Tokens). O lead de Tokens perdeu o `<code>` em volta de `tokens.css` (a prop é texto).
- **D9. Toast.** A demonstração principal é a do Portifa: "Mostrar aviso", região viva vazia, `<template>`; fechar pelo X, por Desfazer ou com Esc devolve o foco ao botão; os tons estáticos voltam em 2 s. O texto da página foi ajustado a ela; o conteúdo de acessibilidade é o deste repositório (regiões `aria-live="polite"` e `role="alert"`, toast sem `role`, Esc como requisito de quem integra, entrada de 100 ms só em opacidade). Saiu a frase que dizia que o exemplo não fecha com Esc.
- **D10. Skip link.** Continua um só, o primeiro focável, filho direto do `<body>` (A8 do chrome). Ganhou a classe `uaiui` no próprio `<a>`, para ter os tokens do DS sem o `:root`. Por isso o `button.css` é importado no layout; o do accordion e o do toast entram só na página deles, como no Portifa.
- **D11. Sitemap.** `src/pages/sitemap.xml.ts` gera `dist/sitemap.xml` a partir de `uaiui-nav.ts`, com as URLs do canonical (sem dependência nova).
- **D12. Preload das fontes** (PR 2, commit próprio). O BaseLayout do Portifa faz preload da Plus Jakarta Sans e da DM Sans variáveis; a PR 1 não trouxe isso para o `DocsLayout.astro`. Sem o preload, o navegador só pede as fontes depois de ler o CSS e pintar. Com `font-display: optional`, a Plus Jakarta Sans perde a janela e os títulos ficam na fonte genérica até a visita seguinte (o arquivo já em cache). A DM Sans (`swap`) não fica presa: aparece na genérica e troca quando chega. Correção: o mesmo preload do BaseLayout (`import` do `.woff2`, que devolve o arquivo com hash do `url()` do CSS, e `<link rel="preload" as="font" type="font/woff2" crossorigin>`), mantendo `optional`. Medido no Chromium (perfil novo, sem cache, rede simulada), com a fonte desenhada lida por `CSS.getPlatformFontsForNode`:

  | Rede | Build | Fontes pedidas em | Primeira pintura | Títulos (h1, h2, faixa) | Corpo e rodapé |
  |---|---|---|---|---|---|
  | 150 ms, 1,6 Mbit/s | sem preload | ~1,2 s (depois da pintura) | ~1,2 s | Liberation Sans (genérica) | DM Sans, trocada ~0,7 s depois da pintura |
  | 150 ms, 1,6 Mbit/s | com preload | ~0,16 s | ~1,55 s | Plus Jakarta Sans | DM Sans, já na primeira pintura |
  | 400 ms, 0,4 Mbit/s | sem preload | ~4,5 s | ~4,5 s | Liberation Sans | DM Sans, trocada ~2,6 s depois |
  | 400 ms, 0,4 Mbit/s | com preload | ~0,45 s | ~5,85 s | Plus Jakarta Sans | DM Sans, já na primeira pintura |

  Custo: a primeira pintura atrasa (~0,33 s na primeira rede, ~1,3 s na segunda), porque os 64 KB das duas fontes passam a dividir a banda com o CSS; o carregamento total fica igual. É o mesmo comportamento do Portifa. A JetBrains Mono 700 do chrome (`swap`, só rótulos) e as do `@fontsource` (`swap`) continuam sem preload, como no Portifa.
- **D13. Tema dos exemplos** (PR 2). **Adição deste repositório: não existe no Portifa nem no Figma.** Arquivos novos: `DocsTheme.astro`, `tema.ts` e `uaiui-docs-tema.css`; alterados, com a marca: `Example.astro` e `DocsLayout.astro`. `docs.ts` e `DocsDensity.astro` continuam cópias literais.
  - **Onde vale:** só no palco de cada exemplo (`.uaiui-docs__stage`). A moldura (o wrapper `.uaiui.uaiui-docs`) nunca recebe o tema e continua clara; o bloco de código (painel Código, fora do palco) também não muda, e já é escuro nos dois temas.
  - **Como:** o palco tem sempre a classe `uaiui` (um `.uaiui` aninhado). Escuro é `data-uaiui-theme="dark"` no palco; Claro é a ausência do atributo. Como o `.uaiui` aninhado redeclara todos os tokens, o palco recebe também uma cópia do `data-uaiui-density` do wrapper: sem ela, voltaria para Confortável. No `tokens-wrapper.css`, os blocos do escuro (288 propriedades) e das densidades (174 cada) não têm nenhum nome em comum, então as combinações não dependem da ordem dos arquivos.
  - **Controle:** `fieldset` com legenda "Tema" e rádios Claro e Escuro, com as classes do controle de densidade (mesmo visual), à direita dele numa linha (`.uaiui-docs__controls`); quando não cabem lado a lado, Tema desce para baixo de Densidade. Medido nas três páginas, de 4 em 4px: lado a lado de 604 a 764px e de 936px em diante; Tema embaixo de 320 a 600px e de 768 a 932px (a partir de 768px o menu lateral divide a largura). Um grupo por exemplo (`name` terminando em `-tema`), sincronizados na página.
  - **Escolha:** vale para a página toda e para as outras páginas; fica em `localStorage`, chave `uaiui-theme`, só com o valor `dark` (Claro apaga a chave; outro valor vale Claro). Não segue o tema do sistema. As chaves antigas do site anterior (`uai-theme`, `uai-density`) são ignoradas. Anúncio no mesmo `role="status"` da densidade: "Tema dos exemplos: Escuro." / "Claro.".
  - **Antes da pintura:** um script inline no início do wrapper, logo depois do da densidade, instala um `MutationObserver` que marca cada palco e cada rádio de tema assim que ele entra no documento (os palcos vêm depois do script); ele se desliga no `DOMContentLoaded`. `tema.ts` reaplica o estado salvo (idempotente), cuida da troca e acompanha a densidade do wrapper (observando o atributo, sem mexer em `docs.ts`).
  - **Medido no Chromium:** nenhum quadro pintado com palco claro ou sem a densidade (rede lenta, página chegando em pedaços); tema escuro × Confortável, Padrão e Compacto no Button, no Accordion e no Toast (com o "Mostrar aviso"): os 174 tokens de densidade do palco iguais aos do wrapper, tamanhos iguais aos do claro, moldura e código iguais; Tab da densidade vai para a opção marcada do Tema, setas trocam, anel de foco de 2px com 17,51:1; contraste da legenda 5,78:1, opção não marcada 11,47:1, marcada e sublinhado 4,59:1 (os mesmos da densidade); sem rolagem horizontal de 320 a 1440px.
  - **Observado:** a legenda do controle de densidade começava na borda inferior do palco (0px, como no Portifa); no escuro, as legendas ficavam encostadas no palco. Resolvido em D15.
- **D14. Aba ativa sem a faixa azul** (`uaiui-docs-ds.css`, desvio da cópia). Saiu o indicador de 4px (`::after`, `--ui-brand-band`) sob a aba ativa de Preview e Código, por decisão do Lucas: a aba ativa se distingue **só pelo fundo** (`--ui-bg-page` contra `--ui-bg-panel`) fora do forced-colors. Em `@media (forced-colors: active)` o fundo some, então a faixa continua só ali, em `Highlight` (o bloco passou a declarar `content`, posição e altura, que antes vinham do bloco removido). `aria-selected` não mudou. Os sublinhados das opções de Densidade e Tema (`__segment`) ficam: neles o sublinhado é o único sinal do item marcado.
- **D15. Folga acima dos controles** (`uaiui-docs-tema.css`, desvio da cópia). `padding-top: var(--scale-x2)` (8px) em `.uaiui-docs__controls`, nos dois temas: a legenda "Densidade" (e "Tema") ficava colada no palco (0px). Sem variável nova. Medido a 320, 375, 768 e 1440px: folga de 0 para 8px, sem rolagem horizontal; a página cresce 32px no Button (4 exemplos × 8px).
**Não adaptado de propósito:** os blocos `@media (max-width: 887px)` e `@media (min-width: 768px) and (max-width: 887px)` de `uaiui-docs.css` (que leem `--header-mobile-height`) ficaram como no Portifa, porque o cabeçalho mobile do chrome voltou a ser sticky (decisão 11; A9 em `docs/CHROME-PORTIFA.md`). `--header-mobile-height` está definido em `.uaiui-docs` (D2) e nos contêineres do chrome.

## Colisões

Medido com os 970 nomes do `tokens-wrapper.css` (v0.6.0) e os 75 nomes distintos lidos por `uaiui-docs.css` e `uaiui-docs-ds.css`: 19 do DS, 3 em colisão, 49 do Portifa e 4 locais (`--uaiui-docs-gutter`, `--uaiui-docs-inset`, `--uaiui-docs-layout-shadow`, `--uaiui-docs-pager-shadow-hover`). Dos nomes do Portifa (68 da seção 4.1 e 3 famílias), 3 existem no wrapper:

| Nome | Valor no DS (wrapper) | Valor no Portifa | Quem lê | Solução |
|---|---|---|---|---|
| `--tag-border-subtle` | `var(--ui-border-field)` | `var(--red-6)` | selo "novo" (`__badge`) | `--uaiui-docs-tag-border-subtle` (vermelho, como no Portifa); o DS mantém o seu |
| `--font-family-body` | `"DM Sans"` (@fontsource 400/600) | DM Sans variável 400–600 | texto da moldura; accordion e toast do DS também leem | `--uaiui-docs-font-body: 'Portifa DM Sans', sans-serif` |
| `--font-family-label` | `"JetBrains Mono"` (@fontsource 400/700) | JetBrains Mono 700 (+ 400 só no código) | rótulos e código; button, accordion e toast do DS também leem | `--uaiui-docs-font-label: 'JetBrains Mono', monospace` |
| `--font-family-title` | não existe | Plus Jakarta Sans | faixa, h1, h2 e h3 | sem colisão; renomeado por coerência: `--uaiui-docs-font-title: 'Portifa Plus Jakarta Sans', sans-serif` |

Resultado: 71 propriedades em `.uaiui-docs`, **0** em `:root`, **0** de interseção com o wrapper. O teste `colisão` falha se um nome do bloco aparecer no wrapper (por exemplo, se uma versão futura do DS criar um `--surface-*`).

## Mapa de z-index

| Elemento | z-index |
|---|---|
| skip link | 100 |
| busca (`<dialog>` com `showModal()`) | camada superior |
| painel Cases (chrome, desktop) | 20 |
| cabeçalho mobile (chrome, sticky), com o painel do menu dentro | 10 |
| barra do cabeçalho mobile; opção de densidade ou de tema com foco | 1 (locais) |
| menu lateral (`sticky`, a partir de 768px) | sem z-index |

Saíram o `.docs-header` (5) e a gaveta (30). Medido no Chromium: a 767, 768 e 887px, com a página na âncora `#acessibilidade` do Button, o `h2` fica a 91px do topo e o cabeçalho mobile termina em 83px; a 768 e 887px o menu lateral fica a 123px (83 + 40). A 888px o cabeçalho mobile some e o menu fica a 40px. A 888px o painel Cases abre por cima do menu lateral.

## Interferências com o chrome

- **Landmarks:** em todas as larguras, 1 `banner` e 1 `contentinfo` visíveis e 1 `main`. `nav` com nomes únicos: "Menu do site" (menu mobile do chrome, só aberto), "Documentação do UaiUI DS" (menu lateral; fechado no celular) e "Páginas anterior e seguinte".
- **`inert`:** com o menu mobile aberto, o script do chrome marca como `inert` o skip link, o cabeçalho desktop, o `<main>` (com a busca e o "Páginas" dentro) e os dois rodapés.
- **Ctrl+K com o menu mobile aberto (observado, não corrigido):** a busca abre por cima do menu, o campo recebe o foco e funciona, embora o `<dialog>` esteja dentro do `<main>` inerte (o Chromium deixa o diálogo modal sair do `inert`). Esc fecha a busca e o foco volta ao botão do menu, que continua aberto. É a mesma estrutura do Portifa (busca dentro do `<main>`, cabeçalho fora).
- **`isolamento.css` (chrome):** neutralizava o `:focus-visible` global do `site.css`. Sem o `site.css`, ficou sem o que neutralizar; continua como proteção, sem efeito colateral.

## Débitos de acessibilidade do Portifa (registrados, não corrigidos)

Da seção 6 do material. A auditoria de acessibilidade será refeita sobre esta interface.

Registrados no design-notes do Portifa:

1. Divisores e sombra do pager abaixo de 3:1 (decorativos): divisor sob a faixa, linha vertical do menu, divisor antes de cada `h2` (1,98:1 e 2,04:1) e sombra do pager (2,91:1).
2. "Páginas" a 320 e 360px com texto a 200%: "PÁGINAS" vaza do rótulo, dentro do botão.
3. Toast a 200%: ícone e texto só ficam juntos a partir de 283px de largura.
4. Título do accordion com palavra longa a 200% em 320px: a seta sai da borda (o título do DS precisa de `min-width: 0` e quebra de palavra).
5. Botão `ghost` com rótulo curto pode ficar abaixo de 44px de largura (`padding-inline: 0` no DS).
6. Componentes do DS em px: só o zoom os amplia, não o tamanho de texto.
7. Ordem do Tab × ordem visual no celular (Densidade acima de "Páginas", divergência do Figma).
8. Divergências do Toast com a página do DS: (a) toast sem `role`, (b) saída sem animação. Do lado do DS, o texto deste repositório já diz as duas coisas (PR A).

Débito novo (PR de ajustes, D14), **medido, não corrigido**:

0. **Aba ativa só pela cor de fundo** (WCAG 1.4.1 e 1.4.11). Fundo da aba ativa `--ui-bg-page` (#fcfeff) contra a barra e as abas inativas `--ui-bg-panel` (#d6dee6): **1,34:1**, abaixo de 3:1. Fora do forced-colors a aba ativa se diferencia por uma pista de cor fraca; o texto é o mesmo nas duas, e `aria-selected` dá o estado a leitor de tela.

Observações da leitura do código (não medidas):

1. O mesmo controle de densidade se repete em cada exemplo (vários grupos "Densidade" sincronizados). O de tema (D13) segue o mesmo padrão.
2. Níveis de título nos exemplos do Accordion (ver ambiguidade 4).
3. Combobox da busca com `aria-expanded="true"` fixo e `<a tabindex="-1">` nas opções; não testado com leitor de tela.
4. Toasts estáticos que somem e voltam em 2 s (WCAG 2.2.2).
5. Rótulos de grupo do menu são `<p>`, não títulos.
6. Regiões roláveis com foco (tabelas) e nota de rolagem só no celular.
7. Tema escuro não exposto no Portifa. Aqui ele entrou na PR 2, só no palco dos exemplos (D13).

## Ambiguidades do material e o que foi decidido

1. **CSS global do Portifa (reset de `html` e `body`) não veio.** Ficou o mínimo em `base.css` (D5), com o `box-sizing` que o docs já tinha. Nas medidas (320 a 1440px) nenhuma largura tem rolagem horizontal. Efeito visível: a lista de amostras de cores (`ul.uaiui-docs__swatches`) fica com o recuo padrão de 40px do navegador, porque a cópia não zera o `padding` dela (os cards zeram); se o CSS global do Portifa zera o `padding` das listas, lá ela não tem esse recuo. Não foi mexido na cópia.
2. **Rótulos da densidade.** O controle é cópia do Portifa (Confortável, Padrão, Compacto); o texto da Introdução continua o deste repositório ("Comfortable, Standard e Compact").
3. **Toast.** Decidido pelo Lucas: demonstração do Portifa, texto ajustado (D9).
4. **Níveis de título no Accordion.** O Portifa usa `h2` nos itens do primeiro exemplo; ficou o exemplo deste repositório, com `h3` (o primeiro exemplo vem logo depois do `h1`, então pula o nível `h2`). Fica para a auditoria nova.
5. **`{propsTitle}` do Portifa** (contorno de um panic do `astro check` com o texto literal `<h2>Props</h2>`): não foi preciso. Aqui o `astro check` passa com o texto literal.
6. **Texto da faixa.** A frase do hero anterior (D7).
7. **Testes do Portifa e frames do Figma não vieram.** Os testes foram escritos aqui, no padrão de `tests/portifa-chrome`. O visual não foi comparado lado a lado com o site no ar (lpereira.me/projetos/uaiui/); as capturas desta PR são deste site.

## Rotas antigas e redirecionamentos

As rotas `/docs/…` deixaram de existir, sem redirecionamento (decisão 10: o site é provisório e não há links externos para elas).

Para o Portifa (chat do Site), **só depois que `uaiui.lpereira.me` estiver no ar**, os 301 das páginas de lá:

| De | Para |
|---|---|
| https://lpereira.me/projetos/uaiui/ | https://uaiui.lpereira.me/ |
| https://lpereira.me/projetos/uaiui/tokens/ | https://uaiui.lpereira.me/tokens/ |
| https://lpereira.me/projetos/uaiui/componentes/accordion/ | https://uaiui.lpereira.me/componentes/accordion/ |
| https://lpereira.me/projetos/uaiui/componentes/button/ | https://uaiui.lpereira.me/componentes/button/ |
| https://lpereira.me/projetos/uaiui/componentes/toast/ | https://uaiui.lpereira.me/componentes/toast/ |

No `_redirects` do Portifa (Cloudflare Pages) as cinco cabem numa linha: `/projetos/uaiui/* https://uaiui.lpereira.me/:splat 301`. As âncoras (`#principios`, `#instalacao`, `#props`…) têm os mesmos `id` nos dois sites.

## Testes

Na raiz, depois de `npm run build`:

```bash
node --test "tests/portifa-docs/*.test.mjs" "tests/portifa-chrome/*.test.mjs"
```

`tests/portifa-docs` cobre: colisão dos tokens do Portifa com os 970 nomes do wrapper (0) e nada em `:root`; todo `var()` dos CSS da documentação com definição; todo seletor começando por `.uaiui-docs`; links internos do HTML gerado e do sitemap existentes e com barra final, sem `/docs`; canonical igual ao sitemap; sha256 e licença da Plus Jakarta Sans; o preload das duas fontes em todas as páginas, apontando para o mesmo arquivo do `url()` do CSS, com `optional` mantido; os blocos do cabeçalho sticky presentes na cópia; marcas `ADAPTAÇÃO UaiUI`; o layout sem `tokens.css` e o skip link com `uaiui`. `tema.test.mjs` cobre o tema (D13): o CSS novo sem propriedades (zero colisão) e com seletores `.uaiui-docs`; no HTML gerado, todo palco com `uaiui` e sem tema ou densidade fixos, uma linha Densidade \| Tema por exemplo, nesta ordem, com Claro marcado e `name` único; nenhum elemento com `data-uaiui-theme` no HTML e nenhum `.uaiui` no painel Código; o script inline antes dos palcos e depois do da densidade, a chave `uaiui-theme` só com `dark`, a cópia da densidade, nada de `prefers-color-scheme` nem das chaves antigas; a frase só na Introdução.

**Pendência:** estes testes e os do chrome não rodam no `npm run check` nem no CI (`package.json`, `scripts/` e `.github/` estavam fora do escopo).

## Limites conhecidos

- Texto ampliado a 200% e zoom: não verificados.
- Só Chromium; sem Firefox, Safari, toque real nem leitor de tela.
- O tema dos exemplos (D13) foi medido só no Chromium, sem leitor de tela.
