import { createInitialState } from './state.js';
import { renderSlideContent } from './parser.js';
import { AudioController } from './audio.js';
import { loadDeckFromDirectory, loadDeckFromZip, loadDeckFromRemote } from './loaders.js';

const state = createInitialState();
let slideAdvanceTimer = null;

const elements = {
  deckTitle: document.querySelector('#deck-title'),
  slideCounter: document.querySelector('#slide-counter'),
  sourceKind: document.querySelector('#source-kind'),
  audioStatus: document.querySelector('#audio-status'),
  errorBox: document.querySelector('#error-box'),
  slideList: document.querySelector('#slide-list'),
  slideStage: document.querySelector('#slide-stage'),
  gotoInput: document.querySelector('#goto-input'),
  transcriptToggleBtn: document.querySelector('#transcript-toggle-btn'),
  transcriptPanel: document.querySelector('#transcript-panel'),
  transcriptHint: document.querySelector('#transcript-hint'),
  transcriptText: document.querySelector('#transcript-text'),
  transcriptAudioPlayer: document.querySelector('#transcript-audio-player'),
  autoplayNextCheckbox: document.querySelector('#autoplay-next-checkbox'),
  remoteUrlInput: document.querySelector('#remote-url-input'),
  zipInput: document.querySelector('#zip-input'),
  pickDirectoryBtn: document.querySelector('#pick-directory-btn'),
  loadRemoteBtn: document.querySelector('#load-remote-btn'),
  firstBtn: document.querySelector('#first-btn'),
  prevBtn: document.querySelector('#prev-btn'),
  playBtn: document.querySelector('#play-btn'),
  pauseBtn: document.querySelector('#pause-btn'),
  stopBtn: document.querySelector('#stop-btn'),
  nextBtn: document.querySelector('#next-btn'),
  lastBtn: document.querySelector('#last-btn'),
  gotoBtn: document.querySelector('#goto-btn'),
};

const audioController = new AudioController({
  fallbackMessage: 'Die Audio Datei konnte nicht geladen werden.',
  onStatusChange(status) {
    elements.audioStatus.textContent = status;
  },
  async onEnded() {
    if (!state.autoAdvance) {
      return;
    }
    if (!state.deck) {
      return;
    }
    if (state.currentIndex < state.deck.slides.length - 1) {
      await goToSlide(state.currentIndex + 1, { autoplay: true });
    }
  },
});

bindEvents();
refreshUi();
await initializeFromQueryParameters();

function bindEvents() {
  elements.pickDirectoryBtn.addEventListener('click', async () => {
    await withErrorHandling(async () => {
      const deck = await loadDeckFromDirectory();
      await setDeck(deck);
    });
  });

  elements.zipInput.addEventListener('change', async (event) => {
    const [file] = event.target.files ?? [];
    if (!file) {
      return;
    }
    await withErrorHandling(async () => {
      const deck = await loadDeckFromZip(file);
      await setDeck(deck);
      event.target.value = '';
    });
  });

  elements.loadRemoteBtn.addEventListener('click', async () => {
    await withErrorHandling(async () => {
      const url = elements.remoteUrlInput.value.trim();
      if (!url) {
        throw new Error('Bitte eine Remote-URL eingeben.');
      }
      const deck = await loadDeckFromRemote(url);
      await setDeck(deck);
    });
  });

  elements.firstBtn.addEventListener('click', () => goToSlide(0));
  elements.prevBtn.addEventListener('click', () => goToSlide(state.currentIndex - 1));
  elements.nextBtn.addEventListener('click', () => goToSlide(state.currentIndex + 1));
  elements.lastBtn.addEventListener('click', () => goToSlide(state.deck?.slides.length - 1 ?? -1));
  elements.gotoBtn.addEventListener('click', () => goToSlide(Number(elements.gotoInput.value) - 1));
  elements.playBtn.addEventListener('click', async () => {
    if (!state.deck || state.currentIndex < 0) {
      return;
    }

    if (elements.audioStatus.textContent === 'Pausiert') {
      await audioController.resume();
      return;
    }

    await withErrorHandling(async () => {
      await playCurrentSlide();
    });
  });
  elements.pauseBtn.addEventListener('click', async () => {
    clearSlideAdvanceTimer();
    await audioController.pause();
  });
  elements.stopBtn.addEventListener('click', async () => {
    clearSlideAdvanceTimer();
    await audioController.stop();
  });
  elements.autoplayNextCheckbox.addEventListener('change', () => {
    state.autoAdvance = elements.autoplayNextCheckbox.checked;
  });
  elements.transcriptToggleBtn.addEventListener('click', async () => {
    await toggleTranscriptPanel();
  });

  document.addEventListener('keydown', async (event) => {
    if (event.target instanceof HTMLInputElement) {
      return;
    }
    if (event.key === 'ArrowRight') await goToSlide(state.currentIndex + 1);
    if (event.key === 'ArrowLeft') await goToSlide(state.currentIndex - 1);
    if (event.key === 'Home') await goToSlide(0);
    if (event.key === 'End') await goToSlide(state.deck?.slides.length - 1 ?? -1);
    if (event.key === ' ') {
      event.preventDefault();
      await playCurrentSlide();
    }
  });
}

function clearSlideAdvanceTimer() {
  if (slideAdvanceTimer) {
    window.clearTimeout(slideAdvanceTimer);
    slideAdvanceTimer = null;
  }
}

function getSlideShowtimeSeconds(slide) {
  if (!slide || slide.audio) {
    return null;
  }

  const value = Number(slide.showtime);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function updateSlideAudioStatus(slide) {
  const showtime = getSlideShowtimeSeconds(slide);
  elements.audioStatus.textContent = showtime
    ? `Kein Audio – Anzeige ${showtime} s`
    : 'Kein Audio';
}

function scheduleAutoAdvanceForSilentSlide(slide) {
  clearSlideAdvanceTimer();

  const showtime = getSlideShowtimeSeconds(slide);
  if (!showtime || !state.autoAdvance) {
    updateSlideAudioStatus(slide);
    return false;
  }

  updateSlideAudioStatus(slide);
  slideAdvanceTimer = window.setTimeout(async () => {
    slideAdvanceTimer = null;
    if (!state.autoAdvance || !state.deck) {
      return;
    }
    if (state.currentIndex < state.deck.slides.length - 1) {
      await goToSlide(state.currentIndex + 1, { autoplay: true });
    }
  }, showtime * 1000);

  return true;
}

async function initializeFromQueryParameters() {
  const params = new URLSearchParams(window.location.search);
  const remoteUrl = params.get('url')?.trim();

  if (!remoteUrl) {
    return;
  }

  elements.remoteUrlInput.value = remoteUrl;

  await withErrorHandling(async () => {
    const deck = await loadDeckFromRemote(remoteUrl);
    await setDeck(deck);
  });
}

async function setDeck(deck) {
  clearSlideAdvanceTimer();
  state.deck = deck;
  state.sourceKind = deck.sourceKind;
  state.currentIndex = 0;
  await audioController.stop();
  hideTranscriptPanel();
  refreshUi();
  renderSlideList();
  await renderCurrentSlide();
}

async function goToSlide(index, options = {}) {
  if (!state.deck) {
    return;
  }
  if (index < 0 || index >= state.deck.slides.length) {
    return;
  }
  clearSlideAdvanceTimer();
  state.currentIndex = index;
  await audioController.stop();
  refreshUi();
  renderSlideList();
  await renderCurrentSlide();
  if (options.autoplay) {
    await playCurrentSlide();
  }
}

async function renderCurrentSlide() {
  clearSlideAdvanceTimer();
  const slide = state.deck?.slides[state.currentIndex];
  if (!slide) {
    elements.slideStage.innerHTML = `<div class="placeholder"><h2>Keine Folie gewählt</h2></div>`;
    hideTranscriptPanel();
    return;
  }

  const assetResolver = (assetPath) => {
    const resolved = state.deck.assetLoader.resolveAssetPath(assetPath);
    if (resolved instanceof Promise) {
      return '';
    }
    return resolved;
  };

  const html = renderSlideContent(slide, assetResolver);
  elements.slideStage.innerHTML = `
    <article class="slide-card" data-slide-id="${escapeHtml(slide.id || '')}">
      ${html}
    </article>
  `;

  await hydrateAsyncAssets();

  if (!slide.audio) {
    updateSlideAudioStatus(slide);
    if (isTranscriptPanelOpen()) {
      await renderTranscriptContent({ keepOpen: true });
    }
    return;
  }

  if (isTranscriptPanelOpen()) {
    await renderTranscriptContent({ keepOpen: true });
  }
}

async function hydrateAsyncAssets() {
  const images = [...elements.slideStage.querySelectorAll('img[src=""]')];
  for (const image of images) {
    const original = image.getAttribute('data-original-src');
    if (!original) {
      continue;
    }
    image.src = await state.deck.assetLoader.resolvePlayableUrl(original);
  }
}

async function playCurrentSlide() {
  const slide = state.deck?.slides[state.currentIndex];
  if (!slide) {
    return;
  }
  await withErrorHandling(async () => {
    if (!slide.audio) {
      scheduleAutoAdvanceForSilentSlide(slide);
      return;
    }
    clearSlideAdvanceTimer();
    await audioController.play(slide, state.deck.assetLoader);
  });
}

function renderSlideList() {
  const slides = state.deck?.slides ?? [];
  elements.slideList.innerHTML = '';
  const fragment = document.createDocumentFragment();

  slides.forEach((slide, index) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    const slideLabel = slide.title || slide.id || slide.content;
    button.textContent = ` ${slideLabel}`;
    if (index === state.currentIndex) {
      button.classList.add('active');
    }
    button.addEventListener('click', () => {
      void goToSlide(index);
    });
    li.append(button);
    fragment.append(li);
  });

  elements.slideList.append(fragment);
}

function refreshUi() {
  const slideCount = state.deck?.slides.length ?? 0;
  elements.deckTitle.textContent = state.deck?.title ?? '–';
  elements.sourceKind.textContent = state.sourceKind ?? '–';
  elements.slideCounter.textContent = slideCount > 0 ? `${state.currentIndex + 1} / ${slideCount}` : '0 / 0';
  elements.gotoInput.max = String(Math.max(slideCount, 1));
  elements.gotoInput.value = slideCount > 0 ? String(state.currentIndex + 1) : '1';
  elements.autoplayNextCheckbox.checked = state.autoAdvance;

  const disabled = !state.deck;
  for (const button of [
    elements.firstBtn,
    elements.prevBtn,
    elements.playBtn,
    elements.pauseBtn,
    elements.stopBtn,
    elements.nextBtn,
    elements.lastBtn,
    elements.gotoBtn,
  ]) {
    button.disabled = disabled;
  }

  elements.transcriptToggleBtn.disabled = disabled;
}

async function toggleTranscriptPanel() {
  const shouldOpen = !isTranscriptPanelOpen();
  if (shouldOpen) {
    await renderTranscriptContent({ keepOpen: true });
    return;
  }
  setTranscriptPanelVisibility(shouldOpen);
}

function setTranscriptPanelVisibility(isVisible) {
  elements.transcriptPanel.classList.toggle('hidden', !isVisible);
  elements.transcriptToggleBtn.setAttribute('aria-expanded', String(isVisible));
  elements.transcriptToggleBtn.setAttribute('aria-pressed', String(isVisible));
  elements.transcriptToggleBtn.classList.toggle('is-open', isVisible);
  const tooltipText = isVisible ? 'Audiotext ausblenden' : 'Audiotext einblenden';
  elements.transcriptToggleBtn.title = tooltipText;
  elements.transcriptToggleBtn.setAttribute('aria-label', tooltipText);
}

function hideTranscriptPanel() {
  setTranscriptPanelVisibility(false);
  clearTranscriptPanelContent();
}

function clearTranscriptPanelContent() {
  elements.transcriptHint.textContent = '';
  elements.transcriptText.textContent = '';
  elements.transcriptText.classList.add('hidden');
  elements.transcriptAudioPlayer.pause();
  elements.transcriptAudioPlayer.removeAttribute('src');
  elements.transcriptAudioPlayer.classList.add('hidden');
}

function isTranscriptPanelOpen() {
  return !elements.transcriptPanel.classList.contains('hidden');
}

async function renderTranscriptContent({ keepOpen = false } = {}) {
  const slide = state.deck?.slides[state.currentIndex];
  clearTranscriptPanelContent();

  if (!slide?.audio?.src) {
    elements.transcriptHint.textContent = 'Für diese Folie ist keine Audioquelle hinterlegt.';
    setTranscriptPanelVisibility(keepOpen);
    return;
  }

  const audioType = inferAudioType(slide.audio);

  if (isTextAudioType(audioType)) {
    try {
      const textContent = await state.deck.assetLoader.loadText(slide.audio.src);
      elements.transcriptText.textContent = audioType === 'ssml'
        ? ssmlToDisplayText(textContent)
        : textContent.trim();
      elements.transcriptText.classList.remove('hidden');
      elements.transcriptHint.textContent = 'Text aus der in slides.json referenzierten Audio-Datei.';
    } catch (error) {
      elements.transcriptHint.textContent = 'Der Text zur Audio-Datei konnte nicht geladen werden.';
    }
    setTranscriptPanelVisibility(keepOpen);
    return;
  }

  if (isPlayableAudioType(audioType, slide.audio.src)) {
    try {
      elements.transcriptAudioPlayer.src = await state.deck.assetLoader.resolvePlayableUrl(slide.audio.src);
      elements.transcriptAudioPlayer.classList.remove('hidden');
      elements.transcriptHint.textContent = 'Für diese Folie liegt eine Audio-Datei vor. Du kannst im Player navigieren.';
    } catch (error) {
      elements.transcriptHint.textContent = 'Die Audio-Datei für den Player konnte nicht geladen werden.';
    }
    setTranscriptPanelVisibility(keepOpen);
    return;
  }

  elements.transcriptHint.textContent = 'Der Audio-Typ dieser Folie wird für die Text/Audio-Anzeige nicht unterstützt.';
  setTranscriptPanelVisibility(keepOpen);
}

async function withErrorHandling(fn) {
  try {
    hideError();
    await fn();
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error));
  }
}

function showError(message) {
  elements.errorBox.textContent = message;
  elements.errorBox.classList.remove('hidden');
}

function hideError() {
  elements.errorBox.classList.add('hidden');
  elements.errorBox.textContent = '';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

  return src
    .split('#', 1)[0]
    .split('?', 1)[0]
    .split('.')
    .pop()
    ?.toLowerCase();
}

function ssmlToDisplayText(ssml) {
  return ssml
    .replace(/<break[^>]*time="(.*?)"[^>]*\/>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTextAudioType(audioType) {
  return audioType === 'txt' || audioType === 'ssml';
}

function isPlayableAudioType(audioType, sourcePath = '') {
  if (audioType && !isTextAudioType(audioType)) {
    return true;
  }

  const extension = String(sourcePath)
    .split('#', 1)[0]
    .split('?', 1)[0]
    .split('.')
    .pop()
    ?.toLowerCase();

  return ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'].includes(extension || '');
}
