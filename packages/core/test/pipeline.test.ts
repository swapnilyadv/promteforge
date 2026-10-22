import { describe, expect, it } from 'vitest';
import {
  classifyIntent,
  detectLanguage,
  detectTarget,
  extractSlots,
  looksStructured,
  normalize,
  postprocess,
  validatePrompt,
  wordBudget,
} from '../src/index.js';

describe('detectTarget', () => {
  it.each([
    ['https://chatgpt.com/c/123', 'chatgpt'],
    ['https://chat.openai.com/', 'chatgpt'],
    ['https://claude.ai/new', 'claude'],
    ['https://gemini.google.com/app', 'gemini'],
    ['https://www.perplexity.ai/', 'perplexity'],
    ['https://chat.deepseek.com/', 'deepseek'],
    ['https://grok.com/', 'grok'],
    ['https://github.com/copilot', 'copilot'],
    ['https://github.com/user/repo', 'generic'],
    ['https://example.com', 'generic'],
  ])('%s → %s', (url, target) => {
    expect(detectTarget({ url })).toBe(target);
  });

  it('uses desktop app names and editor context', () => {
    expect(detectTarget({ appName: 'Code' })).toBe('vscode');
    expect(detectTarget({ appName: 'Code.exe' })).toBe('vscode');
    expect(detectTarget({ appName: 'Cursor' })).toBe('cursor');
    expect(detectTarget({ appName: 'Claude' })).toBe('claude');
    expect(detectTarget({ appName: 'Notion', windowTitle: 'ChatGPT - Chrome' })).toBe('chatgpt');
    expect(detectTarget({ languageId: 'python' })).toBe('vscode');
    expect(detectTarget()).toBe('generic');
  });
});

describe('classifyIntent — 10 intents', () => {
  it.each([
    ['make me a landing page for my bakery in react with tailwind', 'coding'],
    ['TypeError: Cannot read properties of undefined (reading map) in my react component, fix it', 'debugging'],
    ['write a blog post about morning routines, friendly tone, 800 words', 'writing'],
    ['write an email to my manager asking for 2 days leave next week', 'email'],
    ['research the latest electric scooter market in India and compare top competitors with sources', 'research'],
    ['analyze this sales csv and find the monthly revenue trend', 'analysis'],
    ['explain how transformers work in simple terms for a beginner', 'learning'],
    ['give me 10 name ideas for a coffee brand', 'brainstorming'],
    ['generate an image of a cyberpunk city at night, photorealistic, 4k', 'image'],
    ['automate this workflow: every morning scrape the news and then email me a summary', 'agent'],
  ])('%s → %s', (text, intent) => {
    expect(classifyIntent(text).intent).toBe(intent);
  });

  it('understands common Hinglish', () => {
    expect(classifyIntent('mujhe recursion samjhao simple tarike se').intent).toBe('learning');
    expect(classifyIntent('ek todo app banao react me').intent).toBe('coding');
  });

  it('falls back to other with zero confidence', () => {
    const r = classifyIntent('hmm');
    expect(r.intent).toBe('other');
    expect(r.confidence).toBe(0);
  });

  it('code targets bias toward coding', () => {
    expect(classifyIntent('add a dark mode toggle', 'vscode').intent).toBe('coding');
  });
});

describe('normalize', () => {
  it('strips pasted UI noise but never touches code', () => {
    const n = normalize('fix this\nCopy code\n```js\nconst a  =  1;\n\n\n\nconst b = 2;\n```\n\n\n\nthanks');
    expect(n.text).not.toMatch(/Copy code/);
    expect(n.text).toContain('const a  =  1;\n\n\n\nconst b = 2;');
    expect(n.text).not.toMatch(/\n{3}thanks/);
  });

  it('redacts secrets', () => {
    const n = normalize('my key is sk-proj-abcdefghijklmnopqrstuvwxyz123456 and password: hunter2!!');
    expect(n.redactions).toHaveLength(2);
    expect(n.text).toContain('[REDACTED_SECRET_1]');
    expect(n.text).not.toContain('sk-proj');
  });

  it('detects script language', () => {
    expect(detectLanguage('hello there')).toBe('en');
    expect(detectLanguage('मुझे एक वेबसाइट बनानी है')).toBe('hi');
    expect(detectLanguage('東京の天気を教えてください')).toBe('ja');
  });
});

describe('extractSlots', () => {
  it('pulls goal, audience, tone, length, format, tech, constraints', () => {
    const s = extractSlots(
      'Write a blog post about React hooks for beginners. Friendly tone, around 800 words. Use bullet points for the key ideas. Do not use jargon. Must include a code example.',
    );
    expect(s.goal).toBe('Write a blog post about React hooks for beginners.');
    expect(s.audience).toBe('beginners');
    expect(s.tone).toBe('friendly');
    expect(s.length).toBe('800 words');
    expect(s.format).toBe('bullet points');
    expect(s.tech).toContain('React');
    expect(s.constraints).toEqual(['Do not use jargon.', 'Must include a code example.']);
  });

  it('keeps code and stack traces verbatim as inputs', () => {
    const s = extractSlots('why does this crash\n```py\nprint(x)\n```\nNameError: name x is not defined');
    expect(s.inputs[0]).toBe('```py\nprint(x)\n```');
    expect(s.inputs[1]).toBe('NameError: name x is not defined');
    expect(s.goal).toBe('Why does this crash');
  });

  it('finds people as audience, not things', () => {
    const s = extractSlots('write an email to my landlord about the heater, firm but polite');
    expect(s.audience).toBe('my landlord');
    expect(s.tone).toBe('polite, firm');
    expect(extractSlots('make a landing page for my bakery').audience).toBeUndefined();
  });

  it('strips filler openings from the goal', () => {
    expect(extractSlots('hey can you summarize this article').goal).toBe('Summarize this article');
  });
});

describe('looksStructured', () => {
  it('spots prompts that are already engineered', () => {
    expect(looksStructured('You are a senior dev.\n## Goal\nx\n## Context\ny')).toBe(true);
    expect(looksStructured('make me a website')).toBe(false);
  });
});

describe('postprocess + validate', () => {
  it('removes preambles, wrapping fences and sign-offs', () => {
    const raw = "Here is your improved prompt:\n```markdown\n## Goal\nDo X\n## Output format\nY\n```\nLet me know if you need changes!";
    expect(postprocess(raw)).toBe('## Goal\nDo X\n## Output format\nY');
  });

  it('flags drift, missing structure, lost input, length', () => {
    const slots = extractSlots('build a stripe checkout page in nextjs with apple pay\n```ts\nexport const a = 1;\n```');
    const r = validatePrompt({
      prompt: 'Sure! Make a nice website.',
      original: 'build a stripe checkout page in nextjs with apple pay\n```ts\nexport const a = 1;\n```',
      slots,
      structure: 'xml',
      budget: 10,
    });
    const codes = r.issues.map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['preamble', 'meaning-drift', 'lost-input', 'missing-structure']));
    expect(r.ok).toBe(false);
  });

  it('accepts the section styles models actually write', () => {
    const check = (prompt: string, structure: 'markdown' | 'task-first') =>
      validatePrompt({ prompt, original: prompt, slots: extractSlots(prompt), structure, budget: 200 }).issues.map((i) => i.code);
    // Bold label with the colon inside, text on the same line (seen from qwen2.5 for Gemini)
    expect(check('Research intermittent fasting.\n\n**Context:** Recent studies.\n**Format:** Short summary.', 'task-first')).not.toContain('missing-structure');
    // "Label: value" lines
    expect(check('Role: Editor\nTask: Rewrite the paragraph.\nOutput format: The text only.', 'markdown')).not.toContain('missing-structure');
    // Numbered headings: "1. Goal", "2. Core features"
    expect(check('Prompt: Build an app\n\n1. Goal\nHelp me.\n\n2. Core features\n* Sign-up\n\nFirst task\nAsk me first.', 'markdown')).not.toContain('missing-structure');
    // A numbered list of sentences is not a heading
    expect(check('Please do this.\n1. User registers and then logs in to the app.\n2. User browses the long product catalog page.', 'markdown')).toContain('missing-structure');
    // Plain prose is still not structure
    expect(check('Please rewrite the paragraph so it is clearer and shorter.', 'markdown')).toContain('missing-structure');
  });

  it('budget stays proportionate to input size', () => {
    const tiny = extractSlots('what is rust');
    expect(wordBudget('detailed', 'what is rust', tiny)).toBeLessThanOrEqual(120);
    const long = 'word '.repeat(400);
    expect(wordBudget('concise', long, extractSlots(long))).toBeGreaterThanOrEqual(640);
  });
});
