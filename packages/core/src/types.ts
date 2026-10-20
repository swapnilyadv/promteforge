import type { StrategyId } from './strategies.js';
import type { Provider } from '@promptforge/providers';

/** Where the prompt will be pasted. Decides the prompt's structure and rules. */
export type Target =
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'copilot'
  | 'cursor'
  | 'vscode'
  | 'perplexity'
  | 'deepseek'
  | 'grok'
  | 'image'
  | 'generic';

/** What the user is trying to get done. Decides which sections the prompt needs. */
export type Intent =
  | 'coding'
  | 'debugging'
  | 'writing'
  | 'email'
  | 'research'
  | 'analysis'
  | 'learning'
  | 'brainstorming'
  | 'image'
  | 'agent'
  | 'other';

export type Style = 'concise' | 'balanced' | 'detailed';

/** What the surface knows about where the user is typing. All optional. */
export interface ConvertContext {
  /** Page URL (browser extension). */
  url?: string;
  /** Foreground app name or process (desktop app), e.g. "Code", "Cursor", "ChatGPT". */
  appName?: string;
  windowTitle?: string;
  /** VS Code language id of the active file, e.g. "typescript". */
  languageId?: string;
  fileName?: string;
  /** A few relevant workspace file names for coding prompts. */
  workspaceFiles?: string[];
}

/** Facts pulled out of the user's own text. Never invented. */
export interface Slots {
  goal: string;
  audience?: string;
  tone?: string;
  length?: string;
  format?: string;
  /** Tech, frameworks, languages mentioned. */
  tech: string[];
  /** Must / should / don't / avoid / only statements. */
  constraints: string[];
  /** Code blocks, quoted material, pasted errors. Kept verbatim. */
  inputs: string[];
  /** Everything else the user said that isn't the goal or a constraint. */
  details: string[];
}

export interface IntentResult {
  intent: Intent;
  /** 0..1 */
  confidence: number;
  scores: Record<Intent, number>;
}

export interface NormalizedInput {
  text: string;
  /** ISO-ish language guess from script: en, hi, ar, zh, ja, ko, ru, ... */
  language: string;
  /** Secrets replaced by placeholders before any cloud call. */
  redactions: { placeholder: string; value: string; kind: string }[];
}

export interface ConvertOptions {
  text: string;
  /** Explicit target; if omitted it's detected from `context`. */
  target?: Target;
  context?: ConvertContext;
  style?: Style;
  /** Allow the rewrite to end with up to 3 clarifying questions. Default true. */
  askQuestions?: boolean;
  /** Force the task type (e.g. the user picked it in a UI). Skips detection and the model check. */
  intent?: Intent;
  /** How to build the prompt. Default 'brief'; asking again with the next one gives a different prompt. */
  strategy?: StrategyId;
  /** LLM backend. Omit for the offline, rules-only converter. */
  provider?: Provider;
  model?: string;
  signal?: AbortSignal;
  /** Called with each streamed token of the final prompt. */
  onToken?: (token: string) => void;
  /** Called when a slower step starts, so a UI can say what it is waiting for. */
  onStage?: (stage: 'cleaning' | 'checking-intent' | 'rewriting' | 'repairing') => void;
  /** Send detected secrets to a cloud provider instead of redacting them. Default false. */
  allowSecretsToCloud?: boolean;
}

export interface ValidationIssue {
  code:
    | 'empty'
    | 'preamble'
    | 'meaning-drift'
    | 'dropped-details'
    | 'invented-details'
    | 'missing-structure'
    | 'too-long'
    | 'template-leftover'
    | 'lost-input';
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  issues: ValidationIssue[];
  /** Share of the user's key words that survived into the prompt (0..1). */
  keywordRecall: number;
  words: number;
  budget: number;
}

export interface ConvertResult {
  prompt: string;
  original: string;
  target: Target;
  intent: Intent;
  intentConfidence: number;
  /** Who chose the intent: keyword rules, the model (when the rules were unsure), or the caller. */
  intentSource: 'rules' | 'model' | 'user';
  /** The approach used to build this prompt. */
  strategy: StrategyId;
  /** Your message with spelling and grammar fixed, when that changed anything. */
  cleaned?: string;
  style: Style;
  language: string;
  /** 'llm' = rewritten by a model; 'offline' = built by rules only. */
  mode: 'llm' | 'offline';
  /** Set when a provider was given but its output wasn't used ('error' includes timeouts). */
  fallback?: { reason: 'error' | 'failed-checks'; detail: string };
  /** Short, human-readable list of what was added — for the diff view. */
  changes: string[];
  /** Placeholders the user should fill in, e.g. "[target audience]". */
  placeholders: string[];
  warnings: string[];
  validation: ValidationReport;
  /** True when the input already looked like a well-structured prompt. */
  alreadyStructured: boolean;
  /** Repair passes used (0 or 1). */
  repairs: number;
  ms: number;
}
