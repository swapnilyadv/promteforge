import type { Provider } from '@promptforge/providers';

/** Common slips people make when typing fast. Whole words only, so nothing inside other words changes. */
const TYPOS: Record<string, string> = {
  yhou: 'you', yuo: 'you', teh: 'the', hte: 'the', adn: 'and', taht: 'that', waht: 'what', wnat: 'want',
  recomend: 'recommend', recomendation: 'recommendation', definately: 'definitely', seperate: 'separate',
  wich: 'which', whcih: 'which', becuase: 'because', becasue: 'because', beacuse: 'because', thier: 'their',
  freind: 'friend', wierd: 'weird', occured: 'occurred', untill: 'until', alot: 'a lot', infomation: 'information',
  informaton: 'information', developement: 'development', enviroment: 'environment', buisness: 'business',
  bussiness: 'business', websit: 'website', webiste: 'website', wesbite: 'website', websitee: 'website',
  ecommerce: 'e-commerce', ecom: 'e-commerce', ecomm: 'e-commerce', promte: 'prompt', promt: 'prompt', pormte: 'prompt',
  mesage: 'message', messege: 'message', emial: 'email', eamil: 'email', ansewr: 'answer', answr: 'answer',
  lenght: 'length', widht: 'width', heigth: 'height', pls: 'please', plz: 'please', thx: 'thanks', cuz: 'because',
  dont: "don't", doesnt: "doesn't", cant: "can't", wont: "won't", isnt: "isn't", didnt: "didn't",
};

/**
 * Light clean-up that needs no model: collapse stray spaces, "i" → "I", a capital to start, and the common
 * slips above. Leaves anything with code or quotes alone.
 */
export function basicClean(text: string): string {
  if (/```|`[^`]+`|["“][^"”]{12,}["”]/.test(text)) return text;
  let t = text.replace(/[ \t]+/g, ' ').replace(/ +([,.!?;:])/g, '$1').trim();
  t = t.replace(/[A-Za-z][A-Za-z']*/g, (w) => {
    const fix = TYPOS[w.toLowerCase()];
    if (!fix) return w;
    return w[0] === w[0]!.toUpperCase() && w.length > 1 && w === w.toUpperCase() ? fix.toUpperCase() : fix;
  });
  t = t.replace(/\bi\b/g, 'I');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const numbers = (s: string) => s.match(/\d+(?:[.,]\d+)*/g) ?? [];
const wordCount = (s: string) => (s.match(/\S+/g) ?? []).length;

/**
 * Accept the model's corrected text only when it is plainly the same message: same numbers, no code lost,
 * and about the same length. Anything else (an answer, a rewrite, a translation) is rejected.
 */
export function acceptCleaned(original: string, cleaned: string): boolean {
  const c = cleaned.trim();
  if (!c) return false;
  if (/^(here('s| is)|sure|corrected|the corrected)/i.test(c)) return false;
  const o = wordCount(original);
  const n = wordCount(c);
  if (n < o * 0.65 || n > o * 1.5 + 2) return false;
  const have = new Set(numbers(c));
  if (!numbers(original).every((x) => have.has(x))) return false;
  if (original.includes('```') !== c.includes('```')) return false;
  // It must still be the same message: most of the original's words survive. A rewrite or an answer fails this.
  const tokens = (t: string) => (t.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((w) => w.length > 2);
  const orig = tokens(original);
  if (orig.length >= 3) {
    const kept = new Set(tokens(c));
    const share = orig.filter((w) => kept.has(w)).length / orig.length;
    if (share < 0.6) return false;
  }
  return true;
}

/** Ask the model to fix spelling, grammar and punctuation only. Returns undefined when it can't be trusted. */
export async function cleanWithModel(
  provider: Provider,
  text: string,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<string | undefined> {
  const words = wordCount(text);
  if (words < 2 || words > 300 || text.includes('```')) return undefined;
  try {
    const raw = await provider.generate({
      messages: [
        {
          role: 'system',
          content: [
            "You fix spelling, grammar and punctuation in a user's message. Rules:",
            '- Do not answer it, add to it, remove from it, reword the ideas, or translate it.',
            '- Keep every number, name, code snippet and quoted text exactly as written.',
            '- If the message is already clean, return it unchanged.',
            'Output only the corrected message, nothing else.',
          ].join('\n'),
        },
        { role: 'user', content: text },
      ],
      model: opts.model,
      temperature: 0,
      maxTokens: words * 3 + 40,
      signal: opts.signal,
    });
    const cleaned = raw.trim().replace(/^["“]|["”]$/g, '');
    return acceptCleaned(text, cleaned) ? cleaned : undefined;
  } catch (err) {
    if (opts.signal?.aborted) throw err;
    return undefined;
  }
}

const BOT = '(?:chat\\s*gpt|chatgpt|gpt|claude|gemini|copilot|cursor|grok|deepseek|perplexity|ai|bro|dude)';
const PROMPT_WORD = '(?:prompt|promt|promte|pormte|promp|prompte|prmpt)';
const MAKE_PROMPT = `(?:convert|turn|change|make|rewrite|transform|write)\\s+(?:this|it|that|the\\s+above|the\\s+following)\\s+(?:in\\s?to|to|as)\\s+(?:a\\s+|an\\s+|the\\s+)?(?:good\\s+|better\\s+|detailed\\s+|proper\\s+|professional\\s+|best\\s+)?${PROMPT_WORD}(?:\\s+for\\s+${BOT})?`;
const GREETING = new RegExp(`^\\s*(?:hey|hi|hello|yo|hii|heyy)\\s+${BOT}\\b[\\s,.:!-]*`, 'i');
const TRAILING = new RegExp(`[\\s,.;:-]*(?:(?:and|now|then|please|pls|plz|can\\s+you|could\\s+you)\\s+)*${MAKE_PROMPT}[\\s.!?]*$`, 'i');
const LEADING = new RegExp(`^\\s*(?:please\\s+|pls\\s+)?${MAKE_PROMPT}\\s*[:\\-]\\s*`, 'i');

/**
 * People type "hey chatgpt, ... convert this into a prompt for chatgpt". That is an instruction to PromptForge,
 * not part of the request, so it is removed before anything else. Returns the text unchanged if removing it would
 * leave almost nothing.
 */
export function stripRequestWrapper(text: string): string {
  let t = text.trim().replace(GREETING, '').replace(LEADING, '').replace(TRAILING, '').trim();
  t = t.replace(/^[,.:;\-\s]+/, '');
  return wordCount(t) >= 2 ? t : text.trim();
}
