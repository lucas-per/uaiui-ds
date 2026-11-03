# Variables → tokens DTCG (plugin do Figma)

Plugin de desenvolvimento, sem publicação na Community. Ele exporta as variables locais de um arquivo do Figma para arquivos de tokens [DTCG 2025.10](https://www.designtokens.org/) num repositório do GitHub. O caminho é só de ida: Figma → JSON.

Antes de qualquer ação, o plugin mostra o diff contra a branch base, por token e por modo. Depois entrega o resultado de duas formas:

- **Abrir PR** (padrão): cria a branch `tokens/figma-AAAAMMDD-HHMM` a partir da branch base, faz um commit com os JSON alterados e o CSS regenerado e abre a PR, com o relatório no corpo.
- **Baixar .zip**: a pasta de tokens inteira e as saídas do gerador (o CSS).

O plugin é genérico: owner, repositório, branch base e o caminho da config são campos da interface. Tudo o que é específico de um repositório fica na config dele (`figma.config.json`) e no gerador de CSS que entra no build.

## Instalar e carregar no Figma

```sh
cd figma-plugin
npm install
npm run build        # gera dist/code.js e dist/ui.html
```

1. No Figma Desktop, abra o arquivo de tokens.
2. Vá em **Plugins → Development → Import plugin from manifest…** e escolha `figma-plugin/manifest.json`.
3. Rode em **Plugins → Development → Variables to DTCG**.

O `id` do manifest é um placeholder (`0000000000000000000`), o que basta para plugin de desenvolvimento. Para publicar, o Figma gera um id novo.

## Usar

1. Em **Repositório e token**, preencha owner, repositório, branch base (padrão `main`) e config (padrão `figma-plugin/figma.config.json`). Os valores ficam guardados no `figma.clientStorage`.
2. Para abrir PR, cole um token *fine-grained* restrito a esse repositório, com **Contents** e **Pull requests** em *Read and write*, e clique em **Salvar**.
   - O token fica só no `clientStorage` deste computador.
   - Ele não vai para arquivo, log nem mensagem de erro.
   - Para trocar, digite outro e salve. **Apagar** remove o token.
   - Sem token, a leitura funciona em repositório público (limite de 60 requisições por hora), mas a PR não.
3. Clique em **Ler o Figma e a branch base**. A tela mostra:
   - **Erros que bloqueiam**: tipo não resolvido, alias quebrado, colisão de nome, tipo divergente da main, modo ou coleção que não existe e erros do validador do repositório.
   - **Tipos manuais**: uma lista com as variables novas cujo tipo não foi resolvido, para você escolher. A escolha entra na tabela `types` da config, no mesmo commit da PR.
   - **Avisos**: modo ignorado, coleção fora da config, tokens removidos e nome do arquivo diferente do esperado.
   - **Diff**: adicionados, alterados (antes → depois) e removidos, por token e por modo.
4. Com erro, **Abrir PR** e **Baixar .zip** ficam desativados. Antes de abrir a PR, o plugin confere se a branch base continua no mesmo commit da leitura. Se ela mudou, o plugin pede para ler de novo.
5. O corpo da PR traz, nesta ordem, o resumo, os avisos, os arquivos e as listas de alterados, removidos e adicionados. Acima de 60.000 bytes (UTF-8), só as listas são cortadas, com "+N" e uma linha avisando o corte. Se nem o resumo com avisos e arquivos couber, o plugin não abre a PR e explica o motivo.

**Baixar snapshot** salva o JSON bruto das coleções, modos e variables, descrito abaixo. Ele não usa a rede e serve de caso de teste.

## Config (`figma.config.json`)

```json
{
  "version": 1,
  "figmaFile": "Nome do arquivo no Figma",
  "tokensDir": "tokens",
  "resolver": "meu.resolver.json",
  "outputs": { "root": "src/styles/tokens.css", "wrapper": "src/styles/tokens-wrapper.css" },
  "units": { "dimension": "px", "duration": "ms" },
  "collections": {
    "Escala":     { "file": "escala.json", "modes": { "Valor": null } },
    "Semântica":  { "file": "semantica.json", "modes": { "Positiva": null },
                    "ignoreModes": { "Negativa": "Modo vazio." } },
    "Primitivos": { "folder": "primitivos", "modifier": "tema",
                    "modes": { "Claro": "claro", "Escuro": "escuro" } }
  },
  "types": { "motion/duration/press": "duration" },
  "newTokenExtensions": { "string": { "minha.extensao": { "nonStandardType": true } } }
}
```

| Campo | O que faz |
|---|---|
| `figmaFile` | Nome esperado do arquivo. Se for outro, o plugin só avisa. |
| `tokensDir`, `resolver` | Pasta dos tokens e arquivo do resolver DTCG, relativo à pasta. |
| `outputs` | Saída do gerador → caminho no repositório. Entram no commit e no .zip. |
| `units` | Unidade de `dimension` e de `duration`. |
| `collections` | Coleção de modo único: `file` e um modo com `null`, e o arquivo vai para um set do resolver. Coleção com modos: `folder` e `modifier`, com cada modo apontando para um contexto e o arquivo em `folder/contexto.json`. |
| `ignoreModes` | Modos que não são exportados, com o motivo. Geram aviso, e o aviso conta os valores que diferem do modo principal. |
| `types` | Tabela de tipos (nome da variable no Figma → `$type`). |
| `newTokenExtensions` | `$extensions` que um token novo recebe, conforme o `$type`. Um token que já existe mantém as `$extensions` da main. |

A config é conferida contra o resolver da branch base: cada arquivo e cada contexto precisam existir lá. O plugin não altera o resolver.

Se um modo ou uma coleção da config não existir no Figma, o export falha e lista os nomes reais. Um modo do Figma que não esteja em `modes` nem em `ignoreModes` também falha.

## Tipo de cada variable

A primeira regra que resolve vale:

1. **Tabela** (`types` da config).
2. **Escopos**:
   - `COLOR` vira `color`.
   - `FLOAT` com escopo só `FONT_WEIGHT` vira `fontWeight`.
   - `FLOAT` com todos os escopos de medida vira `dimension`. São eles: `CORNER_RADIUS`, `GAP`, `WIDTH_HEIGHT`, `STROKE_FLOAT`, `FONT_SIZE`, `LINE_HEIGHT`, `LETTER_SPACING`, `PARAGRAPH_SPACING`, `PARAGRAPH_INDENT` e `EFFECT_FLOAT`.
   - `STRING` com escopo só `FONT_FAMILY` vira `fontFamily`.
3. **Alias**: se a variable é alias em todos os modos exportados e todos os alvos têm o mesmo tipo, ela herda esse tipo.
4. **Main**: um token que já existe na branch base usa o `$type` dela.

O export bloqueia em dois casos:
- o tipo resolvido pelos passos 1 a 3 diverge do `$type` da main;
- um token novo não resolve. Nesse caso, a variable vai para a lista de tipos manuais.

O relatório conta quantos tokens cada fonte resolveu.

## Conversão e formato

| Figma | DTCG |
|---|---|
| `COLOR` | `{ "colorSpace": "srgb", "components": [r, g, b], "alpha"?, "hex" }`, com os components em 4 casas e o hex calculado do valor bruto. `alpha` só aparece quando é diferente de 1 (transparente: `"alpha": 0`). |
| `FLOAT` | `{ "value", "unit" }` com a unidade da config, ou número em `fontWeight` e `number`. Arredondado em 4 casas, o que tira o ruído de float32. |
| `STRING` | texto |
| Alias | `"{grupo.token}"`, com o nome do Figma passado de `/` para `.` |
| Descrição | `$description` |

Os arquivos saem com `JSON.stringify` de 2 espaços e `\n` no fim. O `$value` objeto fica numa linha só.

O plugin preserva a ordem dos tokens da main e os metadados de arquivo e de grupo (`$description`, `$type`). Um token novo entra no fim do grupo, na ordem do Figma. Assim, um export sem mudança no Figma gera diff vazio.

## Formato do snapshot

O snapshot é o que o botão **Baixar snapshot** gera. Ele copia os objetos da API de plugins do Figma (`figma.variables`), com as variables na ordem do painel:

```jsonc
{
  "format": "figma-variables-snapshot",
  "version": 1,
  "fileName": "UaiUI – Design Tokens",          // figma.root.name
  "exportedAt": "2026-11-03T12:00:00.000Z",
  "collections": [
    {
      "id": "VariableCollectionId:1:0",
      "name": "Primitivos",
      "defaultModeId": "1:0",
      "modes": [{ "modeId": "1:0", "name": "Claro" }, { "modeId": "1:1", "name": "Escuro" }],
      "variableIds": ["VariableID:1:2", "…"]    // ordem do painel
    }
  ],
  "variables": [
    {
      "id": "VariableID:1:2",
      "name": "marca/neutrals/surface/10",      // grupos separados por "/"
      "collectionId": "VariableCollectionId:1:0",
      "resolvedType": "COLOR",                  // COLOR | FLOAT | STRING | BOOLEAN
      "scopes": ["ALL_FILLS"],                  // VariableScope[]
      "description": "",
      "valuesByMode": {
        "1:0": { "r": 0.988235294818878, "g": 0.996078431606293, "b": 1, "a": 1 },
        "1:1": { "type": "VARIABLE_ALIAS", "id": "VariableID:1:7" }
      }
    }
  ],
  "external": [                                 // alvos de alias que não são variables locais
    { "id": "VariableID:abc/1:2", "name": "brand/red", "collectionName": "Marca", "remote": true }
  ]
}
```

- Os valores em `valuesByMode` saem como a API devolve: número (`FLOAT`), texto (`STRING`), booleano (`BOOLEAN`), `{ r, g, b, a }` de 0 a 1 (`COLOR`) ou `{ "type": "VARIABLE_ALIAS", "id" }`.
- Para gerar o snapshot fora do plugin, por exemplo com um script no console de plugins, monte o objeto acima com `figma.variables.getLocalVariableCollectionsAsync()` e `getLocalVariablesAsync()` (ver `src/lib/snapshot.ts`).
- `test/fixtures/sintetico.snapshot.json` é um exemplo pequeno e completo.

## Gerador de CSS

O plugin não sabe gerar CSS. No build, ele embute o gerador do repositório pelo alias `tokens-generator`:

```sh
node build.mjs --generator=../scripts/lib/tokens-core.mjs   # padrão
```

O contrato do módulo:
- `validate(read, resolverFile)` devolve `{ errors, model }`. `read(caminho)` dá o texto de um arquivo relativo à pasta de tokens.
- `toCss(model)` devolve `{ [saída]: texto }`. As saídas são as chaves de `outputs` na config.

O plugin roda o validador no conjunto novo, e um erro dele bloqueia o export como qualquer outro.

## Rede, privacidade e segurança

- **Rede**: o manifest declara só `https://api.github.com`. Não há analytics nem outra chamada de rede, e nenhum segredo vai no bundle.
- **Thread do Figma** (`code.ts`): não faz rede. Só lê as variables e o `clientStorage`.
- **Escrita no GitHub**: o cliente só cria refs `refs/heads/tokens/figma-…` e nunca atualiza ref existente. Também não faz merge nem escreve na branch base. Uma branch que já existe (422) aparece como erro.
- **Leitura**: chamadas de leitura usam o SHA lido no começo. Diff, commit e PR saem desse mesmo commit.

## Desenvolvimento

```sh
npm test            # node --test (Node 22.18+ ou 24: roda .ts sem build)
npm run typecheck
npm run watch       # rebuild a cada mudança em src/ ou no gerador
```

Os testes rodam no Node, sem o Figma:
- `test/roundtrip.test.ts`: monta um snapshot no formato do Figma a partir dos tokens da main, com ruído de float32 nas cores, e exige que o export gere os mesmos arquivos byte a byte e o mesmo CSS, sem diff.
- `test/pipeline.test.ts`: erros, avisos, diff e relatório.
- `test/github.test.ts`: o cliente do GitHub com fetch falso.
- `test/units.test.ts`: conversão, tipos, serialização, árvore, config e snapshot.
- `test/fixtures.test.ts`: a fixture sintética e, se existir `test/fixtures/real.snapshot.json`, o snapshot real contra a main. Com `REPORT=1 npm test`, ele imprime o relatório.
