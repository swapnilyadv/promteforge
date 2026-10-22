// Renders index.html frame by frame (deterministic: every frame is drawn for an exact time) and encodes it with ffmpeg.
//   node render.mjs --stills 1,3,6      -> out/still-*.png, to look at single frames
//   node render.mjs                     -> out/promptforge-launch-9x16.mp4 (with out/music.wav when it exists)
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const TL = JSON.parse(readFileSync(join(HERE, 'timeline.js'), 'utf8').replace(/^[^{]*/, '').replace(/;\s*$/, ''));
const W = 1080, H = 1920;
const BRAVE = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
mkdirSync(join(HERE, 'out'), { recursive: true });

const browser = await puppeteer.launch({ executablePath: BRAVE, headless: 'new', args: ['--no-sandbox', '--hide-scrollbars', '--font-render-hinting=none', '--disable-gpu-vsync', '--force-color-profile=srgb'], defaultViewport: { width: W, height: H, deviceScaleFactor: 1 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(`file://${join(HERE, 'index.html')}?render=1`, { waitUntil: 'networkidle0' });
await page.evaluate(() => window.ready);
await page.addStyleTag({ content: '#fit{transform:none!important}' });

const stills = arg('--stills');
if (stills) {
  for (const s of stills.split(',')) {
    await page.evaluate((t) => window.seek(t), Number(s));
    await page.screenshot({ path: join(HERE, 'out', `still-${s}.png`) });
    console.log('still', s);
  }
  await browser.close();
  process.exit(0);
}

const fps = TL.fps, total = Math.round(TL.duration * fps);
const music = join(HERE, 'out', 'music.wav');
const out = join(HERE, 'out', arg('--out', 'promptforge-launch-9x16.mp4'));
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
  ...(existsSync(music) ? ['-i', music] : []),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', '-r', String(fps),
  ...(existsSync(music) ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []), out], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let f = 0; f < total; f++) {
  await page.evaluate((t) => window.seek(t), f / fps);
  const png = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 30 === 0) console.log(`frame ${f}/${total}  ${Math.round((Date.now() - t0) / 1000)}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log('wrote', out, `${Math.round((Date.now() - t0) / 1000)}s`);
