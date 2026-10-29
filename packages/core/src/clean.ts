import type { Provider } from '@promptforge/providers';
import { fixGrammar } from './grammar.js';
import { correctWord } from './spell.js';
import { BRANDS, CITIES } from './words.js';

/** Common slips people make when typing fast. Whole words only, so nothing inside other words changes. */
const TYPOS: Record<string, string> = {
  yhou: 'you', yuo: 'you', teh: 'the', hte: 'the', adn: 'and', taht: 'that', tht: 'that', waht: 'what', wnat: 'want',
  recomend: 'recommend', recomendation: 'recommendation', recomended: 'recommended', definately: 'definitely',
  seperate: 'separate', wich: 'which', whcih: 'which', becuase: 'because', becasue: 'because', beacuse: 'because',
  becaue: 'because', thier: 'their', freind: 'friend', freindly: 'friendly', wierd: 'weird', occured: 'occurred',
  untill: 'until', alot: 'a lot', infomation: 'information', informaton: 'information', developement: 'development',
  enviroment: 'environment', buisness: 'business', bussiness: 'business', busness: 'business', bussines: 'business',
  busines: 'business', websit: 'website', webiste: 'website', wesbite: 'website', websitee: 'website', webstie: 'website',
  ecommerce: 'e-commerce', ecom: 'e-commerce', ecomm: 'e-commerce', promte: 'prompt', promt: 'prompt', pormte: 'prompt',
  prompte: 'prompt', prmpt: 'prompt', mesage: 'message', messege: 'message', emial: 'email', eamil: 'email',
  ansewr: 'answer', answr: 'answer', lenght: 'length', widht: 'width', heigth: 'height',
  recieve: 'receive', acheive: 'achieve', beleive: 'believe', begining: 'beginning', calender: 'calendar',
  comming: 'coming', commited: 'committed', existance: 'existence', goverment: 'government', grammer: 'grammar',
  happend: 'happened', immediatly: 'immediately', independant: 'independent', knowlege: 'knowledge', libary: 'library',
  managment: 'management', managemnt: 'management', neccessary: 'necessary', necesary: 'necessary', occassion: 'occasion',
  posible: 'possible', prefered: 'preferred', realy: 'really', resturant: 'restaurant', restaraunt: 'restaurant',
  sucess: 'success', succes: 'success', sucessful: 'successful', tommorow: 'tomorrow', tomorow: 'tomorrow',
  tommorrow: 'tomorrow', truely: 'truly', writting: 'writing', writeing: 'writing', aplication: 'application',
  applicaton: 'application', appliction: 'application', applcation: 'application', databse: 'database',
  fucntion: 'function', funtion: 'function', fuction: 'function', langauge: 'language', languge: 'language',
  langugae: 'language', progam: 'program', projetc: 'project', projcet: 'project', porject: 'project',
  requirment: 'requirement', requirments: 'requirements', featuers: 'features', fetures: 'features', featurs: 'features', featur: 'feature', feautres: 'features',
  desgin: 'design', desing: 'design', devlop: 'develop', develp: 'develop', devloper: 'developer', custmer: 'customer',
  cutomer: 'customer', custmers: 'customers', cutomers: 'customers', prodcut: 'product', prodct: 'product',
  produt: 'product', prodcuts: 'products', servise: 'service', paymnet: 'payment', paymet: 'payment',
  dashbaord: 'dashboard', dashbord: 'dashboard', stundent: 'student', studnet: 'student', jsut: 'just', konw: 'know',
  knwo: 'know', thnik: 'think', shoudl: 'should', woudl: 'would', coudl: 'could', abotu: 'about', baout: 'about',
  wiht: 'with', yuor: 'your', yoru: 'your', hepl: 'help', exmaple: 'example', exampel: 'example', examle: 'example',
  explian: 'explain', expalin: 'explain', artical: 'article', assigment: 'assignment', assignmnet: 'assignment',
  intrview: 'interview', interveiw: 'interview', salry: 'salary', sallary: 'salary', aplly: 'apply', comapny: 'company',
  compnay: 'company', compny: 'company', markting: 'marketing', marketting: 'marketing', strategey: 'strategy',
  stratergy: 'strategy', startegy: 'strategy', anaylsis: 'analysis', analsis: 'analysis', analysys: 'analysis',
  reserch: 'research', reasearch: 'research', resarch: 'research', compair: 'compare', diffrent: 'different',
  differnt: 'different', diffrence: 'difference', beutiful: 'beautiful', beautifull: 'beautiful', imporve: 'improve',
  improove: 'improve', mak: 'make', manger: 'manager', manege: 'manage', writ: 'write', creat: 'create', buildd: 'build', bulid: 'build', biuld: 'build', buld: 'build', buid: 'build', craete: 'create', cretae: 'create',
  wirte: 'write', wrtie: 'write', acount: 'account', accout: 'account', pasword: 'password', passwrod: 'password',
  registeration: 'registration', registraion: 'registration', adress: 'address', addres: 'address', mobiel: 'mobile',
  moblie: 'mobile', andriod: 'Android', androd: 'Android', resposive: 'responsive', responsiv: 'responsive',
  intergrate: 'integrate', integerate: 'integrate', authentification: 'authentication', authetication: 'authentication',
  autentication: 'authentication', notifcation: 'notification', notificaton: 'notification', notifcations: 'notifications',
  detial: 'detail', detials: 'details', deatils: 'details', breif: 'brief', frist: 'first', fisrt: 'first', thrid: 'third',
  everythig: 'everything', everyting: 'everything', evrything: 'everything', somthing: 'something', someting: 'something',
  anythign: 'anything', anyting: 'anything', nothign: 'nothing', peopel: 'people', poeple: 'people',
  ofcourse: 'of course', infact: 'in fact', atleast: 'at least', aswell: 'as well', incase: 'in case',
  eachother: 'each other', noone: 'no one',
  // Dropped "g": buildin → building.
  buildin: 'building', makin: 'making', workin: 'working', tryin: 'trying', lookin: 'looking', goin: 'going',
  doin: 'doing', gettin: 'getting', thinkin: 'thinking', plannin: 'planning', sellin: 'selling', runnin: 'running',
  learnin: 'learning', talkin: 'talking', startin: 'starting', codin: 'coding', writin: 'writing', usin: 'using',
  // Contractions without the apostrophe.
  dont: "don't", doesnt: "doesn't", cant: "can't", wont: "won't", isnt: "isn't", didnt: "didn't", im: "I'm",
  ive: "I've", thats: "that's", whats: "what's", youre: "you're", shouldnt: "shouldn't", wouldnt: "wouldn't",
  couldnt: "couldn't", arent: "aren't", wasnt: "wasn't", havent: "haven't",
};

/** Chat shorthand. Only fixed when typed in lower case (or with a capital first letter), so "U" or "UR" in code or names stays. */
const SHORTHAND: Record<string, string> = {
  u: 'you', ur: 'your', wht: 'what', wat: 'what', abt: 'about', bcoz: 'because', bcz: 'because', bcos: 'because',
  becoz: 'because', becuz: 'because', bcuz: 'because', coz: 'because', cuz: 'because', msg: 'message', msgs: 'messages',
  frnd: 'friend', frnds: 'friends', thx: 'thanks', thnx: 'thanks', thanx: 'thanks', ppl: 'people', hv: 'have',
  wid: 'with', widout: 'without', wud: 'would', cud: 'could', shud: 'should', gud: 'good', pls: 'please', plz: 'please',
  tmrw: 'tomorrow', tmr: 'tomorrow', tdy: 'today', nxt: 'next', smth: 'something', sth: 'something', evry: 'every',
  sry: 'sorry', wen: 'when', dat: 'that', ths: 'this', frm: 'from', gimme: 'give me', lemme: 'let me',
  dunno: "don't know", wanna: 'want to', gonna: 'going to', kinda: 'kind of', btw: 'by the way', idk: "I don't know",
  imo: 'in my opinion', tbh: 'to be honest', pic: 'picture', pics: 'pictures', convo: 'conversation',
};

/** Real words that end in a double letter, so "alll" becomes "all" but "builddd" becomes "build". */
const DOUBLE_END = new Set(
  'all still will full call well tell small sell fall wall ball skill fill bill kill spell shell smell dull doll roll troll see free three tree agree fee knee coffee employee guarantee too zoo good cool food mood book look need feed seed speed feel keen less miss boss class pass process success access address business guess stuff staff off add odd egg inn buzz jazz fizz'.split(' '),
);

/** "pleaseee" → "please", "sooo" → "so", "gooood" → "good". Leaves "www", "zzz" and all-caps words alone. */
function squeeze(word: string): string {
  if (!/([a-z])\1\1/i.test(word) || word === word.toUpperCase() || /^(.)\1*$/i.test(word)) return word;
  // Inside a word, a run of three or more is almost always a double ("gooood" → "good").
  let w = word.replace(/([a-z])\1{2,}(?=[a-z])/gi, '$1$1');
  // At the end, prefer the single letter unless the double makes a real word ("alll" → "all").
  w = w.replace(/([a-z])\1{2,}$/i, (_, c: string) => (DOUBLE_END.has((w.replace(/([a-z])\1{2,}$/i, '') + c + c).toLowerCase()) ? c + c : c));
  return w;
}

const BRAND_CASE = new Map([...BRANDS, ...CITIES].filter((b) => !/\s/.test(b)).map((b) => [b.toLowerCase(), b]));

/**
 * Light clean-up that needs no model: collapse stray spaces, stretched words, chat shorthand and the common slips
 * above, "i" → "I", and a capital to start each sentence. Leaves anything with code or quotes alone.
 */
export function basicClean(text: string): string {
  if (/```|`[^`]+`|["“][^"”]{12,}["”]/.test(text)) return text;
  let t = text.replace(/[ \t]+/g, ' ').replace(/ +([,.!?;:])/g, '$1').trim();
  // Whole words only: not part of a number ("2nd"), a link, an email address, a path or a file name.
  t = t.replace(/(?<![\w'@./\\-])[A-Za-z][A-Za-z']*(?![\w@/\\-]|\.\w)/g, (word, at: number) => {
    const w = squeeze(word);
    const lower = w.toLowerCase();
    const lowerish = w === lower || w === lower.charAt(0).toUpperCase() + lower.slice(1);
    let fix = TYPOS[lower] ?? (lowerish ? SHORTHAND[lower] : undefined);
    // Any other misspelling: only for a word typed in lower case (or capitalised to start a sentence), because a
    // capital in the middle of a sentence is usually a name.
    if (!fix && (w === lower || (lowerish && /(^|[.!?]\s+)$/.test(t.slice(0, at))))) {
      const near = correctWord(lower);
      if (near) fix = TYPOS[near] ?? near;
    }
    if (!fix) return w;
    if (w.length > 1 && w === w.toUpperCase()) return fix.toUpperCase();
    return w[0] !== w[0]!.toLowerCase() ? fix.charAt(0).toUpperCase() + fix.slice(1) : fix;
  });
  // "like wise Flipkart" means "like Flipkart" ("likewise" is not what people mean in a request).
  t = t.replace(/\blike\s+wise\s+(?=[a-z])/gi, 'like ');
  // Brand and city names in their usual spelling: "flipkart" → "Flipkart", "whatsapp" → "WhatsApp", "pune" → "Pune".
  t = t.replace(/\b[a-z][a-z']+\b/g, (w) => BRAND_CASE.get(w) ?? w);
  // "a app", "a e-commerce site" → "an". Not before a "you" sound ("a user", "a unique") or "one".
  t = t.replace(/\b([Aa]) (?=([aeiou][a-z-]*))/g, (m, a: string, next: string) =>
    /^(uni|use|usa|usu|uti|ure|uro|one|once|eu)/i.test(next) ? m : `${a}n `,
  );
  // "track there workouts" → "their" (not "there is", "there seems", ...).
  t = t.replace(/\bthere (?=(?!(?:is|was|has|goes|comes|seems|lives|exists|lies|stands|appears|remains|happens)\b)[a-z]{3,}s\b)/g, 'their ');
  t = t.replace(/\bi\b(?!\.\w)/g, 'I');
  t = fixGrammar(t);
  // A capital after a full stop, except after abbreviations like "e.g." or "etc.".
  t = t.replace(/(^|[^.]\b\w+[.!?]+\s+)([a-z])/g, (m, before: string, c: string) =>
    /\b(e\.g|i\.e|etc|vs|approx|incl)\.\s+$/i.test(before) ? m : before + c.toUpperCase(),
  );
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Hinglish words and the English ones they stand for in a request (after the sentence is put in English order). */
const HINGLISH_WORDS: [RegExp, string][] = [
  // "X kaise kaam karta hai" → "how X works"; "X kya hai" → "what X is".
  [/^(.+?)\s+kaise\s+kaam\s+(?:karta|karti|karte)(?:\s+(?:hai|hain|h))?\b/i, 'how $1 works'],
  [/^(.+?)\s+kya\s+(?:hai|hota hai|hoti hai|hote hain|h)\b/i, 'what $1 is'],
  // Postpositions come after the noun in Hindi: "mere shop ke liye" → "for my shop", "boss ko" → "to boss".
  [/\b(?:(?:mere|meri|mera|apne|apni|apna|hamare)\s+)([\w-]+)\s+(?:ke|k)\s+liye\b/gi, 'for my $1'],
  [/\b([\w-]+)\s+(?:ke|k)\s+liye\b/gi, 'for $1'],
  [/\b(?:(?:mere|meri|mera|apne|apni|apna)\s+)([\w-]+)\s+ko\b/gi, 'to my $1'],
  [/\b([\w-]+)\s+ko\b/gi, 'to $1'],
  [/\b([\w-]+)\s+(?:ke saath|ke sath|k sath)\b/gi, 'with $1'],
  [/\b([\w-]+)\s+(?:jaisa|jaisi)\b/gi, 'like $1'],
  [/\b(jisme|jismein|jisme ki|jismai|jiske andar|jisme mein)\b/gi, 'with'],
  [/\b(jaise|jese)\b/gi, 'like'],
  [/\b(aur|or bhi)\b/gi, 'and'],
  [/\b(mera|meri|mere|apna|apni|apne)\b/gi, 'my'],
  [/\bhamara|hamari|hamare\b/gi, 'our'],
  [/\bbhi\b/gi, 'also'],
  [/\bya\b/gi, 'or'],
  [/\bek\b/gi, 'a'],
  [/\s+(ho|hon|hona chahiye|hone chahiye|ho sake|hai|hain|h)\s*([.!?]*)$/i, '$2'],
];
const HINGLISH_CUES = /\b(mujhe|muje|mereko|hume|humein|hamein|banana|banani|banwana|banao|bana ?do|bana ?de|chahiye|chaiye|jisme|jismein|aur|ke liye|kaise|kya|karna|hai|ho|ek|jaise|jese|ko|likh ?do|likho|samjhao|samjha ?do)\b/gi;
/** The thing asked for, in English order: "flipkart jaisa ek app" → "a app like flipkart" (a/an is fixed later). */
const thing = (raw: string, words: (s: string) => string) => words(raw).replace(/^like\s+(\S+)\s+(.+)$/i, '$2 like $1');
const article = (rest: string) => (/^(a|an|the|my)\s/i.test(rest) ? rest : /^[aeiou]/i.test(rest) ? `an ${rest}` : `a ${rest}`);

/**
 * Common Hinglish requests in English, so the prompt reads as one language: "mujhe ek fitness app banana hai jisme
 * diet plan ho" → "I want to build a fitness app with diet plan". Only the usual request shapes are handled;
 * anything else is left as written (the model, when connected, handles the rest).
 */
export function hinglishToEnglish(text: string): string {
  const t = text.trim();
  if ((t.match(HINGLISH_CUES) ?? []).length < 2) return t;
  const words = (s: string) => HINGLISH_WORDS.reduce((acc, [re, en]) => acc.replace(re, en), s).replace(/\s+/g, ' ').trim();
  const shapes: [RegExp, (m: RegExpMatchArray) => string][] = [
    // mujhe ek X banana hai [jisme ...] → I want to build a X [with ...]
    [/^(?:mujhe|muje|mereko|hume|humein|hamein)\s+(?:ek\s+)?(.+?)\s+(?:banana|banani|banwana|banwani|bnana)\s+(?:hai|h|he|tha)\b\s*(.*)$/i, (m) => `I want to build ${article(thing(m[1]!, words))} ${words(m[2]!)}`],
    // mujhe ek X chahiye [jisme ...] → I need a X [with ...]
    [/^(?:mujhe|muje|mereko|hume|humein|hamein)\s+(?:ek\s+)?(.+?)\s+(?:chahiye|chaiye)\b\s*(.*)$/i, (m) => `I need ${article(thing(m[1]!, words))} ${words(m[2]!)}`],
    // mere X ke liye ek Y banao → Build a Y for my X
    [/^(?:mere|meri|mera|hamare|apne)\s+(.+?)\s+(?:ke|ki|k)\s+liye\s+(?:ek\s+)?(.+?)\s+(?:banao|bana ?do|bana ?de|banado|banade)\b\s*(.*)$/i, (m) => `Build ${article(thing(m[2]!, words))} for my ${words(m[1]!)} ${words(m[3]!)}`],
    // [mujhe] ek X likh do [boss ko ...] → Write a X [to boss ...]
    [/^(?:mujhe|muje|mereko|hume|humein)?\s*(?:ek\s+)?(.+?)\s+(?:likh\s*do|likh\s*de|likh\s*dijiye|likho|likhna\s+hai|likh\s+ke\s+do)\b\s*(.*)$/i, (m) => `Write ${article(thing(m[1]!, words))} ${words(m[2]!)}`],
    // X samjhao → Explain X
    [/^(?:mujhe|muje|hume)?\s*(.+?)\s+(?:samjhao|samjha\s*do|samjha\s*dijiye|explain\s+karo|explain\s+kar\s*do)\b\s*(.*)$/i, (m) => `Explain ${words(m[1]!)} ${words(m[2]!)}`],
    // ek X banao [jisme ...] → Build a X [with ...]
    [/^(?:ek\s+)?(.+?)\s+(?:banao|bana ?do|bana ?de|banado|banade)\b\s*(.*)$/i, (m) => `Build ${article(thing(m[1]!, words))} ${words(m[2]!)}`],
  ];
  for (const [re, make] of shapes) {
    const m = t.match(re);
    if (m) return make(m).replace(/\s+/g, ' ').trim();
  }
  return t;
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
  // Only Latin-script text: a small model asked to "fix" Hindi or Arabic script tends to translate it instead.
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length && letters.filter((c) => c > '\u024f').length / letters.length > 0.2) return undefined;
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
// "hey chatgpt", "hi there", "hey iu" (a slip for "you"), but not "hey I want..." or "hi, can you...".
const GREETING = new RegExp(
  `^\\s*(?:hey|hi|hello|yo|hii|hiii|heyy|hlo|helo)\\b(?:\\s+${BOT}\\b|\\s+(?:there|bro|dude|buddy|man|sir|mam|ji|team)\\b|\\s+(?!(?:i|im|i'm|my|me|we|so|can|pls|plz|please|need|want|how|what|why)\\b)[a-z]{1,3}\\b)?[\\s,.:!-]*`,
  'i',
);
// "... can you build an application for me": the same request again, at the end.
const ASK_AGAIN = /[\s,.;:-]*(?:(?:so|and|now|then)\s+)?(?:can|could|will|would)\s+(?:you|u)\s+(?:please\s+|pls\s+)?(?:build|make|create|develop|design|do)\s+(?:it|this|that|one|(?:an?|the|my)\s+(?:[\w-]+\s+){0,2}?(?:apps?|applications?|websites?|sites?|platforms?|stores?|software|system))(?:\s+for\s+(?:me|us))?(?:\s+(?:please|pls|plz))?[\s.?!]*$/i;
const TRAILING = new RegExp(`[\\s,.;:-]*(?:(?:and|now|then|please|pls|plz|can\\s+you|could\\s+you)\\s+)*${MAKE_PROMPT}[\\s.!?]*$`, 'i');
const LEADING = new RegExp(`^\\s*(?:please\\s+|pls\\s+)?${MAKE_PROMPT}\\s*[:\\-]\\s*`, 'i');

/**
 * People type "hey chatgpt, ... convert this into a prompt for chatgpt". That is an instruction to PromptForge,
 * not part of the request, so it is removed before anything else. Returns the text unchanged if removing it would
 * leave almost nothing.
 */
export function stripRequestWrapper(text: string): string {
  let t = text.trim().replace(GREETING, '').replace(LEADING, '').replace(TRAILING, '').trim();
  const withoutAsk = t.replace(ASK_AGAIN, '').trim();
  // Only when what is left still says what to build ("I want to build an e-commerce website").
  if (withoutAsk !== t && /\b(build|make|create|develop|design|want|need|start|launch)\b/i.test(withoutAsk)) t = withoutAsk;
  t = t.replace(/^[,.:;\-\s]+/, '');
  return wordCount(t) >= 2 ? t : text.trim();
}
