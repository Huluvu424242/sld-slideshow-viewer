import {createInitialState} from './state.js';
import {renderSlideContent} from './parser.js';
import {AudioController} from './audio.js';
import {loadDeckFromDirectory, loadDeckFromZip, loadDeckFromRemote} from './loaders.js';
import {
    canPlayInAudioElement,
    inferAudioType,
    isPlayableAudioType,
    isTextAudioType,
    preserveStructuredText,
    ssmlToDisplayText,
} from './transcript.js';
import {
    createSwipeState,
    finishSwipe,
    resetSwipeState,
    startSwipeTracking,
    updateSwipeTracking,
} from './swipe.js';

const state = createInitialState();
let slideAdvanceTimer = null;
let slideChangeCueAudioContext = null;
const SLIDE_CHANGE_BELL_VOLUME = 3.6;
const SLIDE_CHANGE_BELL_STRIKE_SECONDS = 0.025;
const SLIDE_CHANGE_BELL_DECAY_SECONDS = 3.2;
const SLIDE_CHANGE_BELL_PAUSE_SECONDS = 0.7;
const TRANSITION_UNLOCK_TIMEOUT_MS = 10_000;
let isSlideTransitionInProgress = false;
let transitionUnlockTimer = null;
const swipeState = createSwipeState();

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

    elements.slideStage.addEventListener('touchstart', handleTouchStart, {passive: true});
    elements.slideStage.addEventListener('touchmove', handleTouchMove, {passive: true});
    elements.slideStage.addEventListener('touchend', (event) => {
        void handleTouchEnd(event);
    }, {passive: true});
    elements.slideStage.addEventListener('touchcancel', () => {
        resetSwipeState(swipeState);
    }, {passive: true});
}

function handleTouchStart(event) {
    if (event.touches.length !== 1) {
        resetSwipeState(swipeState);
        return;
    }
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) {
        resetSwipeState(swipeState);
        return;
    }
    const touch = event.touches[0];
    startSwipeTracking(swipeState, touch);
}

function handleTouchMove(event) {
    if (!swipeState.tracking || event.touches.length !== 1) {
        return;
    }
    const touch = event.touches[0];
    updateSwipeTracking(swipeState, touch);
}

async function handleTouchEnd(event) {
    if (!swipeState.tracking || !state.deck || isSlideTransitionInProgress) {
        resetSwipeState(swipeState);
        return;
    }

    const {isHorizontalSwipe, horizontalDistance} = finishSwipe(swipeState, event.changedTouches?.[0]);

    resetSwipeState(swipeState);

    if (!isHorizontalSwipe) {
        return;
    }

    if (horizontalDistance < 0) {
        await goToSlide(state.currentIndex + 1);
        return;
    }

    await goToSlide(state.currentIndex - 1);
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
        masterGain.gain.exponentialRampToValueAtTime(SLIDE_CHANGE_BELL_VOLUME, attackEnd);
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
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, attackEnd + (SLIDE_CHANGE_BELL_DECAY_SECONDS * ring));

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
    elements.slideStage?.scrollIntoView({behavior: 'auto', block: 'start'});
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
        👉 Bitte nutze ein Gerät mit funktionierender SpeechSynthesis, häufig funzt ein Chrome Browser.
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
