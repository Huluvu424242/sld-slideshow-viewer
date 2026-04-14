import {createInitialState} from './state.js';
import {renderSlideContent} from './parser.js';
import {AudioController} from './audio.js';
import {loadDeckFromDirectory, loadDeckFromZip, loadDeckFromRemote} from './loaders.js';

const state = createInitialState();
let slideAdvanceTimer = null;
let slideChangeCueAudioContext = null;
const SLIDE_CHANGE_BELL_VOLUME = 5.0;
const SLIDE_CHANGE_BELL_STRIKE_SECONDS = 0.045;
const SLIDE_CHANGE_BELL_DECAY_SECONDS = 1.8;
const SLIDE_CHANGE_BELL_PAUSE_SECONDS = 0.5;
const TRANSITION_UNLOCK_TIMEOUT_MS = 10_000;
let isSlideTransitionInProgress = false;
let transitionUnlockTimer = null;

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
            await goToSlide(state.currentIndex + 1, {autoplay: true});
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
        if (isSlideTransitionInProgress) {
            return;
        }
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

function beginSlideTransitionLock() {
    isSlideTransitionInProgress = true;
    refreshUi();
    setSlideListNavigationDisabled(true);
    clearTransitionUnlockTimer();
    transitionUnlockTimer = window.setTimeout(() => {
        if (!isSlideTransitionInProgress) {
            return;
        }
        console.warn('Navigation wurde per Notfall-Timeout entsperrt.');
        endSlideTransitionLock();
    }, TRANSITION_UNLOCK_TIMEOUT_MS);
}

function endSlideTransitionLock() {
    isSlideTransitionInProgress = false;
    clearTransitionUnlockTimer();
    refreshUi();
    setSlideListNavigationDisabled(false);
}

function clearTransitionUnlockTimer() {
    if (transitionUnlockTimer) {
        window.clearTimeout(transitionUnlockTimer);
        transitionUnlockTimer = null;
    }
}

function setSlideListNavigationDisabled(disabled) {
    const buttons = elements.slideList.querySelectorAll('button');
    buttons.forEach((button) => {
        button.disabled = disabled;
    });
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
            await goToSlide(state.currentIndex + 1, {autoplay: true});
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
    checkAudioSupport();
}

async function goToSlide(index, options = {}) {
    if (isSlideTransitionInProgress) {
        return;
    }
    if (!state.deck) {
        return;
    }
    if (index < 0 || index >= state.deck.slides.length) {
        return;
    }
    beginSlideTransitionLock();
    try {
        const bellDurationSeconds = playSlideChangeCue();
        await delay((bellDurationSeconds + SLIDE_CHANGE_BELL_PAUSE_SECONDS) * 1000);
        clearSlideAdvanceTimer();
        state.currentIndex = index;
        await audioController.stop();
        hideTranscriptPanel();
        refreshUi();
        renderSlideList();
        await renderCurrentSlide();
        if (options.autoplay) {
            await playCurrentSlide({ignoreTransitionLock: true});
        }
    } finally {
        endSlideTransitionLock();
    }
}

function playSlideChangeCue() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return 0;
    }

    try {
        if (!slideChangeCueAudioContext) {
            slideChangeCueAudioContext = new AudioContextClass();
        }
        const context = slideChangeCueAudioContext;
        if (context.state === 'suspended') {
            context.resume().catch(() => {
            });
        }

        const now = context.currentTime;
        const attackEnd = now + SLIDE_CHANGE_BELL_STRIKE_SECONDS;
        const releaseEnd = attackEnd + SLIDE_CHANGE_BELL_DECAY_SECONDS;
        const masterGain = context.createGain();
        const bellVoices = [
            {frequency: 110, level: 1.0, type: 'sine', detune: -3},
            {frequency: 165, level: 0.7, type: 'triangle', detune: 2},
            {frequency: 220, level: 0.45, type: 'sine', detune: -1},
            {frequency: 277, level: 0.3, type: 'sine', detune: 1},
            {frequency: 330, level: 0.2, type: 'triangle', detune: 0},
        ];

        masterGain.gain.setValueAtTime(0.0001, now);
        masterGain.gain.exponentialRampToValueAtTime(SLIDE_CHANGE_BELL_VOLUME, attackEnd);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);
        masterGain.connect(context.destination);

        bellVoices.forEach(({frequency, level, type, detune}) => {
            const oscillator = context.createOscillator();
            const voiceGain = context.createGain();
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, now);
            oscillator.detune.setValueAtTime(detune, now);
            oscillator.detune.linearRampToValueAtTime(detune * 0.4, releaseEnd);

            voiceGain.gain.setValueAtTime(Math.max(0.0001, level * 0.001), now);
            voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), attackEnd);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);

            oscillator.connect(voiceGain);
            voiceGain.connect(masterGain);
            oscillator.start(now);
            oscillator.stop(releaseEnd + 0.05);
        });
        return SLIDE_CHANGE_BELL_STRIKE_SECONDS + SLIDE_CHANGE_BELL_DECAY_SECONDS;
    } catch (error) {
        console.debug('Slide-Change-Cue konnte nicht abgespielt werden.', error);
        return 0;
    }
}

function delay(durationMs) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, durationMs);
    });
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
            await renderTranscriptContent({keepOpen: true});
        }
        return;
    }

    if (isTranscriptPanelOpen()) {
        await renderTranscriptContent({keepOpen: true});
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

async function playCurrentSlide(options = {}) {
    if (isSlideTransitionInProgress && !options.ignoreTransitionLock) {
        return;
    }
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
        button.disabled = isSlideTransitionInProgress;
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

    const disabled = !state.deck || isSlideTransitionInProgress;
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

    elements.gotoInput.disabled = disabled;
    elements.transcriptToggleBtn.disabled = disabled;
}

async function toggleTranscriptPanel() {
    const shouldOpen = !isTranscriptPanelOpen();
    if (shouldOpen) {
        await renderTranscriptContent({keepOpen: true});
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
    window.scrollTo(0, 0);
}

function clearTranscriptPanelContent() {
    elements.transcriptHint.textContent = '';
    elements.transcriptText.textContent = '';
    elements.transcriptText.classList.add('hidden');
    elements.transcriptAudioPlayer.pause();
    elements.transcriptAudioPlayer.removeAttribute('src');
    elements.transcriptAudioPlayer.classList.remove('is-disabled');
    elements.transcriptAudioPlayer.classList.add('hidden');
}

function isTranscriptPanelOpen() {
    return !elements.transcriptPanel.classList.contains('hidden');
}

async function renderTranscriptContent({keepOpen = false} = {}) {
    const slide = state.deck?.slides[state.currentIndex];
    clearTranscriptPanelContent();

    if (!slide?.audio?.src) {
        elements.transcriptHint.textContent = 'Für diese Folie ist keine Audioquelle hinterlegt.';
        setTranscriptPanelVisibility(keepOpen);
        return;
    }

    const audioType = inferAudioType(slide.audio);
    elements.transcriptAudioPlayer.classList.remove('hidden');

    try {
        const resolvedSource = await state.deck.assetLoader.resolvePlayableUrl(slide.audio.src);
        elements.transcriptAudioPlayer.src = resolvedSource;
        const playableInBrowser = canPlayInAudioElement(elements.transcriptAudioPlayer, audioType, slide.audio.src);
        elements.transcriptAudioPlayer.classList.toggle('is-disabled', !playableInBrowser);
        if (!playableInBrowser) {
            elements.transcriptAudioPlayer.pause();
        }
    } catch (error) {
        elements.transcriptAudioPlayer.classList.add('is-disabled');
        elements.transcriptHint.textContent = 'Die Audioquelle konnte nicht in den Player geladen werden.';
    }

    if (isTextAudioType(audioType)) {
        try {
            const textContent = await state.deck.assetLoader.loadText(slide.audio.src);
            elements.transcriptText.textContent = audioType === 'ssml'
                ? ssmlToDisplayText(textContent)
                : preserveStructuredText(textContent);
            elements.transcriptText.classList.remove('hidden');
            if (!elements.transcriptHint.textContent) {
                elements.transcriptHint.textContent = 'Text aus der in slides.json referenzierten Audio-Datei.';
            }
        } catch (error) {
            elements.transcriptHint.textContent = 'Der Text zur Audio-Datei konnte nicht geladen werden.';
        }
        setTranscriptPanelVisibility(keepOpen);
        return;
    }

    if (isPlayableAudioType(audioType, slide.audio.src)) {
        if (!elements.transcriptHint.textContent) {
            elements.transcriptHint.textContent = 'Für diese Folie liegt eine Audio-Datei vor. Du kannst im Player navigieren.';
        }
        setTranscriptPanelVisibility(keepOpen);
        return;
    }

    if (!elements.transcriptHint.textContent) {
        elements.transcriptHint.textContent = 'Der Audio-Typ dieser Folie wird für die Text/Audio-Anzeige nicht unterstützt.';
    }
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
    elements.errorBox.textContent = message.replace(/\n/g, '\n');
    elements.errorBox.classList.remove('hidden');
}

function hideError() {
    elements.errorBox.classList.add('hidden');
    elements.errorBox.textContent = '';
}

function checkAudioSupport() {
    if (!audioController.isSpeechReallyUsable()) {
        showError(`
        ⚠️ Sprachwiedergabe wird von diesem Browser nicht unterstützt.
        👉 Bitte öffne die Slideshow in Chrome auf Android.
        `);
    }
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
    const normalized = String(ssml).replace(/\r\n?/g, '\n');
    const withStructure = normalized
        .replace(/<\s*break\b[^>]*\/?>/gi, '\n')
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\s*\/\s*(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6)\s*>/gi, '\n')
        .replace(/<\s*\/\s*(s|sentence)\s*>/gi, '\n')
        .replace(/<\s*\/\s*(speak|paragraph)\s*>/gi, '\n\n');

    const withoutTags = withStructure.replace(/<[^>]+>/g, '');
    const decoded = decodeSimpleXmlEntities(withoutTags);

    return preserveStructuredText(decoded);
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

    return ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'oga', 'opus', 'flac', 'webm', 'mp4'].includes(extension || '');
}

function preserveStructuredText(text) {
    return String(text)
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function decodeSimpleXmlEntities(text) {
    return String(text)
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&apos;', "'");
}

function canPlayInAudioElement(audioElement, audioType, sourcePath) {
    const mimeType = inferMimeType(audioType, sourcePath);
    if (!mimeType) {
        return false;
    }
    return audioElement.canPlayType(mimeType) !== '';
}

function inferMimeType(audioType, sourcePath) {
    const normalizedType = String(audioType || '').toLowerCase();
    if (normalizedType === 'ssml') return 'application/ssml+xml';
    if (normalizedType === 'txt') return 'text/plain';
    if (normalizedType === 'mp3') return 'audio/mpeg';
    if (normalizedType === 'wav') return 'audio/wav';
    if (normalizedType === 'ogg') return 'audio/ogg';
    if (normalizedType === 'oga') return 'audio/ogg';
    if (normalizedType === 'opus') return 'audio/ogg; codecs=opus';
    if (normalizedType === 'm4a') return 'audio/mp4';
    if (normalizedType === 'aac') return 'audio/aac';
    if (normalizedType === 'flac') return 'audio/flac';
    if (normalizedType === 'webm') return 'audio/webm';
    if (normalizedType === 'mp4') return 'audio/mp4';

    const extension = String(sourcePath)
        .split('#', 1)[0]
        .split('?', 1)[0]
        .split('.')
        .pop()
        ?.toLowerCase();

    const extensionToMime = {
        ssml: 'application/ssml+xml',
        txt: 'text/plain',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        oga: 'audio/ogg',
        opus: 'audio/ogg; codecs=opus',
        m4a: 'audio/mp4',
        aac: 'audio/aac',
        flac: 'audio/flac',
        webm: 'audio/webm',
        mp4: 'audio/mp4',
    };

    return extensionToMime[extension] || '';
}
