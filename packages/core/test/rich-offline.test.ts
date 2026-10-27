import { describe, expect, it } from 'vitest';
import { createProvider } from '@promptforge/providers';
import { convert, readContext, STRATEGIES } from '../src/index.js';

describe('rich prompts without a model', () => {
  it('writes the full project spec for a project, with the market and inspiration read from the request', async () => {
    const r = await convert({ text: 'hey chatgpt i want to build my own clothing ecom business like flipkart convert this into promte', target: 'chatgpt', strategy: 'auto' });
    expect(r.strategy).toBe('spec');
    expect(r.kind).toBe('project');
    expect(r.prompt).toMatch(/^Prompt: Build My Own Clothing E-Commerce Application/);
    expect(r.prompt).toContain('Admin Dashboard');
    expect(r.prompt).toContain('Razorpay or Cashfree');
    expect(r.prompt).toContain('₹');
    expect(r.prompt).toContain('not a copy of Flipkart');
    expect(r.prompt).not.toMatch(/convert this|hey chatgpt/i);
    expect(r.changes[0]).toBe('Approach: Full project spec');
  });

  it('uses the target layout and the right market', async () => {
    const r = await convert({ text: 'make a booking app for my salon in london', target: 'claude', strategy: 'auto' });
    expect(r.prompt).toContain('Prompt: Build My Own Salon Booking App');
    expect(r.prompt).toContain('<core_features>');
    expect(r.prompt).toContain('£');
    expect(r.prompt).toContain('GDPR');
    expect(r.prompt).toContain('Stripe or PayPal');
    expect(r.prompt).not.toContain('Razorpay');
  });

  it('treats technologies the user named as decided', async () => {
    const r = await convert({ text: 'build a todo app in react with dark mode', target: 'chatgpt', strategy: 'auto' });
    expect(r.prompt).toContain('I want to use React.');
    expect(r.prompt).toContain('Build My Own To-Do App');
    expect(r.prompt).not.toContain('Admin Dashboard');
  });

  it('gives every approach its own shape for the same project', async () => {
    const text = 'i want to start a cloud kitchen in pune and need a website for orders';
    const ids = STRATEGIES.map((s) => s.id).filter((id) => id !== 'brief');
    const out = await Promise.all(ids.map((strategy) => convert({ text, target: 'chatgpt', strategy })));
    expect(new Set(out.map((r) => r.prompt)).size).toBe(ids.length);
    for (const r of out) expect(r.prompt).toContain('cloud kitchen');
    expect(out.find((r) => r.strategy === 'interview')!.prompt).toMatch(/1\. Who are my first customers/);
    expect(out.find((r) => r.strategy === 'cofounder')!.prompt).toContain('technical co-founder');
  });

  it('adds the approach to a plain task instead of a project spec', async () => {
    const r = await convert({ text: 'write email to my boss asking for 2 days leave next week', target: 'chatgpt', strategy: 'auto' });
    expect(r.kind).toBe('task');
    expect(r.strategy).toBe('expert');
    expect(r.prompt).toContain('## What Great Looks Like');
    expect(r.prompt).toContain('subject line');
    expect(r.prompt).not.toContain('Prompt: Build');
  });

  it('keeps the short brief as it was', async () => {
    const r = await convert({ text: 'i want to build my own clothing ecom business like flipkart', target: 'chatgpt', strategy: 'brief' });
    expect(r.prompt).not.toContain('Prompt: Build');
    expect(r.prompt).toContain('## Goal');
  });

  it('keeps pasted code verbatim even for a project', async () => {
    const code = '```js\nfunction add(a, b) { return a + b }\n```';
    const r = await convert({ text: `build an app around this function\n${code}`, target: 'chatgpt', strategy: 'spec' });
    expect(r.prompt).toContain('function add(a, b) { return a + b }');
  });

  it('falls back to the rich prompt when the model fails', async () => {
    const provider = createProvider({
      type: 'mock',
      reply: (req) => {
        if (/fix spelling/i.test(req.messages[0]!.content)) return req.messages.at(-1)!.content;
        throw new Error('model crashed');
      },
    });
    const r = await convert({ text: 'i want to build my own clothing ecom business like flipkart', target: 'chatgpt', strategy: 'auto', provider });
    expect(r.mode).toBe('offline');
    expect(r.fallback?.reason).toBe('error');
    expect(r.prompt).toContain('Prompt: Build My Own Clothing E-Commerce Application');
  });
});

describe('readContext', () => {
  it('is not fooled by "app store"', () => {
    expect(readContext('a fitness app for daily workouts on the app store').domain.key).toBe('fitness');
  });
  it('reads Indian signals, platform and brand', () => {
    const c = readContext('mobile app like swiggy for my tiffin service in mumbai');
    expect(c.region).toBe('india');
    expect(c.platform).toBe('mobile');
    expect(c.brand).toBe('Swiggy');
    expect(c.domain.key).toBe('food');
  });
});

describe('business websites', () => {
  it('treats a landing page as a showcase site, not a shop', async () => {
    const r = await convert({ text: 'make me a landing page for my bakery in delhi', target: 'chatgpt', strategy: 'auto' });
    expect(r.prompt).toMatch(/^Prompt: Build My Own Bakery Landing Page/);
    expect(r.prompt).toContain('I want a landing page for my bakery in Delhi.');
    expect(r.prompt).toContain('WhatsApp');
    expect(r.prompt).not.toContain('Admin Dashboard');
    expect(r.prompt).not.toContain('Cart, checkout');
  });
  it('still builds a shop when the site must take orders', () => {
    expect(readContext('a website for my bakery where people can order cakes online').domain.key).toBe('food');
  });
});

describe('notes for the model', () => {
  it('gives the market the request points to, and no other', async () => {
    const { projectNotes } = await import('../src/rich-offline.js');
    const uk = projectNotes('make a booking app for my salon in london, customers should pay a deposit').join('\n');
    expect(uk).toContain('Market: the United Kingdom');
    expect(uk).toContain('Stripe or PayPal');
    expect(uk).not.toMatch(/UPI|rupee|Razorpay/);
    const none = projectNotes('build a recipe sharing app').join('\n');
    expect(none).toContain('Market: not stated');
    expect(projectNotes('i want to build my own clothing ecom business like flipkart').join('\n')).toMatch(/Market: India[\s\S]*Flipkart is inspiration only/);
  });

  it('removes a half-started tag before the first word', async () => {
    const { postprocess } = await import('../src/index.js');
    expect(postprocess('<Prompt: Booking App\n\nAct as...')).toBe('Prompt: Booking App\n\nAct as...');
    expect(postprocess('<task>\nDo it\n</task>')).toBe('<task>\nDo it\n</task>');
  });
});

describe('Hinglish projects', () => {
  it('sees "app banana hai" and "website banao" as something to build', async () => {
    const { requestKind } = await import('../src/index.js');
    expect(requestKind('mujhe ek fitness app banana hai jisme diet plan aur workout tracking ho', 'other')).toBe('project');
    expect(requestKind('mere business ke liye website banao', 'other')).toBe('project');
    expect(requestKind('ek ecommerce app bana do jaise flipkart', 'other')).toBe('project');
    expect(requestKind('mujhe email likh do boss ko', 'email')).toBe('task');
  });
});

describe('cleaning the model output', () => {
  it('drops a closing tag at the end that closes nothing, and keeps real ones', async () => {
    const { postprocess } = await import('../src/index.js');
    expect(postprocess('<goal>\nBuild it\n</goal>\n\nFirst task\nAsk me first.\n</goal>')).toBe('<goal>\nBuild it\n</goal>\n\nFirst task\nAsk me first.');
    expect(postprocess('<goal>\nBuild it\n</goal>')).toBe('<goal>\nBuild it\n</goal>');
  });

  it('writes a task in the first person', async () => {
    const { asTheUser } = await import('../src/validate.js');
    expect(asTheUser('## Context\n- The user is 19 years old and has just started earning.\n- The user wants simple words.\nThe user\'s goal is to save.')).toBe(
      '## Context\n- I am 19 years old and have just started earning.\n- I want simple words.\nMy goal is to save.',
    );
  });
});
