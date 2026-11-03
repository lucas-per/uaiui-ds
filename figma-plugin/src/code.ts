// Thread do Figma: lê as variables (snapshot) e guarda as preferências e o token no clientStorage.
// Não faz rede: toda chamada ao GitHub sai da interface (ui.ts).

import { takeSnapshot } from './lib/snapshot.ts';
import type { ToCode } from './messages.ts';

const SETTINGS_KEY = 'settings';
const TOKEN_KEY = 'github-token';

figma.showUI(__html__, { width: 640, height: 780, themeColors: true });

figma.ui.onmessage = async (msg: ToCode) => {
  try {
    switch (msg.type) {
      case 'init': {
        const settings = (await figma.clientStorage.getAsync(SETTINGS_KEY)) ?? null;
        const token = ((await figma.clientStorage.getAsync(TOKEN_KEY)) as string | undefined) ?? '';
        figma.ui.postMessage({ type: 'init', settings, token, fileName: figma.root.name });
        break;
      }
      case 'save-settings':
        await figma.clientStorage.setAsync(SETTINGS_KEY, msg.settings);
        break;
      case 'save-token':
        await figma.clientStorage.setAsync(TOKEN_KEY, msg.token);
        break;
      case 'clear-token':
        await figma.clientStorage.deleteAsync(TOKEN_KEY);
        break;
      case 'snapshot': {
        const snapshot = await takeSnapshot(figma.variables, figma.root.name);
        figma.ui.postMessage({ type: 'snapshot', id: msg.id, snapshot });
        break;
      }
      case 'open':
        if (/^https:\/\/github\.com\//.test(msg.url)) figma.openExternal(msg.url);
        break;
      case 'notify':
        figma.notify(msg.text, { error: msg.error ?? false });
        break;
    }
  } catch (e) {
    figma.ui.postMessage({ type: 'error', id: 'id' in msg ? msg.id : undefined, message: (e as Error).message });
  }
};
