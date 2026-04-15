/**
 * Erzeugt einen synthetischen Glockenton im Browser.
 *
 * Kriterien:
 * - pitchHz: Grundtonhöhe in Hz
 * - loudness: Lautstärke 0.0 bis 1.0
 * - duration: Ausschwingdauer in Sekunden
 * - fullness: Klangfülle 0.0 bis 1.0
 * - brightness: Helligkeit / Metallanteil 0.0 bis 1.0
 * - attack: Härte des Anschlags 0.001 bis ca. 0.1
 * - overtones: Stärke der Obertöne 0.0 bis 1.0
 * - detune: leichte Verstimmung / Schwebung in Cent
 *
 * Beispiel:
 * await playBellTone({
 *   pitchHz: 440,
 *   loudness: 0.7,
 *   duration: 4.5,
 *   fullness: 0.8,
 *   brightness: 0.6,
 *   attack: 0.01,
 *   overtones: 0.7,
 *   detune: 6
 * });
 */
export const helleGlocke = {
  pitchHz: 520,
  loudness: 0.8,
  duration: 3.5,
  fullness: 0.5,
  brightness: 1.0,
  attack: 0.003,
  overtones: 1.0,
  detune: 12
};

export const grosseGlocke = {
  pitchHz: 220,
  loudness: 0.9,
  duration: 6,
  fullness: 0.95,
  brightness: 0.35,
  attack: 0.02,
  overtones: 0.6,
  detune: 5
};

export const kleineGlocke = {
  pitchHz: 880,
  loudness: 0.5,
  duration: 2.5,
  fullness: 0.3,
  brightness: 0.8,
  attack: 0.005,
  overtones: 0.7,
  detune: 3
};

let bellAudioContext;

/**
 * @returns {AudioContext}
 */
function getBellAudioContext() {
  if (!bellAudioContext) {
    bellAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return bellAudioContext;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {object} options
 * @param {number} [options.pitchHz=440]
 * @param {number} [options.loudness=0.7]
 * @param {number} [options.duration=4]
 * @param {number} [options.fullness=0.7]
 * @param {number} [options.brightness=0.5]
 * @param {number} [options.attack=0.01]
 * @param {number} [options.overtones=0.7]
 * @param {number} [options.detune=4]
 * @returns {Promise<void>}
 */
async function playBellTone(options = {}) {
  const ctx = getBellAudioContext();

  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const pitchHz = clamp(options.pitchHz ?? 440, 50, 4000);
  const loudness = clamp(options.loudness ?? 0.7, 0, 1);
  const duration = clamp(options.duration ?? 4, 0.1, 20);
  const fullness = clamp(options.fullness ?? 0.7, 0, 1);
  const brightness = clamp(options.brightness ?? 0.5, 0, 1);
  const attack = clamp(options.attack ?? 0.01, 0.001, 0.15);
  const overtones = clamp(options.overtones ?? 0.7, 0, 1);
  const detune = clamp(options.detune ?? 4, 0, 50);

  const now = ctx.currentTime;
  const endTime = now + duration + 0.5;

  const masterGain = ctx.createGain();
  const lowpass = ctx.createBiquadFilter();
  const highpass = ctx.createBiquadFilter();

  highpass.type = "highpass";
  highpass.frequency.value = 80;

  lowpass.type = "lowpass";
  lowpass.frequency.value = 1200 + brightness * 6000;
  lowpass.Q.value = 0.7;

  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, loudness),
    now + attack
  );
  masterGain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + duration
  );

  lowpass.connect(highpass);
  highpass.connect(masterGain);
  masterGain.connect(ctx.destination);

  // Typische glockenartige Partialtöne: nicht exakt harmonisch
  const partials = [
    { ratio: 0.50, gain: 0.18 + fullness * 0.10, decay: 1.20 },
    { ratio: 1.00, gain: 0.30 + fullness * 0.15, decay: 1.00 },
    { ratio: 2.00, gain: 0.22 + overtones * 0.18, decay: 0.75 },
    { ratio: 2.40, gain: 0.10 + brightness * 0.12, decay: 0.60 },
    { ratio: 3.00, gain: 0.08 + overtones * 0.10, decay: 0.50 },
    { ratio: 4.20, gain: 0.05 + brightness * 0.10, decay: 0.40 },
    { ratio: 5.40, gain: 0.03 + brightness * 0.08, decay: 0.30 }
  ];

  const createdNodes = [];

  for (const partial of partials) {
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const partialGain = ctx.createGain();

    oscA.type = "sine";
    oscB.type = brightness > 0.65 ? "triangle" : "sine";

    const partialFrequency = pitchHz * partial.ratio;

    oscA.frequency.setValueAtTime(partialFrequency, now);
    oscB.frequency.setValueAtTime(partialFrequency, now);

    oscA.detune.setValueAtTime(-detune / 2, now);
    oscB.detune.setValueAtTime(detune / 2, now);

    const startGain = Math.max(0.0001, partial.gain * loudness);
    const partialDuration = Math.max(0.08, duration * partial.decay);

    partialGain.gain.setValueAtTime(0.0001, now);
    partialGain.gain.exponentialRampToValueAtTime(startGain, now + attack);
    partialGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + partialDuration
    );

    oscA.connect(partialGain);
    oscB.connect(partialGain);
    partialGain.connect(lowpass);

    oscA.start(now);
    oscB.start(now);
    oscA.stop(endTime);
    oscB.stop(endTime);

    createdNodes.push(oscA, oscB, partialGain);
  }

  // Kurzer Anschlag-Impuls für den "Klöppel"
  const strikeOsc = ctx.createOscillator();
  const strikeGain = ctx.createGain();
  const strikeFilter = ctx.createBiquadFilter();

  strikeOsc.type = "triangle";
  strikeOsc.frequency.setValueAtTime(1200 + brightness * 1800, now);

  strikeFilter.type = "bandpass";
  strikeFilter.frequency.value = 1800 + brightness * 2200;
  strikeFilter.Q.value = 3;

  strikeGain.gain.setValueAtTime(0.0001, now);
  strikeGain.gain.exponentialRampToValueAtTime(
    0.15 + brightness * 0.2,
    now + 0.002
  );
  strikeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

  strikeOsc.connect(strikeFilter);
  strikeFilter.connect(strikeGain);
  strikeGain.connect(lowpass);

  strikeOsc.start(now);
  strikeOsc.stop(now + 0.06);

  createdNodes.push(strikeOsc, strikeGain, strikeFilter);

  return new Promise((resolve) => {
    setTimeout(resolve, (duration + 0.6) * 1000);
  });
}

export function playGlockeTone(context, preset = helleGlocke, overrides = {}) {
  const merged = { ...preset, ...overrides };
  const pitchHz = clamp(merged.pitchHz ?? 440, 50, 4000);
  const loudness = clamp(merged.loudness ?? 0.7, 0.0001, 1);
  const duration = clamp(merged.duration ?? 4, 0.1, 20);
  const fullness = clamp(merged.fullness ?? 0.7, 0, 1);
  const brightness = clamp(merged.brightness ?? 0.5, 0, 1);
  const attack = clamp(merged.attack ?? 0.01, 0.001, 0.15);
  const overtones = clamp(merged.overtones ?? 0.7, 0, 1);
  const detune = clamp(merged.detune ?? 4, 0, 50);

  const now = context.currentTime;
  const endTime = now + duration + 0.5;

  const masterGain = context.createGain();
  const lowpass = context.createBiquadFilter();
  const highpass = context.createBiquadFilter();

  highpass.type = "highpass";
  highpass.frequency.value = 80;
  lowpass.type = "lowpass";
  lowpass.frequency.value = 1200 + brightness * 6000;
  lowpass.Q.value = 0.7;

  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(loudness, now + attack);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  lowpass.connect(highpass);
  highpass.connect(masterGain);
  masterGain.connect(context.destination);

  const partials = [
    { ratio: 0.50, gain: 0.18 + fullness * 0.10, decay: 1.20 },
    { ratio: 1.00, gain: 0.30 + fullness * 0.15, decay: 1.00 },
    { ratio: 2.00, gain: 0.22 + overtones * 0.18, decay: 0.75 },
    { ratio: 2.40, gain: 0.10 + brightness * 0.12, decay: 0.60 },
    { ratio: 3.00, gain: 0.08 + overtones * 0.10, decay: 0.50 },
    { ratio: 4.20, gain: 0.05 + brightness * 0.10, decay: 0.40 },
    { ratio: 5.40, gain: 0.03 + brightness * 0.08, decay: 0.30 }
  ];

  for (const partial of partials) {
    const oscA = context.createOscillator();
    const oscB = context.createOscillator();
    const partialGain = context.createGain();

    oscA.type = "sine";
    oscB.type = brightness > 0.65 ? "triangle" : "sine";
    const partialFrequency = pitchHz * partial.ratio;
    oscA.frequency.setValueAtTime(partialFrequency, now);
    oscB.frequency.setValueAtTime(partialFrequency, now);
    oscA.detune.setValueAtTime(-detune / 2, now);
    oscB.detune.setValueAtTime(detune / 2, now);

    const startGain = Math.max(0.0001, partial.gain * loudness);
    const partialDuration = Math.max(0.08, duration * partial.decay);
    partialGain.gain.setValueAtTime(0.0001, now);
    partialGain.gain.exponentialRampToValueAtTime(startGain, now + attack);
    partialGain.gain.exponentialRampToValueAtTime(0.0001, now + partialDuration);

    oscA.connect(partialGain);
    oscB.connect(partialGain);
    partialGain.connect(lowpass);
    oscA.start(now);
    oscB.start(now);
    oscA.stop(endTime);
    oscB.stop(endTime);
  }

  const strikeOsc = context.createOscillator();
  const strikeGain = context.createGain();
  const strikeFilter = context.createBiquadFilter();
  strikeOsc.type = "triangle";
  strikeOsc.frequency.setValueAtTime(1200 + brightness * 1800, now);
  strikeFilter.type = "bandpass";
  strikeFilter.frequency.value = 1800 + brightness * 2200;
  strikeFilter.Q.value = 3;
  strikeGain.gain.setValueAtTime(0.0001, now);
  strikeGain.gain.exponentialRampToValueAtTime(0.15 + brightness * 0.2, now + 0.002);
  strikeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  strikeOsc.connect(strikeFilter);
  strikeFilter.connect(strikeGain);
  strikeGain.connect(lowpass);
  strikeOsc.start(now);
  strikeOsc.stop(now + 0.06);

  return duration;
}
