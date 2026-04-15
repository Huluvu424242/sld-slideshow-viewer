export const SLIDE_CHANGE_BELL_VOLUME = 3.6;
export const SLIDE_CHANGE_BELL_STRIKE_SECONDS = 0.025;
export const SLIDE_CHANGE_BELL_DECAY_SECONDS = 3.2;

export function playSlideChangeGong(context, {
    volume = SLIDE_CHANGE_BELL_VOLUME,
    strikeSeconds = SLIDE_CHANGE_BELL_STRIKE_SECONDS,
    decaySeconds = SLIDE_CHANGE_BELL_DECAY_SECONDS,
} = {}) {
    const now = context.currentTime;
    const attackEnd = now + strikeSeconds;
    const releaseEnd = attackEnd + decaySeconds;
    const masterGain = context.createGain();
    const bodyFilter = context.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(165, now);
    bodyFilter.Q.setValueAtTime(0.8, now);

    const shimmerFilter = context.createBiquadFilter();
    shimmerFilter.type = 'highshelf';
    shimmerFilter.frequency.setValueAtTime(1800, now);
    shimmerFilter.gain.setValueAtTime(6, now);

    const lowBloom = context.createGain();
    lowBloom.gain.setValueAtTime(1.0, now);

    const gongPartials = [
        {frequency: 82.4, level: 1.0, type: 'sine', detune: -1.4, ring: 1.1},
        {frequency: 109.8, level: 0.85, type: 'triangle', detune: 1.1, ring: 1.25},
        {frequency: 146.8, level: 0.55, type: 'sine', detune: -0.9, ring: 1.4},
        {frequency: 197.5, level: 0.34, type: 'triangle', detune: 0.7, ring: 1.7},
        {frequency: 247.0, level: 0.26, type: 'sine', detune: -0.4, ring: 1.9},
        {frequency: 330.0, level: 0.14, type: 'triangle', detune: 0.3, ring: 2.2},
    ];

    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(volume, attackEnd);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);
    bodyFilter.connect(shimmerFilter);
    shimmerFilter.connect(masterGain);
    lowBloom.connect(masterGain);
    masterGain.connect(context.destination);

    gongPartials.forEach(({frequency, level, type, detune, ring}) => {
        const oscillator = context.createOscillator();
        const voiceGain = context.createGain();
        const slightVibrato = context.createOscillator();
        const vibratoGain = context.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.detune.setValueAtTime(detune, now);
        oscillator.detune.linearRampToValueAtTime(detune * 0.3, releaseEnd);

        voiceGain.gain.setValueAtTime(Math.max(0.0001, level * 0.001), now);
        voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), attackEnd);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, attackEnd + (decaySeconds * ring));

        slightVibrato.type = 'sine';
        slightVibrato.frequency.setValueAtTime(5.3, now);
        vibratoGain.gain.setValueAtTime(0.35, now);
        vibratoGain.gain.exponentialRampToValueAtTime(0.01, releaseEnd);
        slightVibrato.connect(vibratoGain);
        vibratoGain.connect(oscillator.detune);

        oscillator.connect(voiceGain);
        voiceGain.connect(bodyFilter);
        oscillator.start(now);
        slightVibrato.start(now);
        oscillator.stop(releaseEnd + 0.25);
        slightVibrato.stop(releaseEnd + 0.25);
    });

    const strikeDurationSeconds = 0.03;
    const strikeBuffer = context.createBuffer(1, Math.max(1, Math.floor(strikeDurationSeconds * context.sampleRate)), context.sampleRate);
    const strikeChannel = strikeBuffer.getChannelData(0);
    for (let sampleIndex = 0; sampleIndex < strikeChannel.length; sampleIndex += 1) {
        const envelope = 1 - (sampleIndex / strikeChannel.length);
        strikeChannel[sampleIndex] = (Math.random() * 2 - 1) * envelope;
    }

    const strikeNoise = context.createBufferSource();
    strikeNoise.buffer = strikeBuffer;
    const strikeFilter = context.createBiquadFilter();
    strikeFilter.type = 'bandpass';
    strikeFilter.frequency.setValueAtTime(1100, now);
    strikeFilter.Q.setValueAtTime(2.5, now);
    const strikeGain = context.createGain();
    strikeGain.gain.setValueAtTime(0.0001, now);
    strikeGain.gain.exponentialRampToValueAtTime(0.17, now + 0.006);
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    strikeNoise.connect(strikeFilter);
    strikeFilter.connect(strikeGain);
    strikeGain.connect(shimmerFilter);
    strikeNoise.start(now);

    const subBoom = context.createOscillator();
    subBoom.type = 'sine';
    subBoom.frequency.setValueAtTime(74, now);
    subBoom.frequency.exponentialRampToValueAtTime(52, now + 0.42);
    const subBoomGain = context.createGain();
    subBoomGain.gain.setValueAtTime(0.0001, now);
    subBoomGain.gain.exponentialRampToValueAtTime(0.4, now + 0.02);
    subBoomGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    subBoom.connect(subBoomGain);
    subBoomGain.connect(lowBloom);
    subBoom.start(now);
    subBoom.stop(now + 1.2);

    return strikeSeconds + decaySeconds;
}
