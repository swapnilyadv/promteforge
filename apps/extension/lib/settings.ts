import { browser } from 'wxt/browser';

export interface Settings {
  /** Ollama model name. Empty = the first installed model. */
  model: string;
  style: 'concise' | 'balanced' | 'detailed';
  baseUrl: string;
  /** The type for the first Forge: 'auto' (best fit) or an approach id. */
  strategy: string;
  /** A focus for the first Forge (an angle id), or '' for none. */
  angle: string;
}

export const DEFAULTS: Settings = { model: '', style: 'balanced', baseUrl: 'http://localhost:11434', strategy: 'auto', angle: '' };

export async function loadSettings(): Promise<Settings> {
  try {
    const got = await browser.storage.sync.get(DEFAULTS as unknown as Record<string, unknown>);
    return { ...DEFAULTS, ...(got as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await browser.storage.sync.set(patch);
}
