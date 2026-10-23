import type { Provider } from '@promptforge/providers';

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
  improove: 'improve', buildd: 'build', bulid: 'build', biuld: 'build', buld: 'build', buid: 'build', craete: 'create', cretae: 'create',
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

/**
 * Light clean-up that needs no model: collapse stray spaces, stretched words, chat shorthand and the common slips
 * above, "i" → "I", and a capital to start each sentence. Leaves anything with code or quotes alone.
 */
export function basicClean(text: string): string {
  if (/```|`[^`]+`|["“][^"”]{12,}["”]/.test(text)) return text;
  let t = text.replace(/[ \t]+/g, ' ').replace(/ +([,.!?;:])/g, '$1').trim();
  // Whole words only: not part of a number ("2nd"), a link, an email address, a path or a file name.
  t = t.replace(/(?<![\w'@./\\-])[A-Za-z][A-Za-z']*(?![\w@/\\-]|\.\w)/g, (word) => {
    const w = squeeze(word);
    const lower = w.toLowerCase();
    const lowerish = w === lower || w === lower.charAt(0).toUpperCase() + lower.slice(1);
    const fix = TYPOS[lower] ?? (lowerish ? SHORTHAND[lower] : undefined);
    if (!fix) return w;
    if (w.length > 1 && w === w.toUpperCase()) return fix.toUpperCase();
    return w[0] !== w[0]!.toLowerCase() ? fix.charAt(0).toUpperCase() + fix.slice(1) : fix;
  });
  t = t.replace(/\bi\b(?!\.\w)/g, 'I');
  // A capital after a full stop, except after abbreviations like "e.g." or "etc.".
  t = t.replace(/(^|[^.]\b\w+[.!?]+\s+)([a-z])/g, (m, before: string, c: string) =>
    /\b(e\.g|i\.e|etc|vs|approx|incl)\.\s+$/i.test(before) ? m : before + c.toUpperCase(),
  );
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
