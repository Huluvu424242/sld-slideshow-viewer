export class AudioController {
  constructor({ onStatusChange, onEnded }) {
    this.onStatusChange = onStatusChange;
    this.onEnded = onEnded;
    this.audio = null;
    this.synthesis = window.speechSynthesis;
    this.currentMode = 'stopped';
    this.currentSlideKey = null;
  }

  async play(slide, assetLoader) {
    await this.stop();

    if (!slide.audio) {
      this.updateStatus('Kein Audio');
      this.onEnded?.();
      return;
    }

    const audioType = (slide.audio.type || '').toLowerCase();
    this.currentSlideKey = `${slide.id || ''}:${slide.audio.src || audioType}`;

    if (audioType === 'mp3') {
      const resolvedUrl = await assetLoader.resolvePlayableUrl(slide.audio.src);
      await this.playAudioElement(resolvedUrl);
      return;
    }

    if (audioType === 'txt' || audioType === 'ssml') {
      const text = await assetLoader.loadText(slide.audio.src);
      this.playSpeech(text, slide.audio, audioType === 'ssml');
      return;
    }

    this.updateStatus(`Nicht unterstützter Audiotyp: ${audioType}`);
  }

  async pause() {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this.updateStatus('Pausiert');
      return;
    }

    if (this.synthesis.speaking && !this.synthesis.paused) {
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

    if (this.synthesis.paused) {
      this.synthesis.resume();
      this.updateStatus('Spielt');
    }
  }

  async stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = '';
      this.audio = null;
    }

    this.synthesis.cancel();
    this.currentSlideKey = null;
    this.updateStatus('Gestoppt');
  }

  async playAudioElement(url) {
    const audio = new Audio(url);
    this.audio = audio;
    audio.addEventListener('ended', () => {
      this.updateStatus('Beendet');
      this.onEnded?.();
    }, { once: true });
    audio.addEventListener('pause', () => {
      if (!audio.ended) {
        this.updateStatus('Pausiert');
      }
    });
    audio.addEventListener('play', () => {
      this.updateStatus('Spielt');
    });
    await audio.play();
  }

  playSpeech(text, audioConfig, isSsml) {
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

    utterance.onstart = () => this.updateStatus(isSsml ? 'Spielt (SSML)' : 'Spielt (TTS)');
    utterance.onend = () => {
      this.updateStatus('Beendet');
      this.onEnded?.();
    };
    utterance.onerror = (event) => {
      this.updateStatus(`TTS-Fehler: ${event.error || 'unbekannt'}`);
    };

    this.synthesis.speak(utterance);
  }

  updateStatus(status) {
    this.currentMode = status;
    this.onStatusChange?.(status);
  }
}

function ssmlToSpeechText(ssml) {
  return ssml
    .replace(/<break[^>]*time="(.*?)"[^>]*\/>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
