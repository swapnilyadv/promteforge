import { isCodeTarget } from './target.js';
import type { Intent, IntentResult, Target } from './types.js';

type Rule = { re: RegExp; w: number };

/**
 * Weighted keyword rules per intent. Fast, offline and explainable.
 * Includes a few common Hinglish verbs (banao, likho, samjhao…) since many users mix languages.
 */
const RULES: Record<Exclude<Intent, 'other'>, Rule[]> = {
  debugging: [
    { re: /\b(not (breaking|loading|showing|updating|saving|responding|rendering|returning)|keeps? (running|crashing|failing|freezing|restarting|reloading)|infinite loop|runs? forever|never (stops|ends|finishes)|throws? (an? )?(error|exception)|unexpected(ly)?)\b/i, w: 2 },
    { re: /\b(bug|error|exception|traceback|stack ?trace|crash(es|ed|ing)?|undefined is not|null pointer|segfault)\b/i, w: 3 },
    // Everyday words — "broken heater" is not a bug report — so they only count a little.
    { re: /\b(fails?|failing|broken|not working|doesn'?t work|isn'?t working|fix (this|my|the))\b/i, w: 1 },
    { re: /\b(TypeError|ReferenceError|SyntaxError|ValueError|KeyError|NullPointerException|ECONNREFUSED|ModuleNotFoundError|ImportError)\b|\b(http|status|error|code)\s*(404|500|502|503)\b|\b(404|500|502|503)\s*(error|not found|internal)/i, w: 3 },
    { re: /^\s+at .+\(.+:\d+:\d+\)$/m, w: 4 },
    { re: /\b(debug|why (is|does|am)|kaam nahi kar|chal nahi raha)\b/i, w: 2 },
  ],
  coding: [
    { re: /\b(write|create|make|build|need|implement|generate)\b[^.\n]{0,40}\b(program|function|formula|macro|module|library|package|snippet|algorithm|middleware|endpoint|query)\b/i, w: 3 },
    { re: /```/, w: 1 },
    { re: /\b(sql|postgres(ql)?|mysql|sqlite)\s+(query|queries|statement)\b|\bselect\b[\s\S]*\bfrom\b/i, w: 2 },
    { re: /\b(code|function|component|api|endpoint|(?<!video |movie |ad |youtube )script|regex|sql|query|refactor|implement|unit tests?|typescript|javascript|python|java|golang|rust|react|next\.?js|node|django|flask|fastapi|express|tailwind|html|css|kotlin|swift|flutter|docker|kubernetes|database|schema|backend|frontend|repo|npm|pip)\b/i, w: 2 },
    { re: /\b(build|create|make|banao|bana do)\b.*\b(app|website|web ?app|landing page|extension|bot|cli|tool|dashboard|api|game|plugin)\b/i, w: 3 },
    { re: /\b(convert|migrate|port) .* (to|into) (typescript|python|react|go|rust|java)\b/i, w: 3 },
  ],
  email: [
    // "email me the result" is a delivery step, not a request to write an email.
    { re: /\b(e-?mail(?! (me|us|it|them)\b)|mail to|reply to|follow[- ]up|cover letter|linkedin message|dm|whatsapp message|message to my)\b/i, w: 3 },
    { re: /\b(dear|regards|subject line)\b/i, w: 2 },
  ],
  writing: [
    { re: /\b(sound|make (it|this|that)( sound)?)\s+(more\s+)?(professional|polite|formal|friendly|natural|concise|clearer|engaging|persuasive)\b|\b(reword|rephrase|paraphrase|improve (this|my) (text|writing|sentence|paragraph|essay))\b/i, w: 3 },
    // The bare verb is weak evidence ("write a python script" is coding); the thing being written is strong.
    { re: /\b(write|draft|rewrite|edit|proofread|likho|likh do)\b/i, w: 1 },
    { re: /\b(essay|article|blog|post|story|poem|haiku|caption|speech|bio|description|copy|tagline|slogan|headline|script for|(video|podcast|ad|reel|youtube) script)\b/i, w: 2 },
    { re: /\b(tone|word count|\d+\s*words|paragraphs?|seo)\b/i, w: 1 },
  ],
  research: [
    { re: /\b(right now|currently|as of (today|now)|in 20\d\d|highest|lowest|most (popular|affordable|reliable)|which .{0,30} (give|offer|have))\b/i, w: 2 },
    { re: /\b(research|find (out|sources|papers)|sources|citations?|cite|latest|current|news|compare|comparison|vs\.?|versus|market|competitors?|statistics|studies|evidence|pros and cons)\b/i, w: 2 },
    { re: /\b(what is the best|which is better|top \d+|best|cheapest|worth buying)\b/i, w: 2 },
  ],
  analysis: [
    { re: /\b(conversion rate|bounce rate|churn|retention|ctr|roi|margins?|growth rate|cac|ltv|nps)\b|what does (a|an|the) .{0,40} (tell|mean|indicate|suggest)|\bfrom \d+(\.\d+)?%\s+to\s+\d+(\.\d+)?%/i, w: 2 },
    { re: /\b(analy[sz]e|analysis)\b/i, w: 3 },
    { re: /\b(data(set)?|csv|excel|spreadsheet|chart|graph|metrics|kpi|trend|forecast|insights?|summari[sz]e (this|the) (data|report)|financials?|revenue)\b/i, w: 2 },
  ],
  learning: [
    { re: /\b(explain|teach me|how does|how do|what is|what are|eli5|understand|learn|tutorial|step by step|samjhao|samjha do|kya hai|kaise)\b/i, w: 2 },
    { re: /\b((for|as) an? (complete )?beginner|for a \d+[- ]year[- ]old|like i'?m \d+|in simple (words|terms))\b/i, w: 2 },
  ],
  brainstorming: [
    { re: /\b(ideas?|brainstorm|suggest(ions)?|names? for|options for|ways to)\b/i, w: 3 },
    { re: /\b(creative|concepts?|themes?)\b/i, w: 1 },
  ],
  image: [
    { re: /\b(lighting|aesthetic|cinematic|aspect ratio|anime|watercolou?r|oil painting|digital art|golden hour|bokeh|depth of field|35mm|isometric|concept art|studio ghibli|pixel art)\b|--ar\b/i, w: 2 },
    { re: /^\s*(draw|paint|sketch|imagine|visuali[sz]e|generate a(n)? (scene|landscape|portrait|character|room|nook))\b/i, w: 2 },
    { re: /\b(image|picture|photo|illustration|logo|poster|wallpaper|render|midjourney|dall-?e|stable diffusion|art(work)?|drawing|painting|4k|8k|photorealistic)\b/i, w: 2 },
    { re: /\b(generate|create|make|draw)\b.*\b(image|picture|photo|illustration|logo|poster|art)\b/i, w: 3 },
  ],
  agent: [
    { re: /\b(automate|automation|workflow|agent)\b/i, w: 3 },
    { re: /\b(every (day|week|morning|evening|hour)|daily|schedule|scrape|monitor|pipeline|then (send|email|post|save))\b/i, w: 2 },
  ],
};

const INTENTS: Intent[] = [
  'coding',
  'debugging',
  'writing',
  'email',
  'research',
  'analysis',
  'learning',
  'brainstorming',
  'image',
  'agent',
  'other',
];

const TIE_ORDER: Intent[] = [
  'debugging',
  'email',
  'writing',
  'research',
  'analysis',
  'learning',
  'brainstorming',
  'agent',
  'coding',
  'image',
  'other',
];

export function classifyIntent(text: string, target: Target = 'generic'): IntentResult {
  const scores = Object.fromEntries(INTENTS.map((i) => [i, 0])) as Record<Intent, number>;
  for (const [intent, rules] of Object.entries(RULES) as [Intent, Rule[]][]) {
    for (const { re, w } of rules) if (re.test(text)) scores[intent] += w;
  }

  // Context priors
  if (target === 'image') scores.image += 4;
  if (isCodeTarget(target)) {
    scores.coding += 0.5; // a nudge only: it must never beat a clearly stated non-code task
    scores.debugging += scores.debugging > 0 ? 1 : 0;
  }
  // Debugging implies code; make it win over generic coding when both fire.
  if (scores.debugging >= 3 && scores.coding > 0) scores.debugging += 1;
  // "explain this code" is learning, not coding
  if (scores.learning > 0 && /\bexplain\b/i.test(text) && scores.debugging === 0) scores.learning += 1;
  // Image words inside a coding request ("add an image carousel") shouldn't flip it.
  if (scores.coding >= 2 && scores.image < 4) scores.image = 0;
  // "automate … save every email attachment" is an automation, not an email to write.
  if (scores.agent >= 3 && scores.email > 0) scores.email = Math.max(0, scores.email - 2);

  let best: Intent = 'other';
  let max = 0;
  let total = 0;
  // Ties go to the more specific intent; 'coding' keywords are broad, so it loses ties.
  for (const i of TIE_ORDER) {
    total += scores[i];
    if (scores[i] > max) {
      max = scores[i];
      best = i;
    }
  }
  const confidence = max === 0 ? 0 : Math.min(1, max / Math.max(total, 1) + Math.min(max, 6) / 20);
  return { intent: max === 0 ? 'other' : best, confidence: Number(confidence.toFixed(2)), scores };
}
