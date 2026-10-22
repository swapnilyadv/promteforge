"""An original soundtrack for the launch video, synthesised from scratch (no samples, nothing to license).
120 BPM in A minor, locked to timeline.js so every sound lands on its on-screen moment."""
import json, math, random, re, struct, wave, os

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.loads(re.sub(r'^[^{]*', '', open(os.path.join(HERE, '..', 'timeline.js')).read()).rstrip().rstrip(';'))
SR = 44100
D = TL['duration']
N = int(SR * D)
BEAT = 60.0 / TL['bpm']
random.seed(11)
L = [0.0] * N
R = [0.0] * N
TAU = 2 * math.pi

def put(t, wave_fn, dur, gain=1.0, pan=0.0):
    """Mix a sound that starts at time t. wave_fn(x) gets seconds since the start."""
    i0 = int(t * SR)
    n = int(dur * SR)
    gl = gain * (1 - max(0, pan)) ; gr = gain * (1 + min(0, pan))
    for k in range(n):
        i = i0 + k
        if i < 0 or i >= N: continue
        v = wave_fn(k / SR)
        L[i] += v * gl; R[i] += v * gr

def noise(): return random.random() * 2 - 1
def note(m): return 440.0 * 2 ** ((m - 69) / 12)

# ---------- drums ----------
def kick(t, g=.9):
    ph = [0.0]
    def f(x):
        fr = 46 + 120 * math.exp(-x * 28)
        ph[0] += TAU * fr / SR
        return (math.sin(ph[0]) * math.exp(-x * 7.5) + .25 * noise() * math.exp(-x * 90)) 
    put(t, f, .32, g)
def clap(t, g=.35):
    put(t, lambda x: noise() * (math.exp(-x * 26) + .6 * math.exp(-((x - .012) * 90) ** 2)), .22, g)
def hat(t, g=.12, open_=False):
    prev = [0.0]
    def f(x):
        n = noise(); v = n - prev[0]; prev[0] = n
        return v * math.exp(-x * (14 if open_ else 75))
    put(t, f, .25 if open_ else .06, g, pan=.25)

# ---------- tonal ----------
ROOTS = [57, 53, 60, 55]          # Am, F, C, G (MIDI of the chord root, one octave up from the bass)
TRIADS = [(0, 3, 7), (0, 4, 7), (0, 4, 7), (0, 4, 7)]
def chord_at(t):
    bar = int(t / (4 * BEAT))
    i = bar % 4
    r = ROOTS[i]
    minor = (i == 0)
    return r, ((0, 3, 7) if minor else (0, 4, 7))
def bass(t, midi, dur, g=.34):
    fr = note(midi)
    def f(x):
        e = min(1, x / .006) * math.exp(-x * 4.5)
        return (math.sin(TAU * fr * x) + .35 * math.sin(TAU * fr * 2 * x) + .12 * math.sin(TAU * fr * 3 * x)) * e
    put(t, f, dur, g)
def pluck(t, midi, g=.1, pan=0.0):
    fr = note(midi)
    def f(x):
        e = min(1, x / .003) * math.exp(-x * 13)
        tri = 2 / math.pi * math.asin(math.sin(TAU * fr * x))
        return (tri + .3 * math.sin(TAU * fr * 2 * x)) * e
    put(t, f, .5, g, pan)
def chime(t, g=.18):
    for fr, d in ((880, 0), (1318.5, .09), (1760, .18)):
        put(t + d, lambda x, fr=fr: math.sin(TAU * fr * x) * math.exp(-x * 5.5), .9, g * (1 if d < .18 else .5))
def click(t, g=.12):
    put(t, lambda x: (noise() * math.exp(-x * 400) + .5 * math.sin(TAU * 1900 * x) * math.exp(-x * 220)), .04, g, pan=random.uniform(-.2, .2))
def pop(t, g=.4):
    ph = [0.0]
    def f(x):
        ph[0] += TAU * (1000 * math.exp(-x * 30) + 260) / SR
        return math.sin(ph[0]) * math.exp(-x * 26) + .3 * noise() * math.exp(-x * 120)
    put(t, f, .12, g)
def blip(t, fr=1250, g=.14):
    put(t, lambda x: math.sin(TAU * fr * x) * math.exp(-x * 45), .08, g)
def whoosh(t_end, length=.7, g=.28):
    """Noise that opens up and then stops dead at t_end."""
    y = [0.0]
    def f(x):
        k = x / length
        a = .015 + .5 * k * k
        y[0] += a * (noise() - y[0])
        return y[0] * (k ** 1.6) * 2.2
    put(t_end - length, f, length, g, pan=.1)
def boom(t, g=.7):
    ph = [0.0]
    def f(x):
        ph[0] += TAU * (40 + 90 * math.exp(-x * 5)) / SR
        return math.sin(ph[0]) * math.exp(-x * 2.4) + .35 * noise() * math.exp(-x * 4.5)
    put(t, f, 1.6, g)

# ---------- arrangement ----------
total_beats = int(D / BEAT)
# pad: the whole way, swelling in; ducks on the kick later
def pad_sample(i):
    t = i / SR
    r, tri = chord_at(t)
    v = 0.0
    for off in tri:
        fr = note(r + off)
        v += math.sin(TAU * fr * t) + .5 * math.sin(TAU * fr * 1.004 * t + 1.3)
    swell = min(1.0, t / 2.5) * (1.0 if t < 26 else 1.0 + .6 * min(1, (t - 26) / 1.5))
    duck = 1.0
    if t >= 4.0 and t < 26.4:
        ph = (t / BEAT) % 1.0
        duck = 1 - .55 * math.exp(-ph * 7)
    return v * .05 * swell * duck
for i in range(N):
    v = pad_sample(i)
    L[i] += v; R[i] += v * .92

# drums and bass
for b in range(total_beats + 1):
    t = b * BEAT
    if 4.0 <= t < 26.0:
        kick(t, .95 if t >= 8 else .8)
    if 26.0 <= t < 29.0 and b % 2 == 0:
        kick(t, .6)
    if 8.0 <= t < 26.0 and b % 2 == 1:
        clap(t)
    if 4.0 <= t < 26.0:
        hat(t + BEAT / 2, .1 if t < 8 else .14, open_=(b % 2 == 1 and t >= 8))
        if t >= 8: hat(t + BEAT / 4, .05); hat(t + 3 * BEAT / 4, .05)
    if 4.0 <= t < 26.4:
        r, _ = chord_at(t)
        bass(t + .02, r - 24, BEAT * .45)
        bass(t + BEAT / 2 + .02, r - 12, BEAT * .3, .22)
# arpeggio, 16ths
SIX = BEAT / 4
k = 0
t = 8.0
while t < 26.0:
    r, tri = chord_at(t)
    seq = [0, 1, 2, 1, 2, 1, 0, 2]
    off = tri[seq[k % 8]] + (12 if (k // 8) % 2 else 0)
    g = .1 if t < 20.5 else .075
    pluck(t, r + 12 + off, g, pan=(-.35 if k % 2 else .35))
    t += SIX; k += 1

# ---------- moments from the timeline ----------
for c in TL['sceneCuts']:
    whoosh(c, .75, .3)
boom(0.02, .55); whoosh(1.15, .5, .26)
boom(4.0, .75); boom(TL['ctaT'], .85)
# keystrokes while the messy prompt is typed (every character, spaces softer)
for i, ch in enumerate(TL['typeText']):
    click(TL['typeStart'] + i / TL['typeCps'], .05 if ch == ' ' else .11)
pop(TL['pressT'])
for ft in TL['flipTimes']: pop(ft, .34)
for st in TL['stageTimes'][1:]: blip(st, 1250 if st < 7 else 1560)
chime(TL['resultStart'] + .05)
for dt in TL['deviceTimes']: whoosh(dt + .3, .45, .22)
# the final chord and a bright sparkle on the call to action
for off, d in ((0, 0), (7, .05), (12, .1), (15, .15), (19, .2)):
    put(TL['ctaT'] + d, lambda x, fr=note(69 + off): (math.sin(TAU * fr * x) + .4 * math.sin(TAU * fr * 2 * x)) * math.exp(-x * 1.1) * min(1, x / .01), 3.8, .075)
for j, off in enumerate((0, 12, 19, 24)):
    chime(TL['ctaT'] + .55 + j * .22, .12)

# ---------- master ----------
fade_in, fade_out = .06, 1.0
peak = 0.0
for i in range(N):
    t = i / SR
    g = min(1.0, t / fade_in) * min(1.0, (D - t) / fade_out)
    L[i] = math.tanh(L[i] * 1.05) * g; R[i] = math.tanh(R[i] * 1.05) * g
    peak = max(peak, abs(L[i]), abs(R[i]))
scale = .89 / peak if peak else 1
out = os.path.join(HERE, '..', 'out', 'music.wav')
os.makedirs(os.path.dirname(out), exist_ok=True)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<hh', int(L[i] * scale * 32767), int(R[i] * scale * 32767)) for i in range(N)))
print('wrote', out, f'{D}s, peak scaled by {scale:.2f}')
