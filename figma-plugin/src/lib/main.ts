// Lê da branch base tudo o que o export precisa: a config, a pasta de tokens e as saídas do gerador.

import { parseConfig, type Config } from './config.ts';
import type { GitHub } from './github.ts';

export interface MainState {
  branch: string;
  sha: string;
  treeSha: string;
  config: Config;
  files: Map<string, string>;
}

export async function readMain(gh: GitHub, branch: string, configPath: string): Promise<{ state?: MainState; errors: string[] }> {
  const base = await gh.readBase(branch);
  if (!base.paths.includes(configPath)) return { errors: [`${configPath} não existe em ${branch}`] };
  const configText = await gh.readFile(configPath, base.sha);
  const { config, errors } = parseConfig(configText, configPath);
  if (!config) return { errors };
  const dir = config.tokensDir.replace(/\/+$/, '') + '/';
  const wanted = base.paths.filter((p) => (p.startsWith(dir) && p.endsWith('.json')) || Object.values(config.outputs).includes(p));
  const files = new Map<string, string>([[configPath, configText]]);
  // Poucos arquivos: em paralelo, de 4 em 4, para não esbarrar no limite de requisições simultâneas.
  for (let i = 0; i < wanted.length; i += 4) {
    const chunk = wanted.slice(i, i + 4);
    const texts = await Promise.all(chunk.map((p) => gh.readFile(p, base.sha)));
    chunk.forEach((p, j) => files.set(p, texts[j]));
  }
  return { state: { branch, sha: base.sha, treeSha: base.treeSha, config, files }, errors: [] };
}
