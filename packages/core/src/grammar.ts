/**
 * Grammar fixes that need no model, for the slips people make most often when they type fast (many of them common
 * in Indian English): "she have", "an website", "it not load", "explain me", "how it work", "for learn",
 * "I am having 2 year experience", "revert back". Each rule is narrow, so correct sentences pass through unchanged.
 */

/** Verbs whose base form follows "to", "does not", "for → to". */
const BASE_VERBS =
  'learn|make|build|create|start|improve|get|write|design|develop|prepare|crack|clear|grow|run|sell|buy|find|fix|load|open|work|show|send|save|pay|book|track|manage|use|help|know|understand|speak|read|cook|play|earn|reduce|increase|launch|deploy|connect|upload|download|login|install|change|add|remove|support|allow|let';

/** Third-person -s: "help" → "helps", "have" → "has", "do" → "does", "fix" → "fixes", "carry" → "carries". */
function third(verb: string): string {
  if (verb === 'have') return 'has';
  if (verb === 'do') return 'does';
  if (verb === 'go') return 'goes';
  if (/(s|sh|ch|x|z)$/.test(verb)) return `${verb}es`;
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ies`;
  return `${verb}s`;
}

const PRESENT =
  'have|want|need|know|like|make|work|help|load|run|show|take|use|give|come|go|do|say|look|think|support|allow|let|sell|offer|provide|track|manage|keep|open|send|save|cost|look|seem|crash|break|stop|start|fail|return|contain|include|mean';

const LANGUAGES = 'english|hindi|marathi|tamil|telugu|bengali|gujarati|kannada|malayalam|punjabi|urdu|french|spanish|german|japanese|chinese|arabic|korean|russian|italian|portuguese';
const PROPER = new Map(
  Object.entries({
    javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', java: 'Java', php: 'PHP', html: 'HTML', css: 'CSS',
    sql: 'SQL', api: 'API', apis: 'APIs', ui: 'UI', ux: 'UX', seo: 'SEO', ai: 'AI', iphone: 'iPhone', ios: 'iOS', android: 'Android',
    nodejs: 'Node.js', mongodb: 'MongoDB', mysql: 'MySQL', postgresql: 'PostgreSQL', github: 'GitHub', youtube: 'YouTube',
    linkedin: 'LinkedIn', instagram: 'Instagram', chatgpt: 'ChatGPT', excel: 'Excel', powerpoint: 'PowerPoint', figma: 'Figma',
    firebase: 'Firebase', django: 'Django', flutter: 'Flutter', kotlin: 'Kotlin', mba: 'MBA', cv: 'CV', pdf: 'PDF', upi: 'UPI', gst: 'GST',
  }),
);

type Rule = [RegExp, string | ((...m: string[]) => string)];

const ING: Record<string, string> = { wanting: 'want', needing: 'need', knowing: 'know', liking: 'like', having: 'have', understanding: 'understand', owning: 'own' };
/** Words after which a bare verb is correct: "make it work", "does it work", "will it load". */
const BARE_BEFORE = '(?<!\\b(?:make|makes|made|making|let|lets|help|helps|helping|have|has|see|watch|do|does|did|can|could|will|would|should|shall|may|might|must|to|not)\\s)';

const RULES: Rule[] = [
  // Word choice.
  [/\bfastly\b/gi, 'quickly'],
  [/\bkindly revert back\b/gi, 'please reply'],
  [/\brevert back\b/gi, 'reply'],
  [/\bkindly revert\b/gi, 'please reply'],
  [/\basap\b/gi, 'as soon as possible'],
  [/\bdo the needful and\s+/gi, ''],
  [/\bdo the needful\b/gi, 'help'],
  [/\bI have a doubt (about|on|in|regarding)\b/gi, 'I have a question $1'],
  [/\bvery much (slow|fast|good|bad|big|small|easy|hard|expensive|cheap|important|happy|sad)\b/gi, 'very $1'],
  [/\bdiscuss about\b/gi, 'discuss'],
  [/\bexplain me\b/gi, 'explain to me'],
  [/\btell me about how\b/gi, 'tell me how'],
  [/\b(\w+) company\b(?=\s|[.,!?]|$)/g, (m, w: string) => (/^[A-Z]/.test(w) && !/^(I|The|A|An|My|Our|Your|This|That)$/.test(w) ? w : m)],

  // Verb forms.
  [/\bI am (wanting|needing|knowing|liking|having|understanding|owning)\b/g, (_, v: string) => `I ${ING[v]}`],
  [/\b(\d+)\s+(year|month)s?\s+(?:of\s+)?experience\b/gi, (_, n: string, u: string) => `${n} ${u}${n === '1' ? '' : 's'} of experience`],
  [/\b(will|would|might|should|could) not able to\b/gi, '$1 not be able to'],
  [/\b(I) not able to\b/g, 'I am not able to'],
  [/\b(he|she|it) (don't|dont)\b/gi, (_, p: string) => `${p} doesn't`],
  [new RegExp(`\\b(he|she|it) not (${BASE_VERBS})\\b`, 'gi'), '$1 does not $2'],
  [new RegExp(`\\b(I|we|they|you) not (${BASE_VERBS})\\b`, 'g'), '$1 do not $2'],
  [new RegExp(`${BARE_BEFORE}\\b(he|she|it) (${PRESENT})\\b(?! to\\b)`, 'gi'), (m, p: string, v: string) => (v === 'let' ? m : `${p} ${third(v.toLowerCase())}`)],
  // "an app which help students" → "helps" (a singular noun before "which"/"that").
  [new RegExp(`\\b(an?|the|my|our|this) ((?:[a-z-]+ ){0,2}[a-z-]+[^s\\s]) (which|that|who) (${PRESENT})\\b`, 'gi'), (_, d: string, n: string, w: string, v: string) => `${d} ${n} ${w} ${third(v.toLowerCase())}`],
  [/\b(me and my|me and) (\w+) (want|wants|need|needs|are|is) /gi, (_, _a: string, who: string, v: string) => `my ${who} and I ${v.replace(/s$/, '').replace(/^is$/, 'are')} `],
  // "how compound interest work" → "works" (not "how I work", "how they work").
  [/\bhow ((?:[a-z]+ ){0,2}(?!s\b)[a-z]+[^s\W]) work\b/gi, (m, subject: string) => (/^(i|we|you|they|people|things)$|\b(do|does|did|can|could|will|would|should|to|not)\b/i.test(subject.trim()) ? m : `how ${subject} works`)],
  // "I want that my app should have X" → "I want my app to have X".
  [/\bI want that (my|the|our|this) ((?:[\w-]+ ){0,2}?[\w-]+) should (\w+)/g, 'I want $1 $2 to $3'],
  // "the best way for learn" → "to learn"; "cost for make" → "cost to make".
  [new RegExp(`\\bfor (${BASE_VERBS})\\b(?! (?:a|an|the)?\\s*(?:purpose|purposes|session|sessions|class|classes)\\b)`, 'gi'), (m, v: string) => (/^(support|help|work|use|login|download|upload|change)$/i.test(v) ? m : `to ${v}`)],
  [/\bsome (idea|tip|suggestion|example|option|recommendation)\b(?!s)/gi, 'some $1s'],
  // Questions with the verb in the wrong place: "How I can improve" → "How can I improve".
  [/(^|[.!?]\s+)(how|what|where|when|why) (I|we|you) (can|should|could|will|do|did|would) /gi, '$1$2 $4 $3 '],
  [/\b(help|helps) (\w+) for study\b/gi, '$1 $2 study'],
  // "a" / "an": "an website" → "a website" (but "an hour", "an honest"; "a" → "an" is handled before).
  [/\b([Aa])n ((?!hour|honest|honou?r|heir)[b-df-hj-np-tv-z][a-z-]*)/g, '$1 $2'],
  // Names of languages and of well-known products and technologies.
  [new RegExp(`\\b(${LANGUAGES})\\b`, 'gi'), (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()],
  [/\b[a-z]+\b/g, (w: string) => PROPER.get(w) ?? w],
];

/** Apply the grammar rules to a cleaned sentence. */
export function fixGrammar(text: string): string {
  let t = text;
  for (const [re, to] of RULES) t = t.replace(re, to as never);
  return t.replace(/\s{2,}/g, ' ');
}
