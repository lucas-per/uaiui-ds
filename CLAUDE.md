# CLAUDE.md

Regras permanentes do repositório `lucas-per/uaiui-ds` (pacote `@uaiui/ds`).

## Ecossistema
- O Figma ("UaiUI – Design Tokens") é a origem dos tokens; o plugin (`figma-plugin/`) exporta para `tokens/` (DTCG 2025.10).
- `scripts/dtcg-to-css.mjs` gera o CSS; o pacote `@uaiui/ds` leva tudo isso ao npm.
- O Portifa (site) é outro repositório e outro chat. Mudança que o afete vai em mensagem separada, com arquivos e linhas.
- Uso e build do plugin ficam em `figma-plugin/README.md`.

## Fluxo
- Plano curto → esperar o OK → implementar em branch + PR → relatório.
- Só implemente depois do OK explícito.

## Nunca
- Push na `main`, merge, tag ou `npm publish`.
- Eu faço o merge no GitHub, crio a tag anotada e rodo o `npm publish` no meu computador, com 2FA.

## Versão e API
- Mudança que quebra a API = versão minor (estamos em 0.x).
- Avisar no relatório e listar arquivos e linhas afetados, para eu levar ao chat do Site (Portifa).

## Escopo e dúvida
- Nada fora do escopo é corrigido: liste no relatório.
- Conflito com o código ou dúvida: pare, mande o plano e espere. Não decida sozinho.

## Pacotes

| Pacote | Pasta | Comandos |
|---|---|---|
| `@uaiui/ds` | raiz | `npm run check`, `npm pack --dry-run` |
| Plugin do Figma | `figma-plugin/` | `npm test`, `npx tsc -p .` |

## Provas no relatório
- Sempre comando e resultado completos, com hash inteiro, sem truncar.
- Rode `git fetch origin` antes e compare com `origin/main`.
- Rode os comandos de cada pacote que a tarefa tocar, e dos pacotes que dependem dele, cada um na pasta dele (tabela acima).
- Sempre: sha256 dos CSS gerados (`src/styles/tokens.css` e `tokens-wrapper.css`), lado a lado com os da `origin/main`. Se a tarefa não deve mudar o CSS, têm de ser iguais; se deve, explique a diferença esperada.
- Sempre: lista exata das diferenças esperadas e, quando houver, medições.
- Comando único, igual ao CI: `scripts/ci.sh` (`CI_INSTALL=1` também roda `npm ci`).
- Dependência (exemplo): o plugin embute o gerador no build. Se a tarefa mudar `scripts/lib/tokens-core.mjs` ou `scripts/dtcg-to-css.mjs`, rode também os comandos do plugin e avise no relatório que ele precisa ser recompilado (`npm run build` em `figma-plugin/`).

## Testes
- Nunca apagar, pular ou enfraquecer teste sem justificar.
- Teste que falha por bug real continua falhando e vai para uma lista no relatório.

## Segredos
- Nenhum segredo ou token em arquivo, log ou mensagem de erro.

## Fim do relatório
- Termina dizendo o que eu preciso fazer: merge, tag, publish.
