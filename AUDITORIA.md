# Auditoria do @uaiui/ds 0.6.0

> Auditoria somente leitura de acessibilidade, CSS e documentação. Base: `origin/main` em `4b7a335` (versão 0.6.0, PR #18), em 2026-11-03. Nada foi corrigido: cada achado tem evidência, impacto, recomendação e esforço (P: até 1 dia · M: alguns dias · G: uma semana ou mais).
> Gravidade: **Alta** afeta todos os consumidores ou quebra a API se adiada; **Média** falha de WCAG 2.2 AA no site ou lacuna que deixa o problema passar; **Baixa** melhoria, inconsistência ou falha sem efeito prático.

## 1. Resumo

**36 achados:** 2 altas, 13 médias, 21 baixas.

| Área | Alta | Média | Baixa | Total |
|---|---:|---:|---:|---:|
| Acessibilidade (A) | 0 | 5 | 7 | 12 |
| Estados de interação (I) | 0 | 0 | 2 | 2 |
| Valores fixos (F) | 0 | 1 | 3 | 4 |
| Documentação (D) | 0 | 2 | 3 | 5 |
| Saúde dos tokens (K) | 1 | 3 | 1 | 5 |
| Pacote e repositório (P) | 1 | 2 | 5 | 8 |
| **Total** | **2** | **13** | **21** | **36** |

### Os 10 mais importantes, em ordem de prioridade

| # | ID | Gravidade | Esforço | Achado |
|---:|---|---|---|---|
| 1 | P-01 | Alta | G | O CSS de tokens ficou ~5× maior sem componente novo: 78% dos tokens não são usados |
| 2 | K-01 | Alta | M | `active` significa duas coisas: "pressionado" na camada de interface e um nível intermediário na camada de comportamento |
| 3 | A-01 | Média | P | No celular, a barra lateral fechada continua na ordem de Tab e o foco some fora da tela |
| 4 | A-02 | Média | P | Rolagem horizontal em 320 px de largura em todas as páginas (WCAG 1.4.10 Reflow) |
| 5 | A-03 | Média | P | O anel de foco do botão "Copiar" é invisível no tema Claro |
| 6 | D-02 | Média | P | As páginas de componente mandam copiar arquivos e não citam o pacote npm nem o wrapper |
| 7 | D-01 | Média | P | Frases desatualizadas depois da sincronização com o Figma |
| 8 | K-03 | Média | P | O botão ignora os 9 tokens de borda por estilo e estado do Figma |
| 9 | P-04 | Média | M | O CI não builda o site, não testa acessibilidade e não testa o pacote instalado |
| 10 | A-04 | Média | P | Selo "novo" com texto de 11 px a 3,81:1 |

Critério da ordem: primeiro o que fica mais caro depois (P-01 e K-01 mudam o que os consumidores recebem ou os nomes da API), depois falhas de teclado e reflow no site (A-01 a A-03), depois a documentação que manda os usuários para o caminho pesado (D-02, D-01), a divergência possível com o Figma (K-03), o CI que deixaria tudo isso passar (P-04) e o contraste do selo (A-04).

### O que está bom

- **Contraste dos componentes:** 104 medições, 4 abaixo do mínimo (WCAG 2.2 AA). Nenhum par de texto dos componentes reprova: button (filled, outlined, ghost), accordion e toast ficam em 4,56:1 ou mais nos dois temas; dos 4 que reprovam, 1 é um reforço do toast, 1 é o foco do site e 2 são o selo do site (um par por tema). Varredura sistemática das 6 famílias de comportamento: 72 pares txtOn × surface e 72 pares txt × página, todos ≥ 4,5:1; palette/neutrals txtOn×surface: 126 pares, 0 abaixo de 4,5:1.
- **Alvos de toque:** 0 reprovações do WCAG 2.5.8 nas três densidades; os componentes medem 54, 46 e 44 px de altura (comfortable, standard, compact). A regra de 44 px está escrita no gerador (`scripts/lib/tokens-core.mjs:13`) e na página do button (`button.astro:75`) e confere com a medição.
- **Foco:** `:focus-visible` com anel de 2 px e afastamento de 2 px nas 30 paradas de Tab seguidas na página do button (25 elementos distintos, nenhum com `outline: none`), no site e nos componentes. Sticky header com `scroll-padding-top: 88px` (`site.css:8`).
- **Movimento:** com `prefers-reduced-motion: reduce`, button, accordion e toast medem `transition-duration: 0s` e `animation-name: none`; sem a redução, o botão transiciona em 0,1 s.
- **Hover só com mouse:** o `check-hover-media` cobre 22 de 22 casos sondados (seção 3.3); `KNOWN_EXCEPTIONS` está vazio.
- **Estados desabilitados:** botão (`:disabled`) e accordion (`aria-disabled`) não mudam de cor no hover nem no clique (medido: 4 de 4 iguais, nos dois temas); o accordion desabilitado continua focável e não alterna.
- **Teclado e ARIA:** Enter e Espaço alternam o accordion (`aria-expanded` e `hidden`); toast com `role="status"` ou `role="alert"` por tom e botão de fechar com `aria-label`; ícones com `aria-hidden`; alto contraste (`forced-colors`) tratado nos três componentes.
- **Estrutura do site:** `lang="pt-BR"`, um `h1` por página, link de pular, `main` com id, nenhum link sem texto, nenhum id duplicado, `viewport` sem bloqueio de zoom.
- **Pacote:** instalado a partir do tarball numa pasta limpa, os 10 subcaminhos testados resolvem; o wrapper `.uaiui` funciona como o README descreve (botão #057abd e 54 px dentro; sem estilo fora).
- **Pendência antiga resolvida pela sincronização:** `--text-field-input-font-size` e `--combobox-input-font-size` valem 1 rem na densidade compact (antes pendente: campos de 16 px).
- **Processo:** CI verde nos dois jobs, 59 testes no plugin, `check` de tokens, wrapper e hover.

## 2. Achados

Ordem: gravidade, depois área. Medições e tabelas de apoio na seção 3.

### K-01 · Alta · Tokens · esforço M: `active` significa duas coisas: "pressionado" na camada de interface e um nível intermediário na camada de comportamento

- **Evidência:** `tokens.css:56`: `--interface-function-primary-active-background: var(--marca-behavior-pressed-surface)`. `tokens.css:177`: `--marca-behavior-active-surface: var(--marca-palette-surface-60)` (tom claro, #65bcff no Claro). Níveis em `*-behavior-*`: lightest, active, normal, action, pressed, darkest; em `interface-function-*`: normal, action, active; em `ui-inverse-*`: action, active. `grep -- -active-` em `tokens.css` dá 74 variáveis: 24 são o nível claro da behavior; 50 são o estado pressionado (11 em `interface-function`, 2 em `ui-inverse` e 37 nos componentes, 5 deles nos CSS publicados). Usos fora dos arquivos gerados: `button.css:7,8,35,40,45,50`, `accordion.css:18`, `site.css:51,117`.
- **Impacto:** Quem lê `--marca-behavior-active-*` espera o estado pressionado e recebe um tom claro. Renomear depois que houver consumidores do pacote é quebra de API.
- **Recomendação:** Escolher um nome por significado (por exemplo `pressed` no estado e `tint` ou `soft` no nível claro da behavior), renomear no Figma, exportar com o CLI e atualizar os 9 pontos de CSS. Muda nomes de custom properties: versão minor (0.x) e aviso ao chat do Site.

### P-01 · Alta · Pacote · esforço G: O CSS de tokens ficou ~5× maior sem componente novo: 78% dos tokens não são usados

- **Evidência:** `tokens.css` 87.805 B (9.109 B gzip) e `tokens-wrapper.css` 76.463 B (8.067 B), contra 16.976 B e 15.164 B na 0.5.0 (PR #18). `node auditoria.mjs uso`: 209 de 970 tokens usados; um `tokens.css` só com eles teria 17.818 B (2.450 B gzip). O CSS do site buildado (`dist/_astro/DocsLayout.*.css`) foi de 60.902 B para 124.992 B.
- **Impacto:** Quem instala o pacote ou copia o `tokens.css` (como as páginas dos componentes mandam) baixa ~70 kB a mais para usar 3 componentes.
- **Recomendação:** Gerar CSS por camada ou por componente (por exemplo `tokens/base.css` + um arquivo por componente), ou uma opção do gerador para emitir só o que os componentes publicados usam. Decidir antes de a fase 2 acrescentar mais 19 componentes (389 tokens já estão no arquivo).

### A-01 · Média · Acessibilidade · esforço P: No celular, a barra lateral fechada continua na ordem de Tab e o foco some fora da tela

- **Evidência:** `site.css:131` fecha com `transform: translateX(-102%)` sem `visibility` nem `inert`. Chromium 390×844, Tab a partir do início: depois de Densidade o foco vai para Introdução, Tokens e temas, Accordion, Button e Toast com `x=-290` (fora da tela); `.sidebar` fica com `visibility: visible`, `inert: false`.
- **Impacto:** Quem navega por teclado, switch ou leitor de tela no celular ou tablet gasta 5 Tabs em links invisíveis (WCAG 2.4.3 e 2.4.7).
- **Recomendação:** `visibility: hidden` na barra fechada (com a transição de `visibility` junto da do `transform`) ou `inert` controlado por `site.ts:30-34`.

### A-02 · Média · Acessibilidade · esforço P: Rolagem horizontal em 320 px de largura em todas as páginas (WCAG 1.4.10 Reflow)

- **Evidência:** Chromium 320×568, 6 páginas: `scrollWidth` 381 contra `clientWidth` 320 em todas. O excesso vem de `.header-tools` (`site.css:34-38`, `134-139`: busca, Tema e Densidade em uma só linha). Em 1440 px: sem rolagem.
- **Impacto:** Em tela estreita ou com zoom de 400%, os seletores de tema e densidade ficam fora da área visível e a página rola na horizontal.
- **Recomendação:** Quebrar o cabeçalho em duas linhas abaixo de ~480 px ou mover Tema e Densidade para dentro do menu lateral.

### A-03 · Média · Acessibilidade · esforço P: O anel de foco do botão "Copiar" é invisível no tema Claro

- **Evidência:** `site.css:18` (anel `--ui-focus-ring`), `84` e `86` (botão sobre o bloco `#17100f`). No Claro o anel é #13191e sobre #17100f: 1,06:1 (mínimo 3:1, WCAG 1.4.11). No Escuro: 18,58:1. Conferido também por captura de tela (não incluída no repositório): sem anel visível ao redor do botão.
- **Impacto:** Em todos os blocos de código das páginas de componente, quem usa teclado no tema Claro não vê onde está o foco.
- **Recomendação:** No `.code`, usar um anel claro (por exemplo #f5ecee, o mesmo do botão) ou um token inverso (`--ui-inverse-*`).

### A-04 · Média · Acessibilidade · esforço P: Selo "novo" com texto de 11 px a 3,81:1

- **Evidência:** `site.css:52`: `color: #1a1818` sobre `--ui-brand-band` (#057abd): 3,81:1 nos dois temas (mínimo 4,5:1). axe-core 4.14.0 `color-contrast` (serious) em `/docs`, Claro e Escuro. O texto do logotipo (`site.css:27`) é isento (logotipo).
- **Impacto:** O selo na barra lateral (Toast) fica difícil de ler para baixa visão.
- **Recomendação:** Trocar a cor fixa por `--interface-function-primary-normal-txtOn` (#fdfdfd, 4,56:1 sobre o mesmo azul).

### A-05 · Média · Acessibilidade · esforço P: Comentários nos blocos de código a 3,9:1

- **Evidência:** `CodeBlock.astro:8` usa o tema Shiki `github-dark`; os comentários saem em #6a737d sobre #17100f: 3,9:1. axe-core `color-contrast` (serious) em `/docs/tokens`, `/docs/components/button` e `/docs/components/toast` (Claro e Escuro).
- **Impacto:** Os comentários do CSS copiável explicam o componente e ficam abaixo de 4,5:1.
- **Recomendação:** Tema Shiki próprio com comentário mais claro (#8b949e sobre #17100f dá 6,11:1) ou clarear só essa cor via CSS.

### F-01 · Média · Valores fixos · esforço M: O site afirma "só usa tokens" e tem 231 valores fixos

- **Evidência:** `site.css:1` ("Só usa tokens do UaiUI"). `node auditoria.mjs fixos`: em `site.css` 186 px, 14 famílias de fonte, 13 pesos, 9 cores, 4 rem/em, 3 `z-index`, 1 duração, 1 opacidade. 99 dos 188 `px` (site e componentes) têm o mesmo valor de um token de escala, borda, sombra ou foco; ex.: `16px`→`--size-scale-x4`, `12px`→`--size-scale-x3`, `4px`→`--size-scale-base`.
- **Impacto:** Trocar o tema ou a densidade não muda o site; o site não valida o sistema que documenta.
- **Recomendação:** Trocar os 99 que têm token; criar tokens de tipografia e espaçamento do site (não há escala tipográfica nos 970) ou reescrever o comentário.

### D-01 · Média · Documentação · esforço P: Frases desatualizadas depois da sincronização com o Figma

- **Evidência:** `tokens.astro:40`: "Só entram no arquivo os tokens que os componentes publicados usam" (hoje o arquivo tem 970 tokens e 1.894 variáveis). `tokens.astro:37` e `README.md:17`: "Até o export do Figma direto para JSON, edite os JSON no repositório" (o plugin e o CLI já exportam; edição à mão será sobrescrita). `README.md:69-71` e `tokens.astro:40`: "acrescente os tokens dele aos JSON" (os tokens de 19 componentes já existem).
- **Impacto:** Quem contribui edita o JSON à mão e perde a mudança na próxima sincronização; quem lê espera um CSS enxuto.
- **Recomendação:** Reescrever as três passagens: o Figma é a origem, `npm run export` (plugin/CLI) gera `tokens/` e CSS.

### D-02 · Média · Documentação · esforço P: As páginas de componente mandam copiar arquivos e não citam o pacote npm nem o wrapper

- **Evidência:** `button.astro:43-44`, `accordion.astro:45-46`, `toast.astro:58-59` ("Copie `src/styles/tokens.css`…"). O `README.md:22-60` documenta `npm i @uaiui/ds`, `tokens-wrapper.css` e `data-uaiui-*`. Teste de consumo (tarball instalado numa pasta limpa): os 10 subcaminhos testados (tokens, wrapper, 3 componentes, resolver e JSONs) resolvem; com `tokens-wrapper.css` dentro de `.uaiui` o botão sai com #057abd e 54 px, e fora do wrapper sem estilo (como o README diz).
- **Impacto:** Quem segue o site copia 87,8 kB de tokens (ver P-01) e perde o escopo do wrapper.
- **Recomendação:** Seção "Instalação" única: npm + wrapper primeiro, cópia como alternativa.

### K-02 · Média · Tokens · esforço M: Semântica/Negativa: 195 variáveis, todas #ffffff

- **Evidência:** Snapshot `real-sem-colisoes` (exportado em 2026-11-03T19:14Z): coleção Semântica com 195 variáveis COLOR e os modos Positiva (padrão) e Negativa; os 195 valores de Negativa são #ffffff; 194 dos de Positiva são aliases. `figma-plugin/figma.config.json:33` descreve o modo como placeholder e o plugin avisa em todo export.
- **Impacto:** No Figma, um quadro em modo Negativa fica branco em tudo (texto e fundo), sem erro. O CSS não tem tema "negativo", então o código e o Figma divergem nesse modo; quando alguém preencher o modo, o aviso passa a dizer "N valores diferem" e continua sem exportar. Decisão pendente: o modo é um tema futuro (exportar como contexto no resolver) ou deve sair do arquivo.
- **Recomendação:** Decidir: remover o modo, ou definir os valores e acrescentar o modificador ao resolver e à config do plugin.

### K-03 · Média · Tokens · esforço P: O botão ignora os 9 tokens de borda por estilo e estado do Figma

- **Evidência:** `button.css:9` usa `--button-border` (#13191e no Claro, #fcfeff no Escuro) para todos os tipos e estados. Os tokens `--interface-function-{primary,secondary,error}-{normal,action,active}-border` (Claro: #006097, #004772, #00304f, #43394e, #362c40, #292032, #b32708, #8a1800, #5d0e01) não são lidos por nenhum CSS.
- **Impacto:** Se o Figma desenha bordas coloridas por estilo e estado, o código desenha uma borda neutra: divergência visual a conferir no arquivo.
- **Recomendação:** Comparar com o Figma; se a borda colorida é a intenção, ler esses tokens no `button.css`; se não, remover os 9 do arquivo.

### K-04 · Média · Tokens · esforço G: 761 dos 970 tokens (78%) não são usados por nenhum componente nem pelo site

- **Evidência:** `node auditoria.mjs uso` (referências diretas em `src/**` + fecho por aliases). (a) usados: 209 (128 direto, 81 por alias). (b) sem CSS ainda: 389 tokens de 19 componentes (esperado; lista na seção 3.5). (c) órfãos prováveis: 20 (ver abaixo). Reserva de escala: 111 níveis de comportamento (error, success, warning, info, marca, apoio) e 241 primitivos. Total 209 + 389 + 20 + 111 + 241 = 970.
- **Impacto:** O grupo (b) é a tarefa da fase 2; o (c) é peso sem dono.
- **Recomendação:** Fase 2: criar o CSS dos 19 componentes (b). Para (c), decidir token a token (K-03, K-05 e a lista abaixo).

### P-04 · Média · Pacote · esforço M: O CI não builda o site, não testa acessibilidade e não testa o pacote instalado

- **Evidência:** `.github/workflows/ci.yml:29-31,46-49`: o job do pacote roda `npm ci`, `npm run check` e `npm pack --dry-run`; o do plugin roda testes, `tsc` e build. Não há `npm run build` do site, axe, teste de consumo do tarball (que fiz à mão: 10/10 subcaminhos) nem Node 22 (o `engines` aceita 22.12; o CI usa só 24.21.0). `.github/` só tem `workflows/`: sem Dependabot.
- **Impacto:** O CI atual fica verde com A-01 a A-06 e P-01 presentes.
- **Recomendação:** Acrescentar ao job do pacote: `npm run build`, axe sobre as 6 páginas (contraste e títulos) e um smoke de consumo do tarball.

### P-05 · Média · Pacote · esforço G: Nenhum teste automatizado dos componentes nem do site

- **Evidência:** Só checagens estáticas na raiz: `dtcg-to-css --check` (13 casos), `check-wrapper`, `check-hover-media` (24 casos), `astro check`. Os 59 testes do repositório são do plugin (`figma-plugin/test/`).
- **Impacto:** Contraste, alvos, foco, teclado e estados dos componentes só são conferidos por revisão.
- **Recomendação:** Playwright + axe no CI com os pares de contraste e os alvos desta auditoria como asserções.

### A-06 · Baixa · Acessibilidade · esforço P: Hierarquia de títulos: saltos e ordem no DOM

- **Evidência:** axe `heading-order` (moderate) em `/` (cards com `h3` logo após o `h1`, `index.astro:17`) e em `/docs/components/accordion` (itens do exemplo em `h3` logo após o `h1`, `accordion.astro:11`). Nas páginas de docs, os `h2` da barra lateral (`Sidebar.astro:9`) vêm antes do `h1` (ordem: h2 Começar, h2 Componentes, h1 …).
- **Impacto:** A navegação por títulos de leitores de tela começa por "Começar" e "Componentes" em vez do título da página.
- **Recomendação:** Cards da home em `h2`; exemplos do accordion sob um `h2` ("Exemplo"); títulos da barra lateral como `p`/`span` com `aria-label` no `nav`.

### A-07 · Baixa · Acessibilidade · esforço P: A navegação da documentação está num `aside`, não num `nav`

- **Evidência:** `Sidebar.astro:6`: `<aside class="sidebar" aria-label="Documentação">` com a lista de links. Landmarks medidos em `/docs`: header, nav[Principal], aside[Documentação], main, nav[Páginas…], nav[Nesta página].
- **Impacto:** Leitores de tela listam a navegação principal da documentação como "complementar".
- **Recomendação:** Trocar por `<nav aria-label="Documentação">` (dentro do `aside`, se quiser manter o complementar).

### A-08 · Baixa · Acessibilidade · esforço P: Busca: Esc em duas etapas, `aria-expanded` fixo e sem aviso de resultados

- **Evidência:** `Search.astro:9` fixa `aria-expanded="true"`; `#search-results` (`Search.astro:11`) não é região viva (medido: nenhum `aria-live`). Chromium: Esc com texto digitado só limpa o campo (`type=search`); o segundo fecha e o foco volta ao botão de busca. Ctrl+K abre o diálogo com o foco no campo, a filtragem e o `aria-activedescendant` funcionam; setas e Enter só por leitura de `site.ts:121-125`.
- **Impacto:** Quem usa leitor de tela não ouve a quantidade de resultados nem "Nada encontrado".
- **Recomendação:** `aria-expanded` conforme haja opções; `role="status"` com a contagem. Esc: documentar ou usar `type=text`. Firefox e Safari: não verificado.

### A-09 · Baixa · Acessibilidade · esforço P: Toast warning: barra lateral a 1,82:1 no Claro

- **Evidência:** `toast.css:15`; 1,82:1 contra o fundo do toast (mínimo 3:1 se fosse sinal único). A página já diz isso em `toast.astro:88`; o ícone (5,66:1) e a borda (3,13:1) carregam o sinal.
- **Impacto:** Nenhum: é reforço. Fica registrado porque é o único par de componente publicado abaixo de 3:1.
- **Recomendação:** Escurecer a barra do warning no Claro ou aceitar e manter a nota da página.

### A-10 · Baixa · Acessibilidade · esforço M: O site não trata alto contraste (`forced-colors`) nem `prefers-contrast`

- **Evidência:** `grep -c "forced-colors\|prefers-contrast" src/styles/site.css` = 0. Os três componentes tratam (`button.css:73,79`, `accordion.css:38,42`, `toast.css:32`).
- **Impacto:** No modo de alto contraste do Windows, o selo, a marca "U", a sombra dos exemplos e o bloco de código dependem do que o navegador força. Não verificado em alto contraste real.
- **Recomendação:** Regras `forced-colors` mínimas para `.brand__mark`, `.badge-novo`, `.code`, `.copy` e bordas dos exemplos.

### A-11 · Baixa · Acessibilidade · esforço P: Rótulos em inglês e atalho só com "Ctrl K" no site em pt-BR

- **Evidência:** `Header.astro:25` ("Comfortable", "Standard", "Compact"); `Header.astro:19` mostra "Ctrl K", enquanto `site.ts:119` aceita também ⌘.
- **Impacto:** Texto misturado para leitores de tela configurados em português; usuários de Mac veem um atalho que não é o deles.
- **Recomendação:** Traduzir (ou manter os nomes dos modos como tokens e explicar) e mostrar ⌘ K em Mac.

### A-12 · Baixa · Acessibilidade · esforço P: Controles do site abaixo de 44 px (recomendação AAA, não falha de AA)

- **Evidência:** Medido no Chromium (1440×900): busca 40 px de altura, selects 36, abas Preview/Código 36, "Copiar" 28, logotipo 32. Todos passam o WCAG 2.5.8 (24 px). A regra de 44 px do projeto (`scripts/lib/tokens-core.mjs:13-16,192-195` e `button.astro:75`) vale para os componentes, que ficam em 54/46/44.
- **Impacto:** Alvos menores para quem tem baixa destreza no toque.
- **Recomendação:** Opcional: usar `--button-min-height` nos controles do cabeçalho.

### I-01 · Baixa · Estados · esforço P: Regra morta de movimento reduzido em `.card`, e o card sobe sem transição

- **Evidência:** `site.css:104` (`.card:hover` com `transform`, sem `transition` em `.card`) e `site.css:143` (`@media (prefers-reduced-motion) { .sidebar, .card { transition: none } }`). Medido no Chromium: `transition-duration` de `.card` é 0s com e sem redução de movimento.
- **Impacto:** Nenhum efeito para quem usa. O card pula 2 px de uma vez.
- **Recomendação:** Dar `transition` ao `.card` (como o botão) ou remover `.card` da regra.

### I-02 · Baixa · Estados · esforço P: Controles próprios do site sem `:active`

- **Evidência:** `grep -c ":active" src/styles/site.css` = 0: `.tab`, `.search-btn`, `.copy`, selects, `.pager a` e `.card` não têm estado pressionado, ao contrário de button e accordion (`button.css:29`, `accordion.css:18`).
- **Impacto:** Inconsistência visual entre os componentes e o site.
- **Recomendação:** Usar os tokens `ghost-active` já usados em `site.css:51,117`.

### F-02 · Baixa · Valores fixos · esforço P: 6 valores fixos nos componentes

- **Evidência:** `button.css:27` (`translateY(-2px)`, elevação no hover) e `:29` (`translateY(1px)`, pressionado); `accordion.css:31` e `toast.css:20` (`font: 400`, não existe token de peso do corpo: só `--font-weight-label` 700); `toast.css:18` (`flex: 1 1 4rem`, mínimo do reflow, comentado em `toast.css:23-24`); `toast.css:28` (`opacity: 0` do keyframe).
- **Impacto:** Pequeno: não mudam por tema; `-2px` e `1px` não acompanham `--shadow-offset-component-hover`.
- **Recomendação:** Criar tokens de elevação/pressão e de peso do corpo no Figma, ou documentar como constantes.

### F-03 · Baixa · Valores fixos · esforço P: Favicon em rosa (#e7398a) com a marca azul (#057abd)

- **Evidência:** `DocsLayout.astro:28`: data URI com `%23e7398a` e `%231a1818`. `--ui-brand-band` resolve para #057abd (`tokens.css:36`, `marca-palette-surface-100`).
- **Impacto:** A aba do navegador mostra uma cor que o sistema não usa mais.
- **Recomendação:** Favicon com a cor atual (arquivo SVG gerado do token).

### F-04 · Baixa · Valores fixos · esforço P: Cores do bloco de código sem token (#17100f, #f5ecee, #ffcbdc)

- **Evidência:** `site.css:84,86,88`. Há 4 tokens inversos sem uso (`--ui-inverse-action-*` e `--ui-inverse-active-*`; Claro: #2a3136 e #434a50), de valores diferentes dos fixos.
- **Impacto:** O bloco de código não muda com o tema.
- **Recomendação:** Decidir se o bloco de código usa os tokens inversos (e revalidar A-03 e A-05).

### D-03 · Baixa · Documentação · esforço P: "Esc fecha o aviso com foco" não existe no exemplo

- **Evidência:** `toast.astro:81`; `site.ts:77-84` só trata clique em `[data-toast-close]`. Chromium: com foco no botão de fechar, Esc não fecha (`hidden` continua `false`).
- **Impacto:** Quem copia o comportamento do exemplo não ganha o Esc descrito.
- **Recomendação:** Implementar no exemplo ou marcar como requisito de quem integra.

### D-04 · Baixa · Documentação · esforço P: Números e versões pontuais

- **Evidência:** `README.md:30` usa `#v0.5.0` no exemplo (a versão é 0.6.0). `tokens.astro:17`: "nível (20 a 180)", mas neutrals e grayscale vão de 10 a 130. `tokens.astro:16`: Dimensões sem a tipografia (4 tokens `font-*`). `README.md:60` não cita o `check-hover-media`.
- **Impacto:** Pequeno.
- **Recomendação:** Corrigir os quatro trechos.

### D-05 · Baixa · Documentação · esforço P: `homepage` e `base` do Astro apontam para endereços diferentes

- **Evidência:** `package.json:11`: `https://lpereira.me/projetos/uaiui/`; `astro.config.mjs:4-6`: `site: https://lpereira.me`, `base: /uaiui` e o comentário "Publicado como subcaminho do portifa: https://lpereira.me/uaiui". `curl -L`: as duas URLs respondem 200; `/projetos/uaiui/` entrega uma página "Introdução · UaiUI DS" com `lang="pt"` (este repositório gera `lang="pt-BR"` e título "· UaiUI"), e `/uaiui/` entrega a home do Portifa.
- **Impacto:** Não sei qual build está publicada nem de onde (não verificado): pode haver um site em produção diferente deste código.
- **Recomendação:** Confirmar com o chat do Site onde e como o site é publicado e alinhar `homepage`, `base` e o comentário.

### K-05 · Baixa · Tokens · esforço P: 4 tokens de ícone do accordion nunca são lidos

- **Evidência:** `--accordion-header-{normal,action,active}-icon` e `--accordion-disabled-icon`. `accordion.css:21` pinta o chevron com `stroke: currentColor`. Os valores são iguais aos do texto (Claro: #13191e, #242121, #242121, #818181).
- **Impacto:** Nenhum hoje; se o Figma mudar a cor do ícone, o código não acompanha.
- **Recomendação:** Usar os tokens no `stroke` ou removê-los.

### P-02 · Baixa · Pacote · esforço P: `package-lock.json` com o nome antigo do pacote

- **Evidência:** `package-lock.json:2,8`: `"name": "uaiui-ds"`; `package.json:2`: `@uaiui/ds`. `npm install --package-lock-only` numa cópia reescreve as duas linhas.
- **Impacto:** O próximo `npm install` de quem tocar nas dependências gera um diff de lock sem relação com a mudança.
- **Recomendação:** Rodar `npm install --package-lock-only` e commitar.

### P-03 · Baixa · Pacote · esforço P: Campos do `package.json`

- **Evidência:** `sideEffects` ausente (sem o campo, bundlers assumem efeitos colaterais: é seguro, mas a intenção fica implícita); `engines.node >=22.12.0` (`package.json:24-26`) vale para um pacote que só entrega CSS e JSON e dá aviso `EBADENGINE` em quem usa Node mais antigo; `exports` sem entrada para `"."` (`import "@uaiui/ds"` falha com `ERR_PACKAGE_PATH_NOT_EXPORTED`, testado). `files` está certo: 18 arquivos, shasum `874244ab52ab3836a188c089a24fbb09305d6981`, 34,0 kB.
- **Impacto:** Pequeno.
- **Recomendação:** `"sideEffects": ["**/*.css"]`; mover `engines` para `devEngines` ou relaxar; decidir se `"."` deve existir.

### P-06 · Baixa · Pacote · esforço P: O build do site não é determinístico

- **Evidência:** `Example.astro:5` gera o `id` com `Math.random()`. Dois `astro build` seguidos: `diff -rq` aponta 3 arquivos diferentes (accordion, button e toast).
- **Impacto:** Ruído em diffs de `dist/` e cache; os ids também aparecem em `aria-controls`/`aria-labelledby`.
- **Recomendação:** Id derivado do título ou de um contador.

### P-07 · Baixa · Pacote · esforço M: O tema escuro sai duas vezes em `tokens.css`

- **Evidência:** O bloco `@media (prefers-color-scheme: dark)` repete o `:root[data-theme="dark"]`: 11.525 B (13,1% do arquivo), 288 variáveis (`node auditoria.mjs uso`).
- **Impacto:** Peso; é o preço de seguir o sistema sem JavaScript.
- **Recomendação:** Opcional: `color-scheme` + `light-dark()` ou aceitar o custo.

### P-08 · Baixa · Pacote · esforço P: O README do pacote é o do site

- **Evidência:** `README.md:1-11` ("Site de documentação do UaiUI (Astro)… `npm run dev`") vai no tarball (`npm pack`: `README.md`).
- **Impacto:** Quem abre a página do npm vê primeiro como rodar o site.
- **Recomendação:** Abrir com o uso como dependência (hoje `README.md:22`).

## 3. Medições

### 3.1 Contraste (WCAG 2.2: 4,5:1 para texto, 3:1 para componentes de interface e texto grande)

**Método.** `node auditoria.mjs contraste` (apêndice) lê o `src/styles/tokens.css` gerado, resolve cada cadeia de `var(--x)` até o hex em Claro e em Escuro (o escuro sobrepõe o `:root`) e calcula a razão de luminância relativa do WCAG 2.x. Pares: (A) todos os que `button.css`, `accordion.css`, `toast.css` e `site.css` usam de fato, com a origem em cada token (texto: 4,5:1; borda, ícone, barra e foco: 3:1); (B) varredura das 6 famílias × 6 níveis de comportamento: txtOn × surface, txt × página, border × página e surface × página; (C) txtOn-N × surface-N nas camadas palette e neutrals. Estados desabilitados são isentos (WCAG 1.4.3) e o texto do logotipo também. Fora do script: axe-core 4.14.0 no Chromium 156.0.8078.4 (tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa e best-practice) nas 6 páginas, em Claro e em Escuro.

**A. Pares usados pelos componentes e pelo site:** 104 medições, 4 abaixo do mínimo (WCAG 2.2 AA).

| Tema | Par usado que reprova | Razão | Mínimo | Achado |
|---|---|---:|---:|---|
| claro | toast warning: barra × fundo | 1,82 | 3 | A-09 |
| claro | foco do Copiar × bloco de código #17100f | 1,06 | 3 | A-03 |
| claro | site: selo "novo" #1a1818 × brand-band | 3,81 | 4,5 | A-04 |
| escuro | site: selo "novo" #1a1818 × brand-band | 3,81 | 4,5 | A-04 |

Mais próximos do limite, entre os aprovados (todos os pares de texto dos componentes têm ≥ 4,56:1; mínimo dos tons do toast nos dois temas: texto 16,36:1, ícone 5,66:1, borda 3,13:1, o que confere com o que `toast.astro:88` afirma):

| Tema | Par | Razão | Mínimo |
|---|---|---:|---:|
| claro | button filled primary normal | 4,56 | 4,5 |
| escuro | button filled primary normal | 4,56 | 4,5 |
| claro | toast warning: borda × página | 3,13 | 3 |
| escuro | button filled secondary action | 4,70 | 4,5 |
| claro | button filled danger normal | 4,77 | 4,5 |
| escuro | button filled danger normal | 4,77 | 4,5 |
| escuro | button filled primary action | 5,25 | 4,5 |
| escuro | toast info: barra × fundo | 3,65 | 3 |

**B. Varredura sistemática das famílias de comportamento:** 288 pares (6 famílias × 6 níveis × 2 temas × 4 tipos de par): txtOn × surface 0 de 72 abaixo de 4,5:1; txt × página 0 de 72 abaixo de 4,5:1; border × página 22 de 72 abaixo de 3:1; surface × página 26 de 72 abaixo de 3:1. Nenhum par de texto reprova; os 48 abaixo de 3:1 são bordas e fundos dos níveis `lightest` e `active` contra a página, usados como tinta e não como único limite de um controle. Nenhum deles é usado por componente publicado (o botão secondary em Escuro usa `apoio normal`, surface × página 2,03:1; a borda do botão, #fcfeff a 17,5:1, identifica o controle, então o WCAG 1.4.11 é atendido). Lista completa dos 48 pares:

| Tema | Família | Nível | Par | Razão | Mínimo |
|---|---|---|---|---:|---:|
| claro | error | lightest | border × página | 1,35 | 3 |
| claro | error | lightest | surface × página | 1,07 | 3 |
| claro | error | active | border × página | 2,82 | 3 |
| claro | error | active | surface × página | 1,85 | 3 |
| claro | success | lightest | border × página | 1,28 | 3 |
| claro | success | lightest | surface × página | 1,06 | 3 |
| claro | success | active | border × página | 2,50 | 3 |
| claro | success | active | surface × página | 1,68 | 3 |
| claro | warning | lightest | border × página | 1,20 | 3 |
| claro | warning | lightest | surface × página | 1,06 | 3 |
| claro | warning | normal | surface × página | 1,94 | 3 |
| claro | warning | active | border × página | 1,64 | 3 |
| claro | warning | active | surface × página | 1,38 | 3 |
| claro | info | lightest | border × página | 1,29 | 3 |
| claro | info | lightest | surface × página | 1,06 | 3 |
| claro | info | active | border × página | 2,63 | 3 |
| claro | info | active | surface × página | 1,71 | 3 |
| claro | marca | lightest | border × página | 1,44 | 3 |
| claro | marca | lightest | surface × página | 1,05 | 3 |
| claro | marca | active | border × página | 2,99 | 3 |
| claro | marca | active | surface × página | 2,04 | 3 |
| claro | apoio | lightest | border × página | 1,64 | 3 |
| claro | apoio | lightest | surface × página | 1,05 | 3 |
| claro | apoio | active | surface × página | 2,70 | 3 |
| escuro | error | lightest | border × página | 1,29 | 3 |
| escuro | error | lightest | surface × página | 1,02 | 3 |
| escuro | error | active | border × página | 2,71 | 3 |
| escuro | error | active | surface × página | 1,86 | 3 |
| escuro | success | lightest | border × página | 1,33 | 3 |
| escuro | success | lightest | surface × página | 1,01 | 3 |
| escuro | success | active | border × página | 2,73 | 3 |
| escuro | success | active | surface × página | 1,94 | 3 |
| escuro | warning | lightest | border × página | 1,67 | 3 |
| escuro | warning | lightest | surface × página | 1,07 | 3 |
| escuro | warning | active | surface × página | 2,90 | 3 |
| escuro | info | lightest | border × página | 1,34 | 3 |
| escuro | info | lightest | surface × página | 1,00 | 3 |
| escuro | info | active | border × página | 2,72 | 3 |
| escuro | info | active | surface × página | 1,92 | 3 |
| escuro | marca | lightest | border × página | 1,29 | 3 |
| escuro | marca | lightest | surface × página | 1,00 | 3 |
| escuro | marca | active | border × página | 2,63 | 3 |
| escuro | marca | active | surface × página | 1,81 | 3 |
| escuro | apoio | lightest | border × página | 1,13 | 3 |
| escuro | apoio | lightest | surface × página | 1,01 | 3 |
| escuro | apoio | normal | surface × página | 2,03 | 3 |
| escuro | apoio | active | border × página | 1,63 | 3 |
| escuro | apoio | active | surface × página | 1,35 | 3 |

**C. Camadas palette e neutrals:** palette/neutrals txtOn×surface: 126 pares, 0 abaixo de 4,5:1.

### 3.2 Alvos de toque (WCAG 2.2 SC 2.5.8 Target Size (Minimum), AA)

Critério: o alvo passa se um quadrado de 24 × 24 px CSS cabe inteiro nele. Antes de reprovar, aplico as exceções: (a) espaçamento (círculo de 24 px centrado no alvo não toca outro alvo nem o círculo de outro alvo pequeno), (b) equivalente, (c) em linha, (d) controle do navegador sem estilo, (e) essencial. Fonte: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html. O 44 px (SC 2.5.5, AAA) entra só como recomendação.

**Método.** Chromium 156.0.8078.4 com o `dist/` servido em `/uaiui`; para cada página (6) e densidade (3), todos os `a[href]`, `button`, `input`, `select`, `textarea`, `summary`, `[role=tab]`, `[role=button]` e `[tabindex]` visíveis foram medidos com `getBoundingClientRect` (desktop 1440×900; celular 390×844 com o menu fechado e aberto nas páginas do button e do toast). Pelo mesmo método, o link de pular é medido com o foco. Total: 30 conjuntos de medição (939 alvos medidos).

**Resultado:** 0 alvos reprovados em qualquer densidade, página ou viewport. Dos 939 alvos, 33 ficam abaixo de 24 px (em 24 dos 30 conjuntos) e todos são links no meio de frases, com 21 px de altura ("Design Tokens 2025.10", "Tokens e temas", "button"). Todos passam pela exceção (a) espaçamento, e, pela leitura do HTML (`<li>` com texto ao redor), também são alvos em linha (c).

| Alvo (tamanho resolvido, largura × altura) | comfortable | standard | compact | AA 24 px | Recomendação 44 px |
|---|---:|---:|---:|---|---|
| `.uai-button` filled (menor largura medida) | 136 × 54 | 103,2 × 46 | 94,8 × 44 | passa | passa |
| `.uai-button` outlined | 148 × 54 | 112,8 × 46 | 103,2 × 44 | passa | passa |
| `.uai-button` ghost | 64 × 54 | 52 × 46 | 46 × 44 | passa | passa |
| `.uai-icon-button` (e botão de menu) | 54 × 54 | 46 × 46 | 44 × 44 | passa | passa |
| `.uai-accordion-trigger` | 764 × 54 | 764 × 46 | 764 × 44 | passa | passa |
| Link de pular (`.skip`, com foco) | 304 × 54 | 237,6 × 46 | 212,4 × 44 | passa | passa |
| Busca `.search-btn` | 295,2 × 40 | igual | igual | passa | não (A-12) |
| `select` Tema e Densidade | 92 × 36 | igual | igual | passa | não (A-12) |
| Abas `.tab` (Preview, Código) | 80,8 × 36 | igual | igual | passa | não (A-12) |
| Logotipo `.brand` | 104 × 32 | igual | igual | passa | não (A-12) |
| Botão "Copiar" `.copy` | 67,2 × 28 | igual | igual | passa | não (A-12) |
| Links em frases | ≥ 50,2 × 21 | igual | igual | exceção (a) e (c) | não se aplica |

Um botão de qualquer rótulo passa em largura: `2 × padding-x + 2 × borda` = 52 px (comfortable) e 36 px (standard e compact), antes de contar o texto. As larguras acima são as menores medidas nos exemplos. O 44 px de altura vem do `max(44px, …)` que o gerador emite para os 7 tokens de alvo de toque (`tokens-core.mjs:15-16,192-195`); não há regra de 44 px escrita fora desses dois lugares (nem no README nem no CLAUDE.md).

### 3.3 Estados de interação

**`check-hover-media` cobre todos os casos de `:hover`?** Sim, para CSS do repositório. Sondei `unprotectedHoverSelectors` com 22 casos e a saída bateu com o esperado nos 22: `:hover` solto (viola); em `@media (hover: hover)`, também com `screen and`, `and (pointer: fine)` e aninhado em outra `@media` ou `@supports` (passa); `@media (any-hover: hover)`, `(hover: none)`, `not all and (hover: hover)`, `(hover: hover), print`, `(hover: hover) or …`, `and (not …)`, `(pointer: fine)` sozinho, `@container` e `@layer` sem a guarda (viola); `:is()`, `:not()` e `&:hover` aninhado (tratados); `:hover` dentro de string (ignorado). O autoteste do próprio script tem 24 casos. Limites: lê só `src/` (`.css` e blocos `<style>` de `.astro`), não vê `style=""` nem hover feito por JavaScript (`site.ts` não usa), e não procura `:focus-within` ou `:active` pegajoso (não se aplicam).

| Estado | button | accordion | toast | site (`site.css`) |
|---|---|---|---|---|
| `:hover` | só em `@media (hover: hover)` (`button.css:26-28,54-56`) | idem (`accordion.css:15-17`) | usa o do button | idem (`site.css:14,30,48,67,87,103`) |
| `:focus-visible` | `button.css:30` | `accordion.css:19` | usa o do button | global `site.css:18` |
| `:active` | `button.css:29`, ghost sem sombra | `accordion.css:18` | usa o do button | nenhum (I-02) |
| desabilitado | `:disabled` e `[aria-disabled]` (`button.css:58-62`) | `[aria-disabled]` (`accordion.css:23-26`); continua focável | n/a | n/a |
| movimento reduzido | `button.css:70` | `accordion.css:35` | `toast.css:29` | `site.css:143` (regra do `.card` sem efeito: I-01) |
| alto contraste | `button.css:73-87` | `accordion.css:38-48` | `toast.css:32-36` | não trata (A-10) |

Medido no Chromium: o anel de foco é `solid 2px`, afastamento `2px`, nas 30 paradas de Tab; botão e accordion desabilitados mantêm cor, sombra e `transform` no hover e no clique (Claro e Escuro).

### 3.4 Valores fixos no lugar de tokens

**Método.** `node auditoria.mjs fixos` (apêndice) varre `button.css`, `accordion.css`, `toast.css`, `site.css` e `DocsLayout.astro` (os outros `.astro` e o `site.ts` não têm cores nem medidas fixas além do que a tabela conta): comentários e `var(--…)` são removidos, e o que sobra é contado por tipo. Resultado:

```
px com valor igual ao de um token de escala/borda/sombra/foco: 99 de 188
componentes | px: 2 → src/styles/components/button.css:27 -2px; src/styles/components/button.css:29 1px
componentes | peso: 2 → src/styles/components/accordion.css:31 font: 400; src/styles/components/toast.css:20 font: 400
componentes | rem/em: 1 → src/styles/components/toast.css:18 4rem
componentes | opacidade: 1 → src/styles/components/toast.css:28 opacity: 0
site.css | px: 186
site.css | peso: 13
site.css | família: 14
site.css | rem/em: 4
site.css | z-index: 3
site.css | cor: 9
site.css | opacidade: 1
site.css | ms/s: 1
DocsLayout.astro | cor: 2
```

Candidatos de token (mesmo valor resolvido): `16px`→`--size-scale-x4` (19×), `12px`→`--size-scale-x3` (18×), `8px`→`--size-scale-x2` (17×), `24px`→`--size-scale-x6` (13×), `4px`→`--size-scale-base` ou `--shadow-offset-layout` (10×), `2px`→`--border-width-default`, `--size-scale-half` ou `--focus-ring-width` (4×), `100ms`→`--motion-duration-press` (`site.css:131`), `"DM Sans"`→`--font-family-body` e `"JetBrains Mono"`→`--font-family-label` (14×), `700`→`--font-weight-label`, sombras `2px 2px 0` e `4px 4px 0` → `--shadow-offset-component` e `--shadow-offset-layout` (`site.css:27,66,74,90,102`). Sem token nos 970: 6, 10, 14, 20, 32, 48, 64, 96 px, tamanhos de fonte do site, `z-index` (`site.css:20,24,131`), `rgb(0 0 0 / 0.5)` do backdrop (`site.css:113`), opacidade `.75` (`site.css:118`), as cores do bloco de código e o favicon. Detalhe dos componentes em F-02; do site em F-01, F-03 e F-04.

### 3.5 Saúde dos tokens

**Método.** `node auditoria.mjs uso`: os 970 tokens vêm de `tokens/*.json` (nome CSS = id com `-`); "usado" é qualquer `--nome` citado em `src/**` (componentes, `site.css`, `.astro`, `.ts`, fora dos CSS gerados) mais tudo que esses tokens alcançam por alias (`var()` em qualquer bloco de tema ou densidade).

```
total 970; usados 209; não usados 761
Escala: 8 / usados 6
Dimensões: 14 / usados 13
Primitivos: 288 / usados 47
Semântica: 195 / usados 71
Componente: 291 / usados 42
Densidade: 174 / usados 30
(b) sem CSS: 389 tokens em 19 grupos; usados: 0
(c1) componentes com CSS, token nunca usado: --accordion-header-normal-icon --accordion-header-action-icon --accordion-header-active-icon --accordion-disabled-icon
(c2) fora de componentes, não usados: 368
tokens.css só com os usados: 17818 B / 2450 B gzip (completo: 87805 B)
```

Na saída, `(c1)` são os 4 tokens do accordion e `(c2)` os 368 tokens fora de componentes: 16 deles (9 bordas, 4 inversos, `shadow-offset-pressed` e as 2 escalas) somam com os 4 do `(c1)` os 20 órfãos prováveis abaixo; os outros 352 são a reserva de escala (111 de comportamento e 241 primitivos).

| Coleção | Tokens | Usados | Não usados |
|---|---:|---:|---:|
| Escala | 8 | 6 | 2 |
| Dimensões | 14 | 13 | 1 |
| Primitivos | 288 | 47 | 241 |
| Semântica | 195 | 71 | 124 |
| Componente | 291 | 42 | 249 |
| Densidade | 174 | 30 | 144 |
| **Total** | **970** | **209** | **761** |

**Os três grupos pedidos:**

- **(a) Usados:** 209 (128 por referência direta, 81 só por alias).
- **(b) Componentes com token e sem CSS ainda (esperado):** 389 tokens (245 em Componente e 144 em Densidade) em 19 componentes, nenhum alcançado por componente publicado. É o trabalho da fase 2.

| Componente | Tokens em Componente | Tokens em Densidade | Total |
|---|---:|---:|---:|
| badge | 13 | 5 | 18 |
| checkbox | 20 | 12 | 32 |
| chip | 23 | 7 | 30 |
| chip-removable | 13 | 7 | 20 |
| combobox | 20 | 14 | 34 |
| combobox-option | 22 | 9 | 31 |
| dropdown-menu | 4 | 2 | 6 |
| menu-item | 18 | 8 | 26 |
| modal | 7 | 8 | 15 |
| popover | 5 | 9 | 14 |
| progress-indicator | 0 | 1 | 1 |
| progress-step | 14 | 9 | 23 |
| radio | 20 | 12 | 32 |
| slider | 18 | 11 | 29 |
| tag | 3 | 4 | 7 |
| text-field | 14 | 12 | 26 |
| toggle | 21 | 8 | 29 |
| toggle-button | 8 | 0 | 8 |
| tooltip | 2 | 6 | 8 |
| **Total** | **245** | **144** | **389** |

- **(c) Órfãos prováveis (20):** não são de componente sem CSS, ninguém os usa e a estrutura do Figma sugere que deveriam ser usados:
  - `--accordion-header-normal-icon`, `--accordion-header-action-icon`, `--accordion-header-active-icon`, `--accordion-disabled-icon` (K-05);
  - os 9 `--interface-function-{primary,secondary,error}-{normal,action,active}-border` (K-03);
  - `--ui-inverse-action-surface`, `--ui-inverse-action-txtOn`, `--ui-inverse-active-surface`, `--ui-inverse-active-txtOn` (F-04);
  - `--shadow-offset-pressed` (valor 0; o `translateY(1px)` do pressionado é fixo, F-02);
  - `--size-scale-none` e `--size-scale-half` (escala base sem uso).
- **Reserva de escala, fora de (c):** 111 tokens de nível de comportamento (error 15, success 20, warning 20, info 20, marca 18, apoio 18) e 241 primitivos (paletas). São a régua da qual os componentes futuros vão tirar tokens; não os trato como órfãos.

**Nomes fora do padrão.** (1) `active`: ver K-01. (2) `hover` é `action` em todo o sistema (`…-action-…`, página do button chama de "hover"): consistente, mas não óbvio. (3) Mistura de camelCase e kebab (`txtOn`) nas custom properties (`--button-outlined-normal-txtOn`): funciona, é só estilo. (4) `interface.function` como nome do grupo semântico dos botões.

**Semântica/Negativa.** Ver K-02: 195 variáveis, valores #ffffff, não exportadas; o plugin avisa em todo export e `figma.config.json:33` registra o motivo. Impacto prático no código: nenhum (o CSS nunca viu esse modo). No Figma: telas em modo Negativa ficam brancas. A decisão (remover o modo ou definir o tema) bloqueia qualquer tema "negativo" no código.

### 3.6 Pacote e repositório

| Item | Situação | Evidência |
|---|---|---|
| `files` | `src/styles/tokens.css`, `tokens-wrapper.css`, `components/`, `tokens/`, `LICENSE` (+ README e package.json automáticos) | `npm pack --dry-run`: 18 arquivos, 34,0 kB, shasum `874244ab52ab3836a188c089a24fbb09305d6981` |
| `exports` | 5 CSS + resolver + `./tokens/*` + `./package.json`; sem `"."` | 10 de 10 subcaminhos testados resolvem; `@uaiui/ds` e `components/modal.css` falham com `ERR_PACKAGE_PATH_NOT_EXPORTED` |
| `engines` | `node >=22.12.0` | `package.json:24-26` (P-03) |
| `sideEffects` | ausente | `package.json` (P-03) |
| Peso | `tokens.css` 87.805 B / 9.109 B gzip; wrapper 76.463 B / 8.067 B; só os tokens usados: 17.818 B / 2.450 B | `node auditoria.mjs uso` (P-01) |
| Nome no lock | `uaiui-ds` ≠ `@uaiui/ds` | `package-lock.json:2,8` (P-02) |
| CI | 2 jobs; sem build do site, axe, smoke do tarball, Node 22, Dependabot | `.github/workflows/ci.yml` (P-04) |
| Testes | 59 do plugin; 0 dos componentes e do site | (P-05) |

## 4. Tokens usados por componente (para comparar com o Figma)

Cada tabela lista as `var(--…)` que o CSS publicado do componente lê (`src/styles/components/<arquivo>`), com a(s) linha(s) onde aparece e o valor resolvido: Claro e comfortable na primeira coluna; as outras colunas só mostram o valor quando muda (`=` quer dizer igual ao da primeira). O script é `tables` (resolve com a mesma função do apêndice). Tokens do Figma que existem para o componente e o CSS não lê: accordion: 4 (`…-icon`, K-05); button: `--interface-function-*-border` (9, K-03). O `icon-button` está no `button.css`; o toast reusa `button` e `icon-button`.

### button + icon-button (button.css): 57 tokens

| Token | Linhas | Claro / comfortable | Escuro | Standard | Compact |
|---|---|---|---|---|---|
| `--interface-function-primary-normal-background` | 3 | #057abd | = | = | = |
| `--interface-function-primary-normal-txtOn` | 4 | #fdfdfd | = | = | = |
| `--interface-function-primary-action-background` | 5 | #006097 | #4e9ad5 | = | = |
| `--interface-function-primary-action-txtOn` | 6 | #fdfdfd | #242121 | = | = |
| `--interface-function-primary-active-background` | 7 | #004772 | #6fbcf8 | = | = |
| `--interface-function-primary-active-txtOn` | 8 | #fdfdfd | #242121 | = | = |
| `--button-border` | 9 | #13191e | #fcfeff | = | = |
| `--button-gap` | 12 | 0.75rem | = | = | 0.5rem |
| `--button-min-height` | 13, 52 | max(44px, 3.375rem) | = | max(44px, 2.875rem) | max(44px, var(--size-scale-x11)) |
| `--button-padding-y` | 14 | 0.75rem | = | 0.5rem | 0.5rem |
| `--button-padding-x` | 14 | 1.5rem | = | 1rem | 1rem |
| `--border-width-default` | 15 | 2px | = | = | = |
| `--radius-control` | 16 | 0 | = | = | = |
| `--shadow-offset-component` | 18 | 2px | = | = | = |
| `--button-shadow-color` | 18, 27 | #13191e | #fcfeff | = | = |
| `--font-weight-label` | 19 | 700 | = | = | = |
| `--button-label-font-size` | 19 | 1.25rem | = | 1rem | 0.875rem |
| `--button-label-line-height` | 19 | 1.5rem | = | 1.25rem | 1.0625rem |
| `--font-family-label` | 19 | "JetBrains Mono" | = | = | = |
| `--font-transform-label` | 20 | uppercase | = | = | = |
| `--motion-duration-press` | 23 | 100ms | = | = | = |
| `--button-icon-size` | 25 | 1.5rem | = | = | 1.25rem |
| `--shadow-offset-component-hover` | 27 | 4px | = | = | = |
| `--focus-ring-width` | 30, 84 | 2px | = | = | = |
| `--ui-focus-ring` | 30 | #13191e | #fcfeff | = | = |
| `--focus-ring-offset` | 30, 84 | 2px | = | = | = |
| `--interface-function-secondary-normal-background` | 33 | #51475c | = | = | = |
| `--interface-function-secondary-normal-txtOn` | 33 | #fdfdfd | = | = | = |
| `--interface-function-secondary-action-background` | 34 | #43394e | #786f82 | = | = |
| `--interface-function-secondary-action-txtOn` | 34 | #fdfdfd | = | = | = |
| `--interface-function-secondary-active-background` | 35 | #362c40 | #a399ad | = | = |
| `--interface-function-secondary-active-txtOn` | 35 | #fdfdfd | #242121 | = | = |
| `--interface-function-error-normal-background` | 38 | #d82f06 | = | = | = |
| `--interface-function-error-normal-txtOn` | 38 | #fdfdfd | = | = | = |
| `--interface-function-error-action-background` | 39 | #b32708 | #f37257 | = | = |
| `--interface-function-error-action-txtOn` | 39 | #fdfdfd | #242121 | = | = |
| `--interface-function-error-active-background` | 40 | #8a1800 | #faa998 | = | = |
| `--interface-function-error-active-txtOn` | 40 | #fdfdfd | #242121 | = | = |
| `--button-outlined-normal-background` | 43 | #fcfeff | #14191d | = | = |
| `--button-outlined-normal-txtOn` | 43 | #13191e | #fcfeff | = | = |
| `--button-outlined-action-background` | 44 | #b1dbff | #00304f | = | = |
| `--button-outlined-action-txtOn` | 44 | #242121 | #fdfdfd | = | = |
| `--button-outlined-active-background` | 45 | #65bcff | #004772 | = | = |
| `--button-outlined-active-txtOn` | 45 | #242121 | #fdfdfd | = | = |
| `--interface-function-ghost-normal-background` | 48 | transparent | = | = | = |
| `--interface-function-ghost-normal-txtOn` | 48 | #13191e | #fcfeff | = | = |
| `--interface-function-ghost-action-background` | 49 | #b1dbff | #00304f | = | = |
| `--interface-function-ghost-action-txtOn` | 49 | #242121 | #fdfdfd | = | = |
| `--interface-function-ghost-active-background` | 50 | #65bcff | #004772 | = | = |
| `--interface-function-ghost-active-txtOn` | 50 | #242121 | #fdfdfd | = | = |
| `--button-ghost-padding-x` | 51 | 0 | = | = | = |
| `--interface-function-disabled-normal-background` | 59 | #fdfdfd | #181818 | = | = |
| `--interface-function-disabled-normal-txtOn` | 59 | #818181 | = | = | = |
| `--interface-function-disabled-normal-border` | 60 | #dddddd | #303030 | = | = |
| `--icon-button-size` | 67 | max(44px, 3.375rem) | = | max(44px, 2.875rem) | max(44px, var(--size-scale-x11)) |
| `--icon-button-icon-size` | 69 | 1.5rem | = | = | 1.25rem |
| `--icon-button-icon-weight` | 69 | 3px | = | = | 2px |

### accordion (accordion.css): 34 tokens

| Token | Linhas | Claro / comfortable | Escuro | Standard | Compact |
|---|---|---|---|---|---|
| `--accordion-header-gap` | 6 | 0.75rem | = | = | 0.5rem |
| `--accordion-header-min-height` | 6 | max(44px, 3.375rem) | = | max(44px, 2.875rem) | max(44px, var(--size-scale-x11)) |
| `--accordion-header-padding-x` | 7 | 1.5rem | = | 1rem | 1rem |
| `--border-width-default` | 8, 29 | 2px | = | = | = |
| `--accordion-border` | 8, 29 | #13191e | #fcfeff | = | = |
| `--radius-control` | 8 | 0 | = | = | = |
| `--accordion-header-normal-background` | 9 | #fcfeff | #14191d | = | = |
| `--accordion-header-normal-txtOn` | 9 | #13191e | #fcfeff | = | = |
| `--font-weight-label` | 10 | 700 | = | = | = |
| `--accordion-title-font-size` | 10 | 1rem | = | = | 0.875rem |
| `--accordion-title-line-height` | 10 | 1.5rem | = | = | 1.25rem |
| `--font-family-label` | 10 | "JetBrains Mono" | = | = | = |
| `--font-transform-label` | 11 | uppercase | = | = | = |
| `--motion-duration-press` | 13 | 100ms | = | = | = |
| `--accordion-header-action-background` | 16 | #b1dbff | #00304f | = | = |
| `--accordion-header-action-txtOn` | 16 | #242121 | #fdfdfd | = | = |
| `--accordion-header-active-background` | 18 | #65bcff | #004772 | = | = |
| `--accordion-header-active-txtOn` | 18 | #242121 | #fdfdfd | = | = |
| `--focus-ring-width` | 19, 46 | 2px | = | = | = |
| `--ui-focus-ring` | 19 | #13191e | #fcfeff | = | = |
| `--focus-ring-offset` | 19, 46 | 2px | = | = | = |
| `--accordion-icon-size` | 21 | 1.5rem | = | = | 1.25rem |
| `--accordion-chevron-weight` | 21 | 3px | = | = | 2px |
| `--accordion-disabled-background` | 24 | #fdfdfd | #181818 | = | = |
| `--accordion-disabled-txtOn` | 24 | #818181 | = | = | = |
| `--accordion-disabled-border` | 25 | #dddddd | #303030 | = | = |
| `--accordion-panel-padding-y` | 28 | 1rem | = | = | 0.75rem |
| `--accordion-panel-padding-x` | 28 | 1.5rem | = | 1rem | 1rem |
| `--accordion-panel-background` | 30 | #fcfeff | #14191d | = | = |
| `--accordion-panel-txt` | 30 | #13191e | #fcfeff | = | = |
| `--accordion-panel-font-size` | 31 | 1rem | = | = | 0.875rem |
| `--accordion-panel-line-height` | 31 | 1.5rem | = | = | 1.25rem |
| `--font-family-body` | 31 | "DM Sans" | = | = | = |
| `--size-scale-x3` | 34 | 0.75rem | = | = | = |

### toast (toast.css): 40 tokens

| Token | Linhas | Claro / comfortable | Escuro | Standard | Compact |
|---|---|---|---|---|---|
| `--toast-neutral-background` | 3 | #fcfeff | #14191d | = | = |
| `--toast-neutral-border` | 3 | #13191e | #fcfeff | = | = |
| `--toast-neutral-bar` | 4 | #13191e | #fcfeff | = | = |
| `--toast-neutral-icon` | 4 | #13191e | #fcfeff | = | = |
| `--toast-width` | 5 | 25rem | = | 20.5rem | 18.5rem |
| `--toast-txtOn` | 6 | #13191e | #fcfeff | = | = |
| `--border-width-default` | 7 | 2px | = | = | = |
| `--radius-control` | 7 | 0 | = | = | = |
| `--shadow-offset-layout` | 8 | 4px | = | = | = |
| `--toast-shadow-color` | 8 | #13191e | #fcfeff | = | = |
| `--motion-duration-press` | 9 | 100ms | = | = | = |
| `--toast-success-background` | 11 | #f2f9f4 | #001f0b | = | = |
| `--toast-success-border` | 11 | #026d36 | #5ab576 | = | = |
| `--toast-success-bar` | 11 | #0c8544 | = | = | = |
| `--toast-success-icon` | 11 | #045428 | #9fd3ac | = | = |
| `--toast-warning-background` | 12 | #faf6ef | #2b1c00 | = | = |
| `--toast-warning-border` | 12 | #bd870d | #f8c05a | = | = |
| `--toast-warning-bar` | 12 | #f0ad11 | = | = | = |
| `--toast-warning-icon` | 12 | #825b02 | #f7d69e | = | = |
| `--toast-error-background` | 13 | #fff4f2 | #340400 | = | = |
| `--toast-error-border` | 13 | #b32708 | #f37257 | = | = |
| `--toast-error-bar` | 13 | #d82f06 | = | = | = |
| `--toast-error-icon` | 13 | #8a1800 | #faa998 | = | = |
| `--toast-info-background` | 14 | #f2f7fe | #001932 | = | = |
| `--toast-info-border` | 14 | #0660a5 | #51a3f3 | = | = |
| `--toast-info-bar` | 14 | #0274c7 | = | = | = |
| `--toast-info-icon` | 14 | #024981 | #9ac9fa | = | = |
| `--toast-bar-width` | 15 | 0.5rem | = | = | = |
| `--toast-gap` | 16 | 0.75rem | = | = | 0.5rem |
| `--toast-padding` | 16 | 1rem | = | = | 0.75rem |
| `--toast-icon-size` | 17 | 1.5rem | = | = | 1.25rem |
| `--toast-icon-weight` | 17 | 3px | = | = | 2px |
| `--toast-content-gap` | 18 | 0.25rem | = | = | = |
| `--font-weight-label` | 19 | 700 | = | = | = |
| `--toast-font-size` | 19, 20 | 1rem | = | 0.875rem | 0.875rem |
| `--toast-line-height` | 19, 20 | 1.5rem | = | 1.25rem | 1.25rem |
| `--font-family-label` | 19 | "JetBrains Mono" | = | = | = |
| `--font-transform-label` | 19 | uppercase | = | = | = |
| `--font-family-body` | 20 | "DM Sans" | = | = | = |
| `--size-scale-base` | 21 | 0.25rem | = | = | = |

## 5. Fora do escopo e não verificado

### Fora do escopo (registrado, não corrigido)

- Plugin do Figma (`figma-plugin/`): a ordem da tela (Avisos acima do Resumo) difere da ordem do relatório da PR; o texto do `ignoreModes` fala de placeholders mesmo quando o modo tem valores diferentes; o suporte a `$root` do DTCG, que permitiria nomes que são token e grupo, continua como melhoria futura.
- O Portifa (site em outro repositório) ainda pode usar a densidade antiga "mobile"/"desktop" e fixar uma versão antiga do pacote; não olhei esse repositório.
- A fixture `real.snapshot.json` (6 colisões) é histórica e só serve de teste do aviso.

### Não verificado (e por quê)

- **Figma:** não acessei o arquivo, como pedido; as tabelas da seção 4 são para a comparação do seu lado.
- **Leitor de tela real** (NVDA, JAWS, VoiceOver, TalkBack): só a árvore de acessibilidade e os atributos ARIA; não ouvi a fala. A-08 e os anúncios do toast dependem disso.
- **Outros navegadores e aparelhos:** só Chromium 156.0.8078.4. Firefox, Safari, toque real, alto contraste real do Windows (`forced-colors`) e zoom de 400% não foram testados (o reflow foi testado em 320 px de largura).
- **Espaçamento de texto (WCAG 1.4.12) e Foco não obscurecido (2.4.11):** só por leitura do CSS (`scroll-padding-top: 88px` com cabeçalho fixo); não medi.
- **axe-core `incomplete`:** `color-contrast` ficou incompleto em 369, 144 e 131 nós (páginas do button, accordion e toast): o axe não decide quando há sobreposição e sombras. Medi os pares por token (seção 3.1), mas não elemento a elemento no navegador.
- **Site publicado:** `lpereira.me/uaiui/` e `lpereira.me/projetos/uaiui/` respondem 200 com conteúdo que não corresponde a esta build; não sei onde nem como o site é publicado (D-05).
- **`npm run dev`:** só rodei `npm run build` (e `astro build` duas vezes para a P-06).
- **Desempenho** (Lighthouse, tempo de carga) e **impressão:** fora do pedido.

## Apêndice: como reproduzir

Ambiente: Node 24.21.0, Chromium 156.0.8078.4 (Playwright `playwright-core`), axe-core 4.14.0, instalados só numa pasta temporária fora do repositório. Nenhum `npm install` tocou em `package.json` nem em `package-lock.json`.

- **Contraste, uso dos tokens e valores fixos:** o script abaixo, salvo como `auditoria.mjs` e rodado **na raiz do repositório**: `node auditoria.mjs contraste`, `node auditoria.mjs uso`, `node auditoria.mjs fixos`.
- **Navegador:** `npm run build`; servir `dist/` em `http://localhost:4399/uaiui`; Playwright (viewport 1440×900, 390×844 e 320×568; temas e densidades por `localStorage` `uai-theme` e `uai-density`) para: `axe.run` com as tags acima; medição de alvos (`getBoundingClientRect` dos seletores da seção 3.2 com as exceções do SC 2.5.8); sequência de 30 Tabs com `getComputedStyle(outline*)`; `reducedMotion: "reduce"` com `transitionDuration` e `animationName`; foco do "Copiar" com a razão calculada pelo script; `scrollWidth` contra `clientWidth` em 320 px; Esc e Enter no accordion e no toast.
- **Pacote:** `npm pack --pack-destination <pasta>`; numa pasta limpa, `npm i <tarball>` e `createRequire(...).resolve("@uaiui/ds/<subcaminho>")` para os 10 subcaminhos; `npm i --package-lock-only` numa cópia de `package.json` e `package-lock.json` para o nome do lock.
- **Hover:** importar `unprotectedHoverSelectors` de `scripts/check-hover-media.mjs` e chamar com os 22 CSS da seção 3.3.
- **Build determinístico:** `npx astro build --outDir <a>` e `--outDir <b>`, depois `diff -rq <a> <b>`.
- **Site publicado:** `curl -sL -o /dev/null -w "%{http_code} %{url_effective}" <url>` e `grep "<title>"`.

```js
// Uso (na raiz do repositório): node auditoria.mjs contraste | uso | fixos
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
const R = process.cwd(), rd = (f) => readFileSync(join(R, f), 'utf8'), fmt = (n) => n.toFixed(2).replace('.', ',');
const blocks = {}; let sel = null, media = false;                        // tokens.css → { seletor: Map(nome → valor) }
for (const l of rd('src/styles/tokens.css').split('\n')) {
  const o = l.match(/^\s*(@media[^{]*|[^\s@/][^{]*)\{$/);
  if (o && !/^\s*--/.test(l)) { if (o[1].trim().startsWith('@media')) media = true; else blocks[sel = (media ? '@dark ' : '') + o[1].trim()] = new Map(); continue; }
  if (/^\s*\}$/.test(l)) { if (sel) sel = null; else media = false; continue; }
  const d = l.match(/^\s*(--[\w-]+):\s*(.*);$/); if (d && sel) blocks[sel].set(d[1], d[2]);
}
const names = [...new Set(Object.values(blocks).flatMap((m) => [...m.keys()]))];
const order = (t, d) => [...(d === 'comfortable' ? [] : [`:root[data-density="${d}"]`]), ...(t === 'escuro' ? [':root[data-theme="dark"]'] : []), ':root'];
function resolve(n, t = 'claro', d = 'comfortable') {                    // segue var(--x) até o valor final
  const chain = [n]; let v; const look = (k) => { for (const s of order(t, d)) if (blocks[s]?.has(k)) return blocks[s].get(k); };
  for (v = look(n); v !== undefined && chain.length < 40;) { const m = v.match(/^var\((--[\w-]+)\)$/); if (!m) break; chain.push(m[1]); v = look(m[1]); }
  return { value: v, chain };
}
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4), isHex = (v) => /^#[0-9a-f]{6}$/i.test(v ?? '');
const lum = (h) => [0, 2, 4].reduce((s, i, k) => s + [0.2126, 0.7152, 0.0722][k] * lin(parseInt(h.slice(1 + i, 3 + i), 16)), 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mode = process.argv[2];
if (mode === 'contraste') {                                              // WCAG 2.2: texto 4,5:1; componente de interface 3:1
  const P = '--ui-bg-page', pairs = [];                                  // [rótulo, fg, bg, mínimo]
  const add = (l, f, b, min) => pairs.push([l, f, b, min]);
  for (const [s, f] of [['primary', 'primary'], ['secondary', 'secondary'], ['danger', 'error']]) for (const k of ['normal', 'action', 'active']) add(`button filled ${s} ${k}`, `--interface-function-${f}-${k}-txtOn`, `--interface-function-${f}-${k}-background`, 4.5);
  for (const k of ['normal', 'action', 'active']) { add(`button outlined ${k}`, `--button-outlined-${k}-txtOn`, `--button-outlined-${k}-background`, 4.5); add(`button ghost ${k}`, `--interface-function-ghost-${k}-txtOn`, k === 'normal' ? P : `--interface-function-ghost-${k}-background`, 4.5); add(`accordion cabeçalho ${k}`, `--accordion-header-${k}-txtOn`, `--accordion-header-${k}-background`, 4.5); }
  add('button: borda × página', '--button-border', P, 3); add('accordion painel', '--accordion-panel-txt', '--accordion-panel-background', 4.5); add('accordion: borda × página', '--accordion-border', P, 3);
  for (const t of ['neutral', 'success', 'warning', 'error', 'info']) { add(`toast ${t}: texto`, '--toast-txtOn', `--toast-${t}-background`, 4.5); add(`toast ${t}: ícone`, `--toast-${t}-icon`, `--toast-${t}-background`, 3); add(`toast ${t}: borda × página`, `--toast-${t}-border`, P, 3); add(`toast ${t}: barra × fundo`, `--toast-${t}-bar`, `--toast-${t}-background`, 3); }
  add('foco × página', '--ui-focus-ring', P, 3); add('foco × painel', '--ui-focus-ring', '--ui-bg-panel', 3); add('foco do Copiar × bloco de código #17100f', '--ui-focus-ring', '#17100f', 3);
  for (const [a, b] of [['default', 'page'], ['default', 'panel'], ['muted', 'page'], ['muted', 'panel'], ['brand', 'page'], ['brand', 'panel']]) add(`site: fg-${a} × bg-${b}`, `--ui-fg-${a}`, `--ui-bg-${b}`, 4.5);
  add('site: selo "novo" #1a1818 × brand-band', '#1a1818', '--ui-brand-band', 4.5); add('site: código #f5ecee × #17100f', '#f5ecee', '#17100f', 4.5);
  let n = 0; const bad = [];
  for (const t of ['claro', 'escuro']) for (const [l, f, b, min] of pairs) { const fg = f[0] === '#' ? f : resolve(f, t).value, bg = b[0] === '#' ? b : resolve(b, t).value; if (!isHex(fg) || !isHex(bg)) continue; n++; const r = ratio(fg, bg); if (r < min) bad.push(`${t} | ${l} | ${fmt(r)} < ${min}`); }
  const ok = []; for (const t of ['claro', 'escuro']) for (const [l, f, b, min] of pairs) { const fg = f[0] === '#' ? f : resolve(f, t).value, bg = b[0] === '#' ? b : resolve(b, t).value; if (isHex(fg) && isHex(bg) && ratio(fg, bg) >= min) ok.push([ratio(fg, bg) / min, `${t} | ${l} | ${fmt(ratio(fg, bg))} ≥ ${min}`]); }
  console.log(`A. Pares usados: ${n} medições, ${bad.length} abaixo do mínimo (WCAG 2.2 AA)\n${bad.join('\n')}\nA. mais próximos do limite (aprovados):\n${ok.sort((a, b) => a[0] - b[0]).slice(0, 8).map((x) => x[1]).join('\n')}`);
  const fam = [...new Set(names.map((x) => x.match(/^--([a-z]+)-behavior-/)?.[1]).filter(Boolean))], lv = [...new Set(names.map((x) => x.match(/-behavior-([a-z]+)-surface$/)?.[1]).filter(Boolean))];
  const cnt = {}; for (const t of ['claro', 'escuro']) for (const f of fam) for (const l of lv) for (const [k, a, b, min] of [['txtOn×surface', 'txtOn', 'surface', 4.5], ['txt×página', 'txt', P, 4.5], ['border×página', 'border', P, 3], ['surface×página', 'surface', P, 3]]) {
    const fg = resolve(`--${f}-behavior-${l}-${a}`, t).value, bg = b[0] === '-' ? resolve(b, t).value : resolve(`--${f}-behavior-${l}-${b}`, t).value; const r = ratio(fg, bg); (cnt[k] ??= [0, 0])[0]++; if (r < min) { cnt[k][1]++; console.log(`B. ${t} | ${f} ${l} | ${k} | ${fmt(r)} < ${min}`); } }
  console.log('B. [pares, abaixo do mínimo]:', JSON.stringify(cnt));
  let np = 0, nf = 0; for (const t of ['claro', 'escuro']) for (const g of new Set(names.map((x) => x.match(/^--([a-z]+-(?:palette|neutrals))-surface-\d+$/)?.[1]).filter(Boolean))) for (const s of names.filter((x) => x.startsWith(`--${g}-surface-`))) { np++; if (ratio(resolve(s, t).value, resolve(s.replace('-surface-', '-txtOn-'), t).value) < 4.5) nf++; }
  console.log(`C. palette/neutrals txtOn×surface: ${np} pares, ${nf} abaixo de 4,5:1`);
} else if (mode === 'uso') {                                             // tokens usados (direto + alias) e classificação
  const fileOf = new Map(), walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  const flat = (node, path, file) => { for (const [k, v] of Object.entries(node)) if (!k.startsWith('$') && v && typeof v === 'object') '$value' in v ? fileOf.set('--' + [...path, k].join('-'), file) : flat(v, [...path, k], file); };
  for (const f of walk(join(R, 'tokens')).filter((p) => p.endsWith('.json') && !p.endsWith('resolver.json'))) flat(JSON.parse(readFileSync(f, 'utf8')), [], relative(join(R, 'tokens'), f));
  const SRC = [...walk(join(R, 'src')).map((p) => relative(R, p))].filter((f) => /\.(css|astro|ts)$/.test(f) && !/tokens(-wrapper)?\.css$/.test(f));
  const used = new Set(SRC.flatMap((f) => [...rd(f).matchAll(/--[a-zA-Z][\w-]*/g)].map((m) => m[0]).filter((n) => fileOf.has(n))));
  const refs = (n) => Object.values(blocks).flatMap((b) => [...(b.get(n)?.matchAll(/var\((--[\w-]+)\)/g) ?? [])].map((m) => m[1]));
  for (const n of used) for (const r of refs(n)) used.add(r);            // fecho pelos aliases (o Set acompanha a iteração)
  const col = (n) => { const f = fileOf.get(n); return f.startsWith('primitivos') ? 'Primitivos' : f.startsWith('densidade') ? 'Densidade' : { 'escala.json': 'Escala', 'dimensoes.json': 'Dimensões', 'semantica.json': 'Semântica', 'componente.json': 'Componente' }[f]; };
  const impl = new Set(['button', 'icon-button', 'accordion', 'toast']), grp = (n) => n.slice(2).split('-').slice(0, n.startsWith('--icon-button') ? 2 : n.startsWith('--chip-removable') || n.startsWith('--combobox-option') || n.startsWith('--dropdown-menu') || n.startsWith('--menu-item') || n.startsWith('--progress-') || n.startsWith('--toggle-button') || n.startsWith('--text-field') ? 2 : 1).join('-');
  const all = [...fileOf.keys()], comp = all.filter((n) => ['Componente', 'Densidade'].includes(col(n)));
  console.log(`total ${all.length}; usados ${all.filter((n) => used.has(n)).length}; não usados ${all.filter((n) => !used.has(n)).length}`);
  for (const c of ['Escala', 'Dimensões', 'Primitivos', 'Semântica', 'Componente', 'Densidade']) { const x = all.filter((n) => col(n) === c); console.log(`${c}: ${x.length} / usados ${x.filter((n) => used.has(n)).length}`); }
  console.log(`(b) sem CSS: ${comp.filter((n) => !impl.has(grp(n))).length} tokens em ${new Set(comp.filter((n) => !impl.has(grp(n))).map(grp)).size} grupos; usados: ${comp.filter((n) => !impl.has(grp(n)) && used.has(n)).length}`);
  console.log('(c1) componentes com CSS, token nunca usado:', comp.filter((n) => impl.has(grp(n)) && !used.has(n)).join(' '));
  console.log(`(c2) fora de componentes, não usados: ${all.filter((n) => !used.has(n) && !['Componente', 'Densidade'].includes(col(n))).length}`);
  const keep = rd('src/styles/tokens.css').split('\n').filter((l) => { const m = l.match(/^\s*(--[\w-]+):/); return !m || used.has(m[1]); }).join('\n');
  console.log(`tokens.css só com os usados: ${Buffer.byteLength(keep)} B / ${gzipSync(keep).length} B gzip (completo: ${Buffer.byteLength(rd('src/styles/tokens.css'))} B)`);
} else if (mode === 'fixos') {                                           // valores fixos fora de var(--token)
  const F = ['src/styles/components/button.css', 'src/styles/components/accordion.css', 'src/styles/components/toast.css', 'src/styles/site.css', 'src/layouts/DocsLayout.astro'], by = {};
  for (const f of F) rd(f).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).split('\n').forEach((raw, i) => {
    if (f.endsWith('.astro') && !/%23[0-9a-f]{6}/i.test(raw)) return; const l = raw.replace(/var\(--[\w-]+\)/g, 'VAR');
    const hit = (k, re) => { for (const m of l.matchAll(re)) { (by[`${f.includes('components') ? 'componentes' : f.split('/').pop()} | ${k}`] ??= []).push(`${f}:${i + 1} ${m[0]}`); } };
    hit('cor', /(?<![\w-])#[0-9a-fA-F]{3,8}\b|%23[0-9a-fA-F]{6}\b|\b(?:rgba?|hsla?)\([^)]*\)/g); hit('px', /(?<![\w.#-])-?\d*\.?\d+px\b/g); hit('rem/em', /(?<![\w.#-])\d*\.?\d+(?:rem|em)\b/g); hit('ms/s', /(?<![\w.#-])\d*\.?\d+m?s\b/g);
    hit('z-index', /z-index:\s*-?\d+/g); hit('peso', /font(?:-weight)?:\s*\d{3}\b/g); hit('família', /"(?:DM Sans|JetBrains Mono)"/g); hit('opacidade', /opacity:\s*[\d.]+/g);
  });
  const scale = new Map(names.filter((x) => /^--size-scale-|^--border-width|^--shadow-offset|^--focus-ring/.test(x)).map((x) => { const v = resolve(x).value; return [v.endsWith('rem') ? parseFloat(v) * 16 : parseFloat(v), x]; }));
  const px = Object.entries(by).filter(([k]) => k.endsWith('| px')).flatMap(([, v]) => v), eq = px.filter((x) => scale.has(Math.abs(parseFloat(x.split(' ').pop()))));
  console.log(`px com valor igual ao de um token de escala/borda/sombra/foco: ${eq.length} de ${px.length}`);
  for (const [k, v] of Object.entries(by)) console.log(`${k}: ${v.length}${k.startsWith('componentes') ? ' → ' + v.join('; ') : ''}`);
}
```
