import type { Intent, RequestKind, StrategyId, Target } from '@promptforge/core';

export type Stage = 'cleaning' | 'checking-intent' | 'rewriting' | 'repairing';

export type ForgeResponse =
  | {
      ok: true;
      prompt: string;
      target: Target;
      intent: Intent;
      /** The approach used, so "another way" can move to the next one. */
      strategy: { id: StrategyId; name: string };
      /** A project to build or a plain task: decides which approaches "another way" walks through. */
      kind: RequestKind;
      /** The user's message with spelling and grammar fixed, if that changed anything. */
      cleaned?: string;
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

/** Messages on the long-lived 'forge' port: one request in, progress and one result out. */
export type PortIn = { type: 'forge'; text: string; url: string; strategy?: StrategyId };
export type PortOut =
  | { type: 'progress'; stage: Stage; words: number }
  | { type: 'done'; result: ForgeResponse };
