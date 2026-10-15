import { ProviderError, type ChatMessage, type Provider } from '@promptforge/providers';
import { wordBudget } from './budget.js';
import { classifyIntent } from './intent.js';
import { buildMetaPrompt, buildRepairMessages } from './meta-prompt.js';
import { normalize, restoreSecrets } from './normalize.js';
import { getProfile, type ModelProfile } from './profiles/index.js';
import { renderOffline } from './render-offline.js';
import { extractSlots, missingSlots } from './slots.js';
import { detectTarget } from './target.js';
import { getTemplate, type IntentTemplate } from './templates.js';
import type {
  ConvertOptions,
  ConvertResult,
  Intent,
  NormalizedInput,
  Slots,
  Style,
  Target,
  ValidationReport,
} from './types.js';
import { postprocess, validatePrompt } from './validate.js';

export interface Analysis {
  normalized: NormalizedInput;
  target: Target;
  profile: ModelProfile;
  intent: Intent;
  intentConfidence: number;
  template: IntentTemplate;
  slots: Slots;
  missing: (keyof Slots)[];
  questions: string[];
  style: Style;
  budget: number;
  alreadyStructured: boolean;
}

/** Looks like the user already wrote a structured prompt (headers, tags, labelled sections). */
export function looksStructured(text: string): boolean {
  let score = 0;
  if ((text.match(/<([a-z_]+)>[\s\S]*?<\/\1>/g) ?? []).length >= 2) score += 2;
  if ((text.match(/^#{1,4} \S/gm) ?? []).length >= 2) score += 2;
  if ((text.match(/^(role|goal|task|context|constraints?|requirements?|output( format)?|format|audience|tone)\s*:/gim) ?? []).length >= 2) score += 2;
  if (/\byou are (a|an) \w+/i.test(text)) score += 1;
  if ((text.match(/^\s*\d+\.\s/gm) ?? []).length >= 3) score += 1;
  return score >= 3;
}

/** Steps 1–5 of the pipeline: everything except generation. Cheap; safe to call on every keystroke. */
export function analyze(opts: Pick<ConvertOptions, 'text' | 'target' | 'context' | 'style' | 'askQuestions'>): Analysis {
  const normalized = normalize(opts.text);
  const target = opts.target ?? detectTarget(opts.context);
  const { intent, confidence } = classifyIntent(normalized.text, target);
  // An image request inside ChatGPT or Gemini still needs a visual description, not a Markdown brief.
  const base = getProfile(target);
  const profile: ModelProfile =
    intent === 'image' && base.structure !== 'image'
      ? { ...getProfile('image'), id: target, label: `${base.label} (image)` }
      : base;
  const template = getTemplate(intent);
  const slots = extractSlots(normalized.text);
  const missing = missingSlots(slots, template.wanted);
  const style = opts.style ?? 'balanced';
  const askQuestions = opts.askQuestions ?? true;
  const questions = askQuestions
    ? missing.map((k) => template.questions[k]).filter((q): q is string => !!q).slice(0, 3)
    : [];
  return {
    normalized,
    target,
    profile,
    intent,
    intentConfidence: confidence,
    template,
    slots,
    missing,
    questions,
    style,
    budget: wordBudget(style, normalized.text, slots),
    alreadyStructured: looksStructured(normalized.text),
  };
}

function findPlaceholders(prompt: string): string[] {
  const all = prompt.match(/\[[^\]\n]{3,80}\](?!\()/g) ?? [];
  return [...new Set(all.filter((p) => !p.startsWith('[REDACTED_SECRET_') && !/^\[[ xX]\]$/.test(p)))];
}

function isAbort(err: unknown, signal?: AbortSignal): boolean {
  return !!signal?.aborted || (err instanceof Error && err.name === 'AbortError');
}

async function runModel(
  provider: Provider,
  messages: ChatMessage[],
  opts: ConvertOptions,
  maxTokens: number,
  stream: boolean,
): Promise<string> {
  const req = { messages, model: opts.model, temperature: 0.2, maxTokens, signal: opts.signal };
  if (!stream || !opts.onToken) return provider.generate(req);
  let out = '';
  for await (const tok of provider.stream(req)) {
    out += tok;
    opts.onToken(tok);
  }
  return out;
}

/**
 * Convert rough text into an engineered prompt for the target model.
 *
 * - With a `provider`: the model rewrites using the meta-prompt; output is validated and,
 *   if needed, repaired once. If the model fails, falls back to the offline converter.
 * - Without a provider: the offline, rules-only converter (instant, private, no model).
 *
 * `onToken` streams the first draft for a live preview; always display `result.prompt` at the end,
 * since a repair pass or fallback may replace the streamed draft.
 */
export async function convert(opts: ConvertOptions): Promise<ConvertResult> {
  const t0 = Date.now();
  if (!opts.text || !opts.text.trim()) throw new Error('convert: text is empty');

  const a = analyze(opts);
  const askQuestions = opts.askQuestions ?? true;
  const warnings: string[] = [];
  const { normalized } = a;
  const checkRecall = normalized.language === 'en';

  const offline = renderOffline({
    target: a.target,
    intent: a.intent,
    style: a.style,
    slots: a.slots,
    template: a.template,
    context: opts.context,
    askQuestions,
    budget: a.budget,
  });
  const validateFor = (prompt: string): ValidationReport =>
    validatePrompt({
      prompt,
      original: normalized.text,
      slots: a.slots,
      structure: a.profile.structure,
      budget: a.budget,
      checkRecall,
    });

  let prompt = offline.prompt;
  let changes = offline.changes;
  let mode: ConvertResult['mode'] = 'offline';
  let fallback: ConvertResult['fallback'];
  let repairs = 0;
  let validation = validateFor(prompt);

  // The user already wrote a structured prompt: don't re-template it. Keep their words and layout.
  const keepAsIs = a.alreadyStructured && !opts.provider;
  if (keepAsIs) {
    prompt = normalized.text;
    changes = ['Your prompt is already well-structured, so it was left as written'];
    validation = validateFor(prompt);
    const issues = validation.issues.filter((i) => i.code !== 'missing-structure' && i.code !== 'too-long');
    validation = { ...validation, issues, ok: issues.length === 0 };
  }

  if (opts.provider) {
    const provider = opts.provider;
    const sendSecrets = provider.isLocal || opts.allowSecretsToCloud;
    const llmText = sendSecrets ? restoreSecrets(normalized.text, normalized.redactions) : normalized.text;
    if (normalized.redactions.length && !sendSecrets) {
      warnings.push(
        `${normalized.redactions.length} secret(s) (API key / password) were detected and NOT sent to ${provider.id}; they were put back into the final prompt locally.`,
      );
    }

    const messages = buildMetaPrompt({
      text: llmText,
      profile: a.profile,
      intent: a.intent,
      template: a.template,
      slots: a.slots,
      style: a.style,
      budget: a.budget,
      language: normalized.language,
      askQuestions,
      alreadyStructured: a.alreadyStructured,
      missing: a.missing,
      context: opts.context,
    });
    const inputWords = a.slots.inputs.join(' ').split(/\s+/).length;
    const maxTokens = Math.round((a.budget + inputWords) * 2.2) + 200;

    try {
      let draft = postprocess(await runModel(provider, messages, opts, maxTokens, true));
      let report = validateFor(draft);

      if (!report.ok) {
        repairs = 1;
        const fixed = postprocess(
          await runModel(provider, buildRepairMessages(messages, draft, report.issues), opts, maxTokens, false),
        );
        const fixedReport = validateFor(fixed);
        if (fixedReport.issues.length < report.issues.length || fixedReport.ok) {
          draft = fixed;
          report = fixedReport;
        }
      }

      const seriousIssues = report.issues.filter((i) => i.code === 'empty' || i.code === 'meaning-drift' || i.code === 'lost-input');
      if (seriousIssues.length) {
        const codes = seriousIssues.map((i) => i.code).join(', ');
        fallback = { reason: 'failed-checks', detail: codes };
        warnings.push(`The model's rewrite failed checks (${codes}); used the rules-based prompt instead.`);
      } else {
        prompt = draft;
        validation = report;
        mode = 'llm';
        changes = [
          `Rewritten for ${a.profile.label} by ${provider.id}${provider.isLocal ? ' (on this computer)' : ''}`,
          ...offline.changes.slice(0, 4),
        ];
        if (!report.ok) warnings.push(...report.issues.map((i) => i.message));
      }
    } catch (err) {
      if (isAbort(err, opts.signal)) throw err;
      const msg = err instanceof ProviderError || err instanceof Error ? err.message : String(err);
      fallback = { reason: 'error', detail: msg };
      warnings.push(`Model unavailable (${msg}); used the rules-based prompt instead.`);
    }
  }

  // Secrets were the user's own text: restore them locally in the final prompt.
  prompt = restoreSecrets(prompt, normalized.redactions);
  if (normalized.language !== 'en' && mode === 'offline') {
    warnings.push('Offline mode writes section labels in English; connect a model to get the prompt fully in your language.');
  }

  return {
    prompt,
    original: opts.text,
    target: a.target,
    intent: a.intent,
    intentConfidence: a.intentConfidence,
    style: a.style,
    language: normalized.language,
    mode,
    fallback,
    changes,
    placeholders: findPlaceholders(prompt),
    warnings,
    validation,
    alreadyStructured: a.alreadyStructured,
    repairs,
    ms: Date.now() - t0,
  };
}
