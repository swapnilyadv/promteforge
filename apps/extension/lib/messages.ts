import type { Intent, Target } from '@promptforge/core';

export type ForgeResponse =
  | {
      ok: true;
      prompt: string;
      target: Target;
      intent: Intent;
      /** 'llm' = rewritten by the model; 'offline' = built by rules because the model could not be used. */
      mode: 'llm' | 'offline';
      /** Share of the user's key words that made it into the prompt, 0..1. */
      kept: number;
      model?: string;
      warnings: string[];
    }
  | { ok: false; error: string };

export interface StatusResponse {
  running: boolean;
  models: string[];
}

export type Message =
  | { type: 'forge'; text: string; url: string }
  | { type: 'status' };
