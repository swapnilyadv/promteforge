import { ProviderError, type ChatMessage, type Provider } from '@promptforge/providers';
import { wordBudget } from './budget.js';
import { basicClean, cleanWithModel, hinglishToEnglish, stripRequestWrapper } from './clean.js';
import { classifyIntent } from './intent.js';
import { confirmIntent } from './intent-confirm.js';
import { buildMetaPrompt, buildRepairMessages } from './meta-prompt.js';
import { normalize, restoreSecrets } from './normalize.js';
import { getProfile, type ModelProfile } from './profiles/index.js';
import { renderOffline } from './render-offline.js';
import { projectNotes, renderRichOffline } from './rich-offline.js';
import { angleFor, getAngle, withAngle } from './angles.js';
import { autoStrategy, getStrategy, requestKind, STYLE_FACTOR, withOfflineApproach } from './strategies.js';
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
  ValidationIssue,
  ValidationReport,
} from './types.js';
import { asTheUser, postprocess, validatePrompt } from './validate.js';

/**
 * Rules below this confidence get a second opinion from the model. Measured on 167 labelled requests:
 * rules alone 154 right, model alone 150, rules + model-when-unsure 156 (and 83% vs 63% on the unseen batch).
 */
export const INTENT_CONFIRM_BELOW = 0.8;

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
export function analyze(opts: Pick<ConvertOptions, 'text' | 'target' | 'context' | 'style' | 'askQuestions' | 'intent'>): Analysis {
  const normalized = normalize(opts.text);
  const target = opts.target ?? detectTarget(opts.context);
  const detected = classifyIntent(normalized.text, target);
  const intent = opts.intent ?? detected.intent;
  const confidence = opts.intent ? 1 : detected.confidence;
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

/** A plain-language note for the user, or nothing when the issue is only a style nit for the model. */
function userNote(i: ValidationIssue): string | undefined {
  const quoted = [...i.message.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (i.code === 'dropped-details' && quoted.length) return `Check that these details from your message are in the prompt: ${quoted.join(', ')}.`;
  if (i.code === 'invented-details') {
    const list = i.message.match(/\(([^)]+)\)/)?.[1];
    return list ? `It names technologies you did not mention (${list}). Treat them as suggestions.` : undefined;
  }
  if (i.code === 'lost-input') return 'Some code or text you pasted may have changed. Check it before sending.';
  return undefined;
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
  temperature = 0.2,
): Promise<string> {
  // Rough token count (about 3.2 characters per token) plus the answer: ask for a bigger window only when needed.
  const need = Math.ceil(messages.reduce((n, m) => n + m.content.length, 0) / 3.2) + maxTokens + 256;
  const contextTokens = need > 8192 ? (need > 16384 ? 32768 : 16384) : undefined;
  const req = { messages, model: opts.model, temperature, maxTokens, contextTokens, signal: opts.signal };
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

  // Fix spelling and grammar first, so the rest of the pipeline (and the prompt) works from clean text.
  // With a model it is a short correction call; without one, a light rules-based tidy.
  // "hey chatgpt ... convert this into a prompt" is addressed to PromptForge, not part of the request.
  // The rules fix first (typos, shorthand, greetings, a repeated "can you build it for me"), so even when the
  // model's correction is rejected or there is no model, the prompt never carries the user's typos.
  let working = stripRequestWrapper(basicClean(hinglishToEnglish(stripRequestWrapper(opts.text))));
  if (opts.provider) {
    const sendSecrets = opts.provider.isLocal || opts.allowSecretsToCloud;
    const redacted = normalize(working);
    if (sendSecrets || redacted.redactions.length === 0) {
      opts.onStage?.('cleaning');
      const fixed = await cleanWithModel(opts.provider, working, { model: opts.model, signal: opts.signal });
      if (fixed) working = fixed;
    }
  }
  const cleaned = working.trim() !== opts.text.trim() ? working : undefined;
  let a = analyze({ ...opts, text: working });
  let intentSource: ConvertResult['intentSource'] = opts.intent ? 'user' : 'rules';
  // Keyword rules latch onto surface words ("discount code" → coding). When they are unsure and a
  // model is connected, let it read the sentence and confirm or override. Any failure keeps the rules' answer.
  if (opts.provider && !opts.intent && a.intentConfidence < INTENT_CONFIRM_BELOW) {
    const sendSecrets = opts.provider.isLocal || opts.allowSecretsToCloud;
    const text = sendSecrets ? restoreSecrets(a.normalized.text, a.normalized.redactions) : a.normalized.text;
    opts.onStage?.('checking-intent');
    const confirmed = await confirmIntent(opts.provider, text, a.intent, { model: opts.model, signal: opts.signal });
    if (confirmed && confirmed !== a.intent) {
      a = analyze({ ...opts, text: working, intent: confirmed });
      intentSource = 'model';
    }
  }
  const kind = requestKind(working, a.intent);
  const strategy = getStrategy(opts.strategy === 'auto' ? autoStrategy(kind, a.intent) : opts.strategy);
  const variant = Math.max(0, Math.floor(opts.variant ?? 0));
  const angle = getAngle(opts.angle) ?? angleFor(variant, kind);
  // Each "Another way" is a new generation, so let the model range a little wider than the first time.
  const temperature = Math.min(0.9, strategy.temperature + (variant ? 0.15 : 0));
  const askQuestions = opts.askQuestions ?? true;
  const warnings: string[] = [];
  const { normalized } = a;
  // Approaches other than the plain brief add a section or two, so they get a little more room.
  const richMode = strategy.rich && a.profile.structure !== 'image';
  // A plain task (an email, a question) gets a lighter prompt than a project to build.
  const kindFactor = kind === 'task' ? 0.65 : 1;
  const budget = richMode ? Math.round((strategy.wordBudget ?? a.budget) * STYLE_FACTOR[a.style] * kindFactor) : Math.round(a.budget * strategy.extraWords);
  const checkRecall = normalized.language === 'en';

  const offline = renderOffline({
    target: a.target,
    intent: a.intent,
    style: a.style,
    slots: a.slots,
    template: a.template,
    context: opts.context,
    askQuestions,
    budget,
  });
  const validateFor = (prompt: string): ValidationReport =>
    validatePrompt({
      prompt,
      original: normalized.text,
      slots: a.slots,
      // Prose approaches have labelled bullets, not headed sections.
      structure: richMode && strategy.prose ? 'task-first' : a.profile.structure,
      budget,
      checkRecall,
      checkInventedTech: !richMode,
      minRecall: richMode ? 0.6 : 1,
      allowedTerms: [opts.context?.languageId ?? '', ...(opts.context?.workspaceFiles ?? [])],
    });

  // Without a model (and as the fallback when the model fails) the rules engine still writes the chosen approach
  // in full: a project gets the whole spec from built-in knowledge of that kind of product, a task gets the
  // approach's own sections on top of the brief.
  // Technologies the user named (or the editor's language): requirements, never options.
  const namedTech = [...a.slots.tech, ...(opts.context?.languageId ? [opts.context.languageId] : [])];
  const rich = richMode
    ? renderRichOffline({
        text: working,
        kind,
        intent: a.intent,
        strategy: strategy.id,
        structure: a.profile.structure,
        brief: offline.prompt,
        tech: namedTech,
        hasInputs: a.slots.inputs.length > 0,
        strategyName: strategy.name,
      })
    : undefined;
  let prompt = rich?.prompt ?? (a.profile.structure === 'image' ? offline.prompt : withOfflineApproach(offline.prompt, strategy.id, a.profile.structure));
  if (angle && a.profile.structure !== 'image') prompt = withAngle(prompt, angle, a.profile.structure);
  let changes = rich?.changes ?? offline.changes;
  if (angle) changes = [...changes, `Focus for this version: ${angle.name}`];
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
      budget,
      language: normalized.language,
      strategy,
      notes: richMode && kind === 'project' ? projectNotes(working, namedTech) : undefined,
      angle,
      askQuestions,
      alreadyStructured: a.alreadyStructured,
      missing: a.missing,
      context: opts.context,
    });
    const inputWords = a.slots.inputs.join(' ').split(/\s+/).length;
    const maxTokens = Math.round((budget + inputWords) * 2.2) + 200;

    try {
      opts.onStage?.('rewriting');
      let draft = postprocess(await runModel(provider, messages, opts, maxTokens, true, temperature));
      let report = validateFor(draft);

      // A repair is a second full generation. For the rich approaches (a few hundred words) it is only worth it
      // for real breakage; a missed filler word or a slightly long draft is not worth another minute.
      const mustFix = richMode ? report.issues.filter((i) => ['empty', 'meaning-drift', 'lost-input', 'template-leftover', 'preamble'].includes(i.code)) : report.issues;
      if (mustFix.length) {
        repairs = 1;
        opts.onStage?.('repairing');
        const fixed = postprocess(
          await runModel(provider, buildRepairMessages(messages, draft, mustFix), opts, maxTokens, false, temperature),
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
        prompt = richMode && kind === 'task' ? asTheUser(draft) : draft;
        validation = report;
        mode = 'llm';
        changes = [
          `Rewritten for ${a.profile.label} by ${provider.id}${provider.isLocal ? ' (on this computer)' : ''}, approach: ${strategy.name}${angle ? `, focus: ${angle.name}` : ''}`,
          ...(cleaned ? ['Fixed spelling and grammar in your message'] : []),
          ...offline.changes.slice(0, 4),
        ];
        // Validator messages are written for the model. The user only hears about what they might want to check.
        for (const i of report.issues) {
          const note = userNote(i);
          if (note) warnings.push(note);
        }
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
    intentSource,
    strategy: strategy.id,
    angle: angle ? { id: angle.id, name: angle.name } : undefined,
    variant,
    kind,
    cleaned,
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
