import { PROTECTED_WORDS } from './protected-words.js';
import { COMMON_WORDS, KEY_TERMS } from './words.js';

/**
 * Offline spelling fixer for words the typo list does not know: "applicariton" → "application",
 * "featurs" → "features", "exomcmmer" → "ecommerce". It only changes a word it does not recognise, and only to a
 * close, common word, so real but rare words ("heater", "dosa"), names and code are left alone.
 */
const VOCAB = [...new Set(COMMON_WORDS.split(/\s+/).filter(Boolean))];
const VOCAB_SET = new Set(VOCAB);
const KEYS = [...new Set(KEY_TERMS.split(/\s+/).filter(Boolean))];
/** Real English words that sit close to a common word ("heater" near "header"): never "corrected". */
const PROTECTED = new Set(PROTECTED_WORDS.split(' '));

/** Is this a word we recognise, directly or as a regular form of one (plural, -ed, -ing, -er, -ly, un-, re-)? */
export function isKnownWord(word: string): boolean {
  const w = word.toLowerCase().replace(/'s$/, '');
  if (VOCAB_SET.has(w)) return true;
  const stems: string[] = [];
  const cut = (suffix: string, add = '') => w.endsWith(suffix) && w.length > suffix.length + 2 && stems.push(w.slice(0, -suffix.length) + add);
  cut('s'); cut('es'); cut('ies', 'y');
  cut('ed'); cut('d'); cut('ied', 'y');
  cut('ing'); cut('ing', 'e');
  cut('er'); cut('ers');
  cut('ly'); cut('ily', 'y'); cut('est'); cut('ment'); cut('ness'); cut('ful'); cut('less'); cut('able'); cut('ation', 'e');
  // A doubled last letter before -ed / -ing / -er: "planned", "running", "shopper".
  for (const s of ['ed', 'ing', 'er']) if (new RegExp(`(.)\\1${s}$`).test(w)) stems.push(w.slice(0, -s.length - 1));
  for (const p of ['un', 're', 'pre']) if (w.startsWith(p) && w.length > p.length + 3) stems.push(w.slice(p.length));
  return stems.some((s) => VOCAB_SET.has(s));
}

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const POS = new Map<string, [number, number]>();
ROWS.forEach((row, r) => [...row].forEach((c, i) => POS.set(c, [r, i])));
/** Keys next to each other on a QWERTY keyboard: the most common way to hit a wrong letter. */
function nearKeys(a: string, b: string): boolean {
  const p = POS.get(a);
  const q = POS.get(b);
  return !!p && !!q && Math.abs(p[0] - q[0]) <= 1 && Math.abs(p[1] + p[0] * 0.5 - (q[1] + q[0] * 0.5)) <= 1;
}

/**
 * Typing distance between a typo and a word: inserting, dropping or swapping a letter costs 1 (half for a doubled
 * letter), hitting a neighbouring key costs 1, any other wrong letter costs 2. Stops early above `max`.
 */
function typingCost(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return Infinity;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) d[i]![0] = i;
  for (let j = 0; j < cols; j++) d[0]![j] = j;
  for (let i = 1; i < rows; i++) {
    let best = Infinity;
    for (let j = 1; j < cols; j++) {
      const ca = a[i - 1]!;
      const cb = b[j - 1]!;
      const sub = ca === cb ? 0 : nearKeys(ca, cb) ? 1 : 2;
      const del = ca === a[i - 2] ? 0.5 : 1;
      const ins = cb === b[j - 2] ? 0.5 : 1;
      let v = Math.min(d[i - 1]![j]! + del, d[i]![j - 1]! + ins, d[i - 1]![j - 1]! + sub);
      if (i > 1 && j > 1 && ca === b[j - 2] && a[i - 2] === cb) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
      best = Math.min(best, v);
    }
    if (best > max) return Infinity;
  }
  return d[a.length]![b.length]!;
}

/** How far a word of this length may be from its correction. */
function allowance(len: number): number {
  return len <= 5 ? 1 : len <= 7 ? 1.5 : len <= 10 ? 2.5 : 3;
}

const letterPairs = (w: string) => new Set([...w].slice(1).map((c, i) => w[i] + c));
function sharedLetters(a: string, b: string): number {
  const count = new Map<string, number>();
  for (const c of a) count.set(c, (count.get(c) ?? 0) + 1);
  let shared = 0;
  for (const c of b) {
    const n = count.get(c) ?? 0;
    if (n > 0) {
      shared++;
      count.set(c, n - 1);
    }
  }
  return shared / Math.max(a.length, b.length);
}

/** Forms a typo might be aiming at: the word itself, and its -s / -ing / -ed forms when the typo ends that way. */
function forms(base: string, typo: string): string[] {
  const out = [base];
  if (typo.endsWith('s')) out.push(base.endsWith('s') || base.endsWith('x') || base.endsWith('ch') ? `${base}es` : `${base}s`);
  if (typo.endsWith('ing') || typo.endsWith('in')) out.push(base.endsWith('e') ? `${base.slice(0, -1)}ing` : `${base}ing`);
  if (typo.endsWith('ed') || typo.endsWith('d')) out.push(base.endsWith('e') ? `${base}d` : `${base}ed`);
  if (typo.endsWith('r')) out.push(base.endsWith('e') ? `${base}r` : `${base}er`);
  return out;
}

/** The common word a misspelling most likely means, or undefined when there is no confident match. */
export function correctWord(word: string): string | undefined {
  const w = word.toLowerCase();
  if (w.length < 4 || !/^[a-z]+$/.test(w) || isKnownWord(w) || PROTECTED.has(w)) return undefined;
  return nearestWord(w);
}

/** The closest common word, without asking first whether the word is already a real one. */
export function nearestWord(w: string): string | undefined {
  const max = allowance(w.length);
  let best: string | undefined;
  let bestCost = Infinity;
  for (const v of VOCAB) {
    // A short word never becomes a three-letter one ("sony" is not "son"), but "menue" can still be "menu".
    if (v.length < 3 || (w.length <= 5 && v.length < w.length && v.length < 4)) continue;
    // Keep the first letter, unless the first two are swapped ("wnat" is fine, "hwat" too).
    if (v[0] !== w[0] && !(v[0] === w[1] && v[1] === w[0])) continue;
    for (const [i, f] of forms(v, w).entries()) {
      // A made-up form ("many" + "er") only wins over a real word when it is clearly closer.
      const c = typingCost(w, f, max) + (i > 0 ? 0.25 : 0);
      if (c < bestCost) {
        bestCost = c;
        best = f;
      }
    }
  }
  if (best && bestCost <= max) return best;
  // Badly mangled key words: same first letter, similar length, most letters and letter pairs shared.
  if (w.length >= 6) {
    const pairs = letterPairs(w);
    let keyBest: string | undefined;
    let keyScore = 0;
    for (const k of KEYS) {
      if (k[0] !== w[0] || Math.abs(k.length - w.length) > 2) continue;
      const kp = letterPairs(k);
      const both = [...pairs].filter((p) => kp.has(p)).length;
      const dice = (2 * both) / (pairs.size + kp.size);
      if (dice >= 0.5 && sharedLetters(w, k) >= 0.75 && dice > keyScore) {
        keyScore = dice;
        keyBest = k;
      }
    }
    if (keyBest) return keyBest;
  }
  return undefined;
}
