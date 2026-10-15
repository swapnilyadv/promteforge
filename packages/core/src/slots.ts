import type { Slots } from './types.js';

const TECH = [
  'TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'Rust', 'C#', 'C++', 'PHP', 'Ruby', 'Kotlin', 'Swift', 'Dart',
  'React', 'Next.js', 'Vue', 'Nuxt', 'Svelte', 'Angular', 'Remix', 'Astro', 'Tailwind', 'Node.js', 'Express', 'NestJS',
  'Django', 'Flask', 'FastAPI', 'Spring', 'Laravel', 'Rails', 'Flutter', 'React Native', 'Electron', 'Tauri',
  'PostgreSQL', 'MySQL', 'MongoDB', 'SQLite', 'Redis', 'Supabase', 'Firebase', 'Prisma', 'GraphQL', 'REST',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Vercel', 'Cloudflare', 'Stripe', 'OpenAI', 'Ollama',
  'Framer Motion', 'Motion', 'GSAP', 'Three.js', 'WebGL', 'Vite', 'Webpack', 'Jest', 'Vitest', 'Playwright',
  'pandas', 'NumPy', 'PyTorch', 'TensorFlow', 'Excel', 'Google Sheets', 'Power BI', 'SQL', 'HTML', 'CSS',
  'VS Code', 'Chrome extension', 'WordPress', 'Shopify',
];

const TONES = [
  'formal', 'informal', 'casual', 'friendly', 'professional', 'funny', 'humorous', 'witty', 'persuasive',
  'polite', 'confident', 'warm', 'empathetic', 'enthusiastic', 'serious', 'playful', 'academic', 'technical',
  'simple', 'inspiring', 'motivational', 'neutral', 'assertive', 'apologetic', 'respectful', 'firm',
  'direct', 'diplomatic', 'urgent', 'grateful',
];

const FORMATS: [RegExp, string][] = [
  [/\b(as |in )?a? ?table\b/i, 'a table'],
  [/\bbullet(ed)?( points?| list)?\b/i, 'bullet points'],
  [/\bjson\b/i, 'JSON'],
  [/\byaml\b/i, 'YAML'],
  [/\bcsv\b/i, 'CSV'],
  [/\bmarkdown\b/i, 'Markdown'],
  [/\bstep[- ]by[- ]step\b/i, 'step-by-step numbered list'],
  [/\boutline\b/i, 'an outline'],
  [/\b(twitter|x) thread\b/i, 'a thread'],
  [/\btweet\b/i, 'a tweet'],
  [/\bcheck ?list\b/i, 'a checklist'],
  [/\bslides?\b/i, 'slides'],
  [/\b(numbered|ordered) list\b/i, 'a numbered list'],
];

const CONSTRAINT_RE =
  /\b(must|should(n'?t)?|need(s)? to|has to|have to|make sure|ensure|don'?t|do not|never|avoid|without|only|no more than|not more than|at least|at most|under \d+|keep it|limit|maximum|minimum|strictly|exactly|nahi|mat)\b/i;

const AUDIENCE_RE =
  /\b(?:for|to|aimed at|targeting)\s+((?:a |an |the |my |our )?(?:complete |total |absolute )?(?:beginners?|kids|children|students|developers|engineers|designers|marketers|recruiters?|hiring managers?|investors|executives|ceo|cto|boss|manager|team|clients?|customers?|users|parents|teachers|landlord|landlady|tenants?|neighbou?rs?|colleagues?|co-?workers?|professor|principal|hr|friends?|mom|dad|mother|father|wife|husband|doctor|interviewer|non[- ]technical (?:people|users|audience|readers)|general audience|\d+[- ]year[- ]olds?|[a-z]+ (?:developers|students|readers|audience|owners)))\b/i;

const LENGTH_RE =
  /\b(?:in |within |under |about |around |max(?:imum)? |at most )?(\d+(?:\s*[-–to]+\s*\d+)?)\s*(words|lines|sentences|paragraphs|bullet points|bullets|points|pages|slides|characters|chars|tweets|minutes?)\b/i;
const LENGTH_WORDS_RE = /\b(one[- ]liner|short|brief|concise|long|detailed|in[- ]depth|comprehensive|one paragraph|single paragraph)\b/i;

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((s) => s.length > 1);
}

function capFirst(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

export function extractSlots(text: string): Slots {
  const inputs: string[] = [];

  // 1. Verbatim material: fenced code, long quotes, stack traces.
  let prose = text.replace(/```[\s\S]*?```/g, (m) => {
    inputs.push(m.trim());
    return ' ';
  });
  prose = prose.replace(/"([^"\n]{60,})"|“([^”\n]{60,})”/g, (m) => {
    inputs.push(m.trim());
    return ' ';
  });
  const traceLines = prose.match(/^(?:\s+at .+|Traceback .+|\s*File ".+", line \d+.*|\w*Error: .+)$/gm);
  if (traceLines && traceLines.length) {
    inputs.push(traceLines.join('\n').trim());
    for (const l of traceLines) prose = prose.replace(l, ' ');
  }

  const sentences = splitSentences(prose);

  // 2. Simple attributes
  const audience = prose.match(AUDIENCE_RE)?.[1]?.trim();
  const toneHits = TONES.filter((t) => new RegExp(`\\b${t}\\b`, 'i').test(prose));
  const tone = toneHits.length ? toneHits.join(', ') : undefined;
  const lengthMatch = prose.match(LENGTH_RE);
  const length = lengthMatch
    ? `${lengthMatch[1]} ${lengthMatch[2]}`
    : prose.match(LENGTH_WORDS_RE)?.[1]?.toLowerCase();
  const format = FORMATS.find(([re]) => re.test(prose))?.[1];
  const tech = uniq(
    TECH.filter((t) => {
      const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\.js/i, '\\.?js');
      // Short / ambiguous names need word boundaries and correct case
      if (t === 'Go' || t === 'Motion' || t === 'REST' || t === 'SQL') {
        return new RegExp(`(^|[^A-Za-z])${esc}([^A-Za-z]|$)`).test(prose);
      }
      return new RegExp(`(^|[^A-Za-z])${esc}([^A-Za-z]|$)`, 'i').test(prose);
    }),
  ).filter((t, _, all) => !(t === 'Motion' && all.includes('Framer Motion')))
    .filter((t, _, all) => !(t === 'SQL' && all.some((x) => /SQL/.test(x) && x !== 'SQL')));

  // 3. Constraints vs. goal vs. details
  const constraints: string[] = [];
  const rest: string[] = [];
  for (const s of sentences) (CONSTRAINT_RE.test(s) ? constraints : rest).push(s);

  let goal = rest[0] ?? sentences[0] ?? text.trim().slice(0, 200);
  if (!rest.length && constraints.length) constraints.shift();
  const details = rest.slice(1);

  goal = capFirst(
    goal
      .replace(/^((hey|hi|hello|please|pls|plz|can you|could you|would you|i want you to|i need you to)[,\s]+)+/i, '')
      // "make me a …" / "build me a …" → "Make a …"
      .replace(/^(make|build|create|write|design|give|generate|draft)\s+me\s+/i, '$1 ')
      // "i want / i need a …" → "Create a …"
      .replace(/^i\s+(want|need)\s+(a|an)\s+/i, 'Create $2 ')
      .trim(),
  );

  return {
    goal,
    audience,
    tone,
    length,
    format,
    tech,
    constraints: uniq(constraints.map(capFirst)),
    inputs,
    details: uniq(details.map(capFirst)),
  };
}

/** How many of the high-value slots are still unknown for this intent. */
export function missingSlots(slots: Slots, wanted: (keyof Slots)[]): (keyof Slots)[] {
  return wanted.filter((k) => {
    const v = slots[k];
    return v === undefined || (Array.isArray(v) && v.length === 0) || v === '';
  });
}
