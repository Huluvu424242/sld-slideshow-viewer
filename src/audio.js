export class AudioController {
    constructor({onStatusChange, onEnded, fallbackMessage = 'Die Audio Datei konnte nicht geladen werden.'}) {
        this.onStatusChange = onStatusChange;
        this.onEnded = onEnded;
        this.fallbackMessage = fallbackMessage;
        this.audio = null;
        this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
        this.currentMode = 'stopped';
        this.currentSlideKey = null;
        this.playbackSession = 0;
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
                await this.playAudioElement(resolvedUrl, playbackSession);
                return;
            }

            if (audioType === 'txt' || audioType === 'ssml') {
                const text = await assetLoader.loadText(slide.audio.src);
                this.playSpeech(text, slide.audio, audioType === 'ssml', playbackSession);
                return;
            }

            this.updateStatus(`Nicht unterstützter Audiotyp: ${audioType || 'unbekannt'}`);
            await this.playFallbackMessage(slide.audio, playbackSession);
        } catch (error) {
            console.warn('Audio konnte nicht geladen werden. Fallback wird gesprochen.', error);
            this.updateStatus('Audio-Datei fehlt oder ist nicht erreichbar');
            await this.playFallbackMessage(slide.audio, playbackSession);
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

    async playAudioElement(url, playbackSession) {
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
            console.warn('Audio-Datei konnte nicht abgespielt werden. Fallback wird gesprochen.', url);
            this.audio = null;
            this.updateStatus('Audio-Datei fehlt oder ist nicht erreichbar');
            await this.playFallbackMessage({}, playbackSession);
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

    async playFallbackMessage(audioConfig = {}, playbackSession) {
        if (!this.isSpeechReallyUsable()) {
            this.updateStatus('Audio nicht verfügbar');
            if (this.isCurrentPlaybackSession(playbackSession)) {
                this.onEnded?.();
            }
            return;
        }
        this.playSpeech(this.fallbackMessage, audioConfig, false, playbackSession);
    }

    playSpeech(text, audioConfig = {}, isSsml, playbackSession) {
        if (!this.isSpeechReallyUsable()) {
            this.updateStatus('Sprachausgabe nicht unterstützt');
            if (this.isCurrentPlaybackSession(playbackSession)) {
                this.onEnded?.();
            }
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
            this.updateStatus(`TTS-Fehler: ${event.error || 'unbekannt'}`);
            this.onEnded?.();
        };

        this.synthesis.speak(utterance);
    }

    updateStatus(status) {
        this.currentMode = status;
        this.onStatusChange?.(status);
    }

    isCurrentPlaybackSession(playbackSession) {
        return playbackSession === this.playbackSession;
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
