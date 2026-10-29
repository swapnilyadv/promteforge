import { describe, expect, it } from 'vitest';
import { basicClean, convert, hinglishToEnglish, stripRequestWrapper } from '../src/index.js';
import { correctWord, isKnownWord } from '../src/spell.js';

const clean = (t: string) => stripRequestWrapper(basicClean(hinglishToEnglish(stripRequestWrapper(t))));

describe('offline spelling', () => {
  it('fixes the misspellings people really type', () => {
    expect(clean('hey iu i want to build an exomcmmer website like wise flipkart company can you build an applicariton for me')).toBe(
      'I want to build an e-commerce website like Flipkart',
    );
    expect(clean('hii bro i want to buld a resturant webiste with onlin ordring and paymnt')).toBe('I want to build a restaurant website with online ordering and payment');
    expect(clean('mak a app for my gym membrs to trak there workots')).toBe('Make an app for my gym members to track their workouts');
    expect(clean('writ a profesional emial to my manger for leav tommorow')).toBe('Write a professional email to my manager for leave tomorrow');
    expect(clean('creat a portfollio websit for a photographr with galery and contct form')).toBe('Create a portfolio website for a photographer with gallery and contact form');
  });

  it('leaves real words, names, food, code and tech terms alone', () => {
    for (const w of ['heater', 'dosa', 'chai', 'poha', 'kubernetes', 'pandas', 'numpy', 'sourdough', 'landlord', 'aesthetic', 'vibe']) {
      expect(correctWord(w)).toBeUndefined();
    }
    const t = 'My heater is broken. Order dosa and chai from Kalakriti, then run kubectl in Kubernetes with useEffect.';
    expect(basicClean(t)).toBe(t);
  });

  it('recognises regular forms of known words', () => {
    for (const w of ['features', 'ordering', 'planned', 'shopper', 'quickly', 'categories', 'rebuild']) expect(isKnownWord(w)).toBe(true);
  });

  it('keeps greetings that are not slips and does not drop the request', () => {
    expect(clean('hey i want a logo for my cafe')).toBe('I want a logo for my cafe');
    expect(clean('can you build an app for me')).toBe('Can you build an app for me');
  });
});

describe('Hinglish requests in English', () => {
  it.each([
    ['mujhe ek fitness app banana hai jisme diet plan aur workout tracking ho', 'I want to build a fitness app with diet plan and workout tracking'],
    ['mere business ke liye website banao', 'Build a website for my business'],
    ['ek ecommerce app bana do jaise flipkart', 'Build an e-commerce app like Flipkart'],
    ['mujhe ek website chahiye jisme online booking ho', 'I need a website with online booking'],
    ['mujhe email likh do boss ko leave ke liye', 'Write an email to boss for leave'],
    ['compound interest kaise kaam karta hai samjhao', 'Explain how compound interest works'],
    ['flipkart jaisa ek app banao mere shop ke liye', 'Build an app like Flipkart for my shop'],
  ])('%s', (input, out) => expect(clean(input)).toBe(out));

  it('leaves English alone', () => {
    expect(hinglishToEnglish('there is a bug in my code')).toBe('there is a bug in my code');
  });
});

describe('the prompt never repeats the typos', () => {
  it('your e-commerce example', async () => {
    const r = await convert({ text: 'hey iu i want to build an exomcmmer website like wise flipkart company can you build an applicariton for me', target: 'chatgpt', strategy: 'auto' });
    expect(r.prompt).toMatch(/^Prompt: Build My Own E-Commerce Website/);
    expect(r.prompt).toContain('I want to build an e-commerce website like Flipkart.');
    expect(r.prompt).not.toMatch(/exomcmmer|applicariton|\biu\b|like wise|Flipkart company/i);
  });
});

describe('offline grammar', () => {
  it.each([
    ['explain me how compound interest work', 'Explain to me how compound interest works'],
    ['he dont know how to cook', "He doesn't know how to cook"],
    ['she have a small business and she want a website', 'She has a small business and she wants a website'],
    ['me and my friend wants to start a cafe', 'My friend and I want to start a cafe'],
    ['i am wanting a app which help students for study', 'I want an app which helps students study'],
    ['can u tell me about how to learn python fastly', 'Can you tell me how to learn Python quickly'],
    ['write a email to my teacher that i will not able to come tomorrow', 'Write an email to my teacher that I will not be able to come tomorrow'],
    ['my website is very much slow and it not load on mobile', 'My website is very slow and it does not load on mobile'],
    ['i want that my app should have login and payment', 'I want my app to have login and payment'],
    ['give me some idea for my youtube channel', 'Give me some ideas for my YouTube channel'],
    ['what is the best way for learn english speaking', 'What is the best way to learn English speaking'],
    ['i am having 2 year experience in java', 'I have 2 years of experience in Java'],
    ['kindly revert back asap', 'Please reply as soon as possible'],
    ['i want to build an website for my clothes shop which have online payment', 'I want to build a website for my clothes shop which has online payment'],
    ['how i can improve my resume', 'How can I improve my resume'],
    ['tell me how much it will cost for make an app', 'Tell me how much it will cost to make an app'],
  ])('%s', (input, out) => expect(basicClean(input)).toBe(out));

  it.each(['How does it work', 'Make it work on mobile', 'Does it load fast', 'An hour ago an honest review', 'My products which have discounts', 'There is a bug in my code'])(
    'leaves correct English alone: %s',
    (t) => expect(basicClean(t)).toBe(t),
  );
});
