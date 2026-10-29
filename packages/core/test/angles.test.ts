import { describe, expect, it } from 'vitest';
import { createProvider } from '@promptforge/providers';
import { ANGLES, anglesFor, convert, nextStrategy, type StrategyId } from '../src/index.js';

async function presses(text: string, n: number) {
  let strategy: StrategyId | 'auto' = 'auto';
  let variant = 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = await convert({ text, target: 'chatgpt', strategy, variant });
    out.push(r);
    strategy = nextStrategy(r.strategy, r.kind);
    variant = r.variant + 1;
  }
  return out;
}

describe('unlimited "Another way"', () => {
  it('gives a different prompt on every press, for a project and for a task', async () => {
    for (const text of ['i want to build my own clothing ecom business like flipkart', 'write email to my boss asking for 2 days leave next week']) {
      const out = await presses(text, 40);
      expect(new Set(out.map((r) => r.prompt)).size).toBe(40);
      expect(out[0]!.angle).toBeUndefined();
      expect(out[1]!.angle).toBeDefined();
    }
  });

  it('reshapes the prompt around the focus: title, role and a focus section', async () => {
    const r = await convert({ text: 'i want to build my own clothing ecom business like flipkart', target: 'chatgpt', strategy: 'spec', variant: 2 });
    expect(r.angle?.name).toBe('Low budget');
    expect(r.prompt).toMatch(/^Prompt: .+\(Low budget\)$/m);
    expect(r.prompt).toContain('Also think like a cost-conscious startup advisor.');
    expect(r.prompt.indexOf('Focus for This Version')).toBeLessThan(r.prompt.indexOf('1. Business Goal'));
  });

  it('lets the user pick a focus', async () => {
    const r = await convert({ text: 'build a todo app in react', target: 'claude', strategy: 'expert', angle: 'security' });
    expect(r.angle?.id).toBe('security');
    expect(r.prompt).toContain('<focus name="Security and privacy first">');
  });

  it('has enough angles for each kind and unique ids', () => {
    expect(anglesFor('project').length).toBeGreaterThanOrEqual(14);
    expect(anglesFor('task').length).toBeGreaterThanOrEqual(12);
    expect(new Set(ANGLES.map((a) => a.id)).size).toBe(ANGLES.length);
  });

  it('asks the model for a new version around the focus, a little more freely', async () => {
    let seen: { content: string; temperature?: number } | undefined;
    const provider = createProvider({
      type: 'mock',
      reply: (req) => {
        const sys = req.messages[0]!.content;
        if (/fix spelling/i.test(sys)) return req.messages.at(-1)!.content;
        seen = { content: req.messages.at(-1)!.content, temperature: req.temperature };
        return 'Prompt: Build My Own Shop (Growth and marketing)\n\nAct as a growth marketer.\n\nI want to build my own clothing e-commerce business inspired by Flipkart.';
      },
    });
    await convert({ text: 'i want to build my own clothing ecom business like flipkart', target: 'chatgpt', strategy: 'spec', variant: 4, provider });
    expect(seen!.content).toContain('FOCUS FOR THIS VERSION: Growth and marketing');
    expect(seen!.temperature).toBeGreaterThan(0.5);
  });
});
