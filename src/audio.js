export class AudioController {
    constructor({onStatusChange, onEnded, onFallbackTimerStart, onAudioIssue}) {
        this.onStatusChange = onStatusChange;
        this.onEnded = onEnded;
        this.onFallbackTimerStart = onFallbackTimerStart;
        this.onAudioIssue = onAudioIssue;
        this.audio = null;
        this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
        this.currentMode = 'stopped';
        this.currentSlideKey = null;
        this.playbackSession = 0;
        this.unavailableAudioFallbackTimer = null;
    }

    isSpeechSupported() {
        return (
            typeof window !== 'undefined' &&
            'speechSynthesis' in window &&
            typeof window.SpeechSynthesisUtterance !== 'undefined'
        );
    }

    isSpeechReallyUsable() {
        if (!this.isSpeechSupported()) return false;

        try {
            const test = new SpeechSynthesisUtterance("test");
            return typeof window.speechSynthesis.speak === 'function';
        } catch {
            return false;
        }
    }


    async play(slide, assetLoader) {
        await this.stop();
        const playbackSession = this.playbackSession;

        if (!slide.audio) {
            this.updateStatus('Kein Audio');
            if (this.isCurrentPlaybackSession(playbackSession)) {
                this.onEnded?.();
            }
            return;
        }

        const audioType = inferAudioType(slide.audio);
        this.currentSlideKey = `${slide.id || ''}:${slide.audio.src || audioType}`;

        try {
            if (isPlayableAudioType(audioType)) {
                const resolvedUrl = await assetLoader.resolvePlayableUrl(slide.audio.src);
                await this.playAudioElement(resolvedUrl, playbackSession, slide);
                return;
            }

            if (audioType === 'txt' || audioType === 'ssml') {
                const text = await assetLoader.loadText(slide.audio.src);
                this.playSpeech(text, slide.audio, audioType === 'ssml', playbackSession, slide);
                return;
            }

            this.reportAudioIssue('Audioformat wird nicht unterstützt. Es wird eine Fallback-Showtime von 10 Sekunden verwendet.');
            this.updateStatus(`Audio nicht verfügbar – Anzeige ${getUnavailableAudioShowtimeSeconds()} s`);
            this.scheduleFallbackAdvance(slide, playbackSession);
        } catch (error) {
            console.warn('Audio konnte nicht geladen werden. Fallback-Showtime wird verwendet.', error);
            this.reportAudioIssue('Audio konnte nicht geladen werden. Es wird eine Fallback-Showtime von 10 Sekunden verwendet.');
            this.updateStatus(`Audio nicht verfügbar – Anzeige ${getUnavailableAudioShowtimeSeconds()} s`);
            this.scheduleFallbackAdvance(slide, playbackSession);
        }
    }

    async pause() {
        if (this.audio && !this.audio.paused) {
            this.audio.pause();
            this.updateStatus('Pausiert');
            return;
        }

        if (this.synthesis?.speaking && !this.synthesis.paused) {
            this.synthesis.pause();
            this.updateStatus('Pausiert');
        }
    }

    async resume() {
        if (this.audio && this.audio.paused) {
            await this.audio.play();
            this.updateStatus('Spielt');
            return;
        }

        if (this.synthesis?.paused) {
            this.synthesis.resume();
            this.updateStatus('Spielt');
        }
    }

    async stop() {
        this.playbackSession += 1;
        this.clearUnavailableAudioFallbackTimer();

        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.audio.src = '';
            this.audio = null;
        }

        if (this.synthesis && typeof this.synthesis.cancel === 'function') {
            this.synthesis.cancel();
        }

        this.currentSlideKey = null;
        this.updateStatus('Gestoppt');
    }

    async playAudioElement(url, playbackSession, slide = {}) {
        const audio = new Audio(url);
        this.audio = audio;
        audio.addEventListener('ended', () => {
            if (!this.isCurrentPlaybackSession(playbackSession)) {
                return;
            }
            this.updateStatus('Beendet');
            this.onEnded?.();
        }, {once: true});
        audio.addEventListener('error', async () => {
            if (!this.isCurrentPlaybackSession(playbackSession)) {
                return;
            }
            console.warn('Audio-Datei konnte nicht abgespielt werden. Fallback-Showtime wird verwendet.', url);
            this.audio = null;
            this.reportAudioIssue('Audio-Datei konnte nicht abgespielt werden. Es wird eine Fallback-Showtime von 10 Sekunden verwendet.');
            this.updateStatus(`Audio nicht verfügbar – Anzeige ${getUnavailableAudioShowtimeSeconds()} s`);
            this.scheduleFallbackAdvance(slide, playbackSession);
        }, {once: true});
        audio.addEventListener('pause', () => {
            if (!this.isCurrentPlaybackSession(playbackSession)) {
                return;
            }
            if (!audio.ended) {
                this.updateStatus('Pausiert');
            }
        });
        audio.addEventListener('play', () => {
            if (!this.isCurrentPlaybackSession(playbackSession)) {
                return;
            }
            this.updateStatus('Spielt');
        });
        await audio.play();
    }

    playSpeech(text, audioConfig = {}, isSsml, playbackSession, slide = {}) {
        if (!this.isSpeechReallyUsable()) {
            this.reportAudioIssue('Sprachausgabe wird von diesem Browser nicht unterstützt. Es wird eine Fallback-Showtime von 10 Sekunden verwendet.');
            this.updateStatus('Sprachausgabe nicht unterstützt');
            this.scheduleFallbackAdvance(slide, playbackSession);
            return;
        }

        const utterance = new SpeechSynthesisUtterance();
        utterance.text = isSsml ? ssmlToSpeechText(text) : text;
        utterance.lang = audioConfig.lang || 'de-DE';

        const voices = this.synthesis.getVoices();
        if (audioConfig.voice) {
            const voice = voices.find((candidate) => candidate.name === audioConfig.voice);
            if (voice) {
                utterance.voice = voice;
            }
        }

        if (typeof audioConfig.rate === 'number') utterance.rate = audioConfig.rate;
        if (typeof audioConfig.pitch === 'number') utterance.pitch = audioConfig.pitch;
        if (typeof audioConfig.volume === 'number') utterance.volume = audioConfig.volume;

        utterance.onstart = () => {
            if (!this.isCurrentPlaybackSession(playbackSession)) {
                return;
            }
            this.updateStatus(isSsml ? 'Spielt (SSML)' : 'Spielt (TTS)');
        };
        utterance.onend = () => {
            if (!this.isCurrentPlaybackSession(playbackSession)) {
                return;
            }
            this.updateStatus('Beendet');
            this.onEnded?.();
        };
        utterance.onerror = (event) => {
            if (!this.isCurrentPlaybackSession(playbackSession)) {
                return;
            }
            this.reportAudioIssue(`Fehler bei der Sprachausgabe (${event.error || 'unbekannt'}). Es wird eine Fallback-Showtime von 10 Sekunden verwendet.`);
            this.updateStatus(`TTS-Fehler: ${event.error || 'unbekannt'}`);
            this.scheduleFallbackAdvance(slide, playbackSession);
        };

        this.synthesis.speak(utterance);
    }

    scheduleFallbackAdvance(slide = {}, playbackSession) {
        this.clearUnavailableAudioFallbackTimer();
        const fallbackSeconds = getUnavailableAudioShowtimeSeconds(slide);
        this.onFallbackTimerStart?.(fallbackSeconds);
        this.unavailableAudioFallbackTimer = window.setTimeout(() => {
            this.unavailableAudioFallbackTimer = null;
            if (!this.isCurrentPlaybackSession(playbackSession)) {
                return;
            }
            this.onEnded?.();
        }, fallbackSeconds * 1000);
    }

    clearUnavailableAudioFallbackTimer() {
        if (!this.unavailableAudioFallbackTimer) {
            return;
        }
        window.clearTimeout(this.unavailableAudioFallbackTimer);
        this.unavailableAudioFallbackTimer = null;
    }

    updateStatus(status) {
        this.currentMode = status;
        this.onStatusChange?.(status);
    }

    isCurrentPlaybackSession(playbackSession) {
        return playbackSession === this.playbackSession;
    }

    reportAudioIssue(message) {
        this.onAudioIssue?.(message);
    }
}

function inferAudioType(audioConfig = {}) {
    const explicitType = String(audioConfig.type || '').trim().toLowerCase();
    if (explicitType) {
        return explicitType;
    }

    const src = String(audioConfig.src || '').trim();
    if (!src) {
        return '';
    }

    const extension = src
        .split('#', 1)[0]
        .split('?', 1)[0]
        .split('.')
        .pop()
        ?.toLowerCase();

    return extension || '';
}

const DEFAULT_UNAVAILABLE_AUDIO_SHOWTIME_SECONDS = 10;

function getUnavailableAudioShowtimeSeconds() {
    return DEFAULT_UNAVAILABLE_AUDIO_SHOWTIME_SECONDS;
}

function ssmlToSpeechText(ssml) {
    return ssml
        .replace(/<break[^>]*time="(.*?)"[^>]*\/>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isPlayableAudioType(audioType) {
    return [
        'mp3',
        'm4a',
        'aac',
        'wav',
        'ogg',
        'oga',
        'opus',
        'flac',
        'webm',
        'mp4',
    ].includes(String(audioType || '').toLowerCase());
}
