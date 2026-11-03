// Mensagens entre a interface e a thread do Figma.

import type { Snapshot } from './lib/snapshot.ts';

export interface Settings {
  owner: string;
  repo: string;
  base: string;
  configPath: string;
}

export const DEFAULT_SETTINGS: Settings = { owner: '', repo: '', base: 'main', configPath: 'figma-plugin/figma.config.json' };

export type ToCode =
  | { type: 'init' }
  | { type: 'save-settings'; settings: Settings }
  | { type: 'save-token'; token: string }
  | { type: 'clear-token' }
  | { type: 'snapshot'; id: number }
  | { type: 'open'; url: string }
  | { type: 'notify'; text: string; error?: boolean };

export type ToUi =
  | { type: 'init'; settings: Partial<Settings> | null; token: string; fileName: string }
  | { type: 'snapshot'; id: number; snapshot: Snapshot }
  | { type: 'error'; id?: number; message: string };
