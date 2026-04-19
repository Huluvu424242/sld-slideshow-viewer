import {createInitialState} from './state.js';
import {renderSlideContent} from './parser.js';
import {AudioController} from './audio.js';
import {loadDeckFromDirectory, loadDeckFromZip, loadDeckFromRemote} from './loaders.js';
import {
    SLIDE_CHANGE_BELL_DECAY_SECONDS,
    SLIDE_CHANGE_BELL_STRIKE_SECONDS,
    SLIDE_CHANGE_BELL_VOLUME,
    playSlideChangeGong,
} from './gong.js';
import {helleGlocke, playGlockeTone} from './glocke.js';
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
import {initializeIcons} from "./icons.js";

const state = createInitialState();
let slideAdvanceTimer = null;
let showtimeCountdownInterval = null;
let slideChangeCueAudioContext = null;
let nonAudioPlaybackRemainingSeconds = null;
let slideChangeCueIndicatorToken = 0;
const SLIDE_CHANGE_BELL_PAUSE_SECONDS = 0.7;
const DEFAULT_SLIDE_SHOWTIME_SECONDS = 10;
const DOUBLE_TAP_MAX_INTERVAL_MS = 320;
const DOUBLE_TAP_MAX_DRIFT_PX = 56;
const TRANSITION_UNLOCK_TIMEOUT_MS = 10_000;
let isSlideTransitionInProgress = false;
let transitionUnlockTimer = null;
const swipeState = createSwipeState();
const tapState = {
    lastTapTimestamp: 0,
    lastTapX: 0,
    lastTapY: 0,
};

const elements = {
    deckTitle: document.querySelector('#deck-title'),
    slideCounter: document.querySelector('#slide-counter'),
    sourceKind: document.querySelector('#source-kind'),
    audioStatus: document.querySelector('#audio-status'),
    errorBox: document.querySelector('#error-box'),
    slideList: document.querySelector('#slide-list'),
    slideStage: document.querySelector('#slide-stage'),
    gotoInput: document.querySelector('#goto-input'),
    showtimeCountdown: document.querySelector('#showtime-countdown'),
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
    onStatusChange(status) {
        elements.audioStatus.textContent = status;
        if (status.startsWith('Spielt')) {
            renderSpeakingIndicator();
        } else if (!showtimeCountdownInterval) {
            renderShowtimeDash();
        }
    },
    async onEnded() {
        await handleSlidePlaybackCompleted();
    },
    onFallbackTimerStart(seconds) {
        if (!state.autoAdvance) {
            return;
        }
        setPlayButtonActive(true);
        startShowtimeCountdown(null, {seconds});
    },
    onAudioIssue(message) {
        showError(`⚠️ ${message}`);
    },
});

initializeIcons()
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
    elements.playBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!state.deck || state.currentIndex < 0) {
            return;
        }

        if (elements.audioStatus.textContent === 'Pausiert') {
            await audioController.resume();
            keepPlaybackButtonFocus();
            return;
        }

        await withErrorHandling(async () => {
            await playCurrentSlide();
        });
        keepPlaybackButtonFocus();
    });
    elements.pauseBtn.addEventListener('click', async () => {
        clearSlideAdvanceTimer();
        clearShowtimeCountdown();
        nonAudioPlaybackRemainingSeconds = null;
        setPlayButtonActive(false);
        await audioController.pause();
    });
    elements.stopBtn.addEventListener('click', async () => {
        clearSlideAdvanceTimer();
        clearShowtimeCountdown();
        nonAudioPlaybackRemainingSeconds = null;
        setPlayButtonActive(false);
        await audioController.stop();
    });
    elements.autoplayNextCheckbox.addEventListener('change', () => {
        state.autoAdvance = elements.autoplayNextCheckbox.checked;
        syncAutoSlideChangeForCurrentSlide();
    });
    elements.transcriptToggleBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        const previousAutoAdvance = state.autoAdvance;
        await toggleTranscriptPanel();
        if (state.autoAdvance !== previousAutoAdvance) {
            state.autoAdvance = previousAutoAdvance;
            elements.autoplayNextCheckbox.checked = previousAutoAdvance;
            syncAutoSlideChangeForCurrentSlide();
        }
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
        resetTapState();
    }, {passive: true});
}

function keepPlaybackButtonFocus() {
    if (document.activeElement === elements.gotoInput) {
        elements.playBtn.focus({preventScroll: true});
    }
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

    const changedTouch = event.changedTouches?.[0];
    const {isHorizontalSwipe, horizontalDistance} = finishSwipe(swipeState, changedTouch);

    resetSwipeState(swipeState);

    if (isHorizontalSwipe) {
        resetTapState();
        if (horizontalDistance < 0) {
            await goToSlide(state.currentIndex + 1);
            return;
        }

        await goToSlide(state.currentIndex - 1);
        return;
    }

    if (!changedTouch) {
        return;
    }

    await handleDoubleTapNavigation(changedTouch);
}

async function handleDoubleTapNavigation(touch) {
    const now = Date.now();
    const deltaMs = now - tapState.lastTapTimestamp;
    const driftX = Math.abs(touch.clientX - tapState.lastTapX);
    const driftY = Math.abs(touch.clientY - tapState.lastTapY);
    const isDoubleTap = deltaMs <= DOUBLE_TAP_MAX_INTERVAL_MS
        && driftX <= DOUBLE_TAP_MAX_DRIFT_PX
        && driftY <= DOUBLE_TAP_MAX_DRIFT_PX;

    tapState.lastTapTimestamp = now;
    tapState.lastTapX = touch.clientX;
    tapState.lastTapY = touch.clientY;

    if (!isDoubleTap) {
        return;
    }

    resetTapState();
    const rect = elements.slideStage.getBoundingClientRect();
    const isRightSide = touch.clientX >= rect.left + (rect.width / 2);

    if (isRightSide) {
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

function clearShowtimeCountdown() {
    if (showtimeCountdownInterval) {
        window.clearInterval(showtimeCountdownInterval);
        showtimeCountdownInterval = null;
    }
}

function setPlayButtonActive(active) {
    elements.playBtn?.classList.toggle('is-active', active);
    elements.playBtn?.setAttribute('aria-pressed', active ? 'true' : 'false');
}

function resetTapState() {
    tapState.lastTapTimestamp = 0;
    tapState.lastTapX = 0;
    tapState.lastTapY = 0;
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
    if (!slide) {
        return DEFAULT_SLIDE_SHOWTIME_SECONDS;
    }
    const value = Number(slide.showtime);
    if (!Number.isFinite(value) || value <= 0) {
        return DEFAULT_SLIDE_SHOWTIME_SECONDS;
    }
    return value;
}

function renderShowtimeCountdown(value) {
    if (!elements.showtimeCountdown) {
        return;
    }

    const safeValue = Math.max(0, Math.floor(value));
    elements.showtimeCountdown.textContent = String(safeValue);
    elements.showtimeCountdown.classList.remove('is-speaking');
    elements.showtimeCountdown.classList.toggle('is-safe', safeValue > 3);
    elements.showtimeCountdown.classList.toggle('is-danger', safeValue <= 3);
}

function renderShowtimeDash() {
    if (!elements.showtimeCountdown) {
        return;
    }
    elements.showtimeCountdown.textContent = '–';
    elements.showtimeCountdown.classList.remove('is-danger', 'is-safe', 'is-speaking');
}

function renderSpeakingIndicator() {
    if (!elements.showtimeCountdown) {
        return;
    }
    elements.showtimeCountdown.textContent = '🗣️';
    elements.showtimeCountdown.classList.remove('is-danger', 'is-safe');
    elements.showtimeCountdown.classList.add('is-speaking');
}

function showSlideChangeCueIndicator() {
    if (!elements.showtimeCountdown) {
        return 0;
    }
    slideChangeCueIndicatorToken += 1;
    elements.showtimeCountdown.textContent = '🔔';
    elements.showtimeCountdown.classList.remove('is-danger', 'is-safe', 'is-speaking');
    return slideChangeCueIndicatorToken;
}

function restoreShowtimeCountdownAfterCue(token) {
    if (!elements.showtimeCountdown || token !== slideChangeCueIndicatorToken) {
        return;
    }
    if (nonAudioPlaybackRemainingSeconds !== null) {
        renderShowtimeCountdown(nonAudioPlaybackRemainingSeconds);
        return;
    }
    renderShowtimeDash();
}

function startShowtimeCountdown(slide, options = {}) {
    clearShowtimeCountdown();
    const overrideSeconds = Number(options.seconds);
    const hasOverride = Number.isFinite(overrideSeconds) && overrideSeconds > 0;

    if (!slide && !hasOverride) {
        renderShowtimeDash();
        return;
    }

    nonAudioPlaybackRemainingSeconds = hasOverride ? overrideSeconds : getSlideShowtimeSeconds(slide);
    renderShowtimeCountdown(nonAudioPlaybackRemainingSeconds);
    showtimeCountdownInterval = window.setInterval(() => {
        if (nonAudioPlaybackRemainingSeconds === null) {
            return;
        }
        nonAudioPlaybackRemainingSeconds = Math.max(0, nonAudioPlaybackRemainingSeconds - 1);
        renderShowtimeCountdown(nonAudioPlaybackRemainingSeconds);
        if (nonAudioPlaybackRemainingSeconds <= 0) {
            clearShowtimeCountdown();
            setPlayButtonActive(false);
        }
    }, 1000);
}

function updateSlideAudioStatus(slide) {
    const showtime = getSlideShowtimeSeconds(slide);
    if (slide?.audio) {
        elements.audioStatus.textContent = `Audio nicht verfügbar – Anzeige ${showtime} s`;
        return;
    }
    elements.audioStatus.textContent = `Kein Audio – Anzeige ${showtime} s`;
}

function scheduleAutoAdvanceForShowtime(slide) {
    clearSlideAdvanceTimer();

    const showtime = getSlideShowtimeSeconds(slide);
    if (!state.autoAdvance) {
        updateSlideAudioStatus(slide);
        return false;
    }

    updateSlideAudioStatus(slide);
    slideAdvanceTimer = window.setTimeout(async () => {
        slideAdvanceTimer = null;
        if (!state.autoAdvance || !state.deck) {
            return;
        }
        await handleSlidePlaybackCompleted();
    }, showtime * 1000);

    return true;
}

function syncAutoSlideChangeForCurrentSlide() {
    const slide = state.deck?.slides[state.currentIndex];
    if (!slide || slide.audio) {
        nonAudioPlaybackRemainingSeconds = null;
        clearSlideAdvanceTimer();
        clearShowtimeCountdown();
        setPlayButtonActive(false);
        return;
    }

    if (!state.autoAdvance) {
        clearSlideAdvanceTimer();
        setPlayButtonActive(false);
        return;
    }

    setPlayButtonActive(true);
    startShowtimeCountdown(slide);
    scheduleAutoAdvanceForShowtime(slide);
}

async function handleSlidePlaybackCompleted() {
    setPlayButtonActive(false);
    if (!state.autoAdvance || !state.deck || isSlideTransitionInProgress) {
        return;
    }

    if (state.currentIndex < state.deck.slides.length - 1) {
        await goToSlide(state.currentIndex + 1, {autoplay: true});
        return;
    }

    playSlideChangeCueWithIndicator();
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
    clearShowtimeCountdown();
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
        clearSlideAdvanceTimer();
        clearShowtimeCountdown();
        resetTapState();
        await audioController.stop();
        if (options.autoplay) {
            const bellDurationSeconds = playSlideChangeCueWithIndicator();
            await delay((bellDurationSeconds + SLIDE_CHANGE_BELL_PAUSE_SECONDS) * 1000);
        }
        state.currentIndex = index;
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

        try {
            return playGlockeTone(context, helleGlocke, {
                loudness: Math.min(1, Math.max(0.0001, SLIDE_CHANGE_BELL_VOLUME / 4)),
                attack: SLIDE_CHANGE_BELL_STRIKE_SECONDS,
                duration: SLIDE_CHANGE_BELL_DECAY_SECONDS,
            });
        } catch (glockeError) {
            console.debug('helleGlocke fehlgeschlagen, nutze Gong-Fallback.', glockeError);
        return playSlideChangeGong(context, {
            volume: SLIDE_CHANGE_BELL_VOLUME,
        strikeSeconds: SLIDE_CHANGE_BELL_STRIKE_SECONDS,
        decaySeconds: SLIDE_CHANGE_BELL_DECAY_SECONDS,
        });
        }
    } catch (error) {
        console.debug('Slide-Change-Cue konnte nicht abgespielt werden.', error);
        return 0;
    }
}

function playSlideChangeCueWithIndicator() {
    const bellDurationSeconds = playSlideChangeCue();
    if (bellDurationSeconds <= 0) {
        return bellDurationSeconds;
    }

    const indicatorToken = showSlideChangeCueIndicator();
    window.setTimeout(() => {
        restoreShowtimeCountdownAfterCue(indicatorToken);
    }, bellDurationSeconds * 1000);

    return bellDurationSeconds;
}

function delay(durationMs) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, durationMs);
    });
}

async function renderCurrentSlide() {
    clearSlideAdvanceTimer();
    clearShowtimeCountdown();
    nonAudioPlaybackRemainingSeconds = null;
    setPlayButtonActive(false);
    const slide = state.deck?.slides[state.currentIndex];
    if (!slide) {
        elements.slideStage.innerHTML = `<div class="placeholder"><h2>Keine Folie gewählt</h2></div>`;
        if (elements.showtimeCountdown) {
            renderShowtimeDash();
        }
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
        syncAutoSlideChangeForCurrentSlide();
        if (isTranscriptPanelOpen()) {
            await renderTranscriptContent({keepOpen: true});
        }
        return;
    }

    renderShowtimeDash();

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
            setPlayButtonActive(true);
            startShowtimeCountdown(slide);
            if (state.autoAdvance) {
                scheduleAutoAdvanceForShowtime(slide);
            } else {
                clearSlideAdvanceTimer();
            }
            return;
        }
        clearSlideAdvanceTimer();
        clearShowtimeCountdown();
        nonAudioPlaybackRemainingSeconds = null;
        setPlayButtonActive(true);
        renderSpeakingIndicator();
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
    const currentSlide = state.deck?.slides[state.currentIndex];
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
    elements.transcriptToggleBtn.disabled = disabled || !hasSlideAudioSource(currentSlide);
}

function hasSlideAudioSource(slide) {
    const source = slide?.audio?.src;
    return typeof source === 'string' && source.trim().length > 0;
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
        ℹ️ Falls eine Folie Audio per TTS benötigt, wird stattdessen eine Fallback-Showtime von 10 Sekunden verwendet.
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
