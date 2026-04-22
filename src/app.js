import {createInitialState} from './state.js';
import {renderSlideContent} from './wiki-parser.js';
import {AudioController} from './audio.js';
import {loadDeckFromDirectory, loadDeckFromZip, loadDeckFromRemote} from './loaders.js';
import {
    SLIDE_CHANGE_BELL_DECAY_SECONDS,
    SLIDE_CHANGE_BELL_STRIKE_SECONDS,
    SLIDE_CHANGE_BELL_VOLUME,
    playSlideChangeGong,
} from './gong.js';
import {grosseGlocke, helleGlocke, kleineGlocke, playGlockeTone} from './glocke.js';
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
import {initializeIcons} from './icons.js';
import {
    collectLayoutElements,
    registerLayoutLifecycleHooks,
    renderShowtimeCountdown as renderLayoutShowtimeCountdown,
    renderShowtimeDash as renderLayoutShowtimeDash,
    renderSpeakingIndicator as renderLayoutSpeakingIndicator,
    updateTranscriptToggleButton,
} from './layout.js';
import {showError, withErrorHandling} from './error.js';

const SLIDE_CHANGE_BELL_PAUSE_SECONDS = 0.7;
const DEFAULT_SLIDE_SHOWTIME_SECONDS = 10;
const TRANSITION_UNLOCK_TIMEOUT_MS = 10_000;
const DOUBLE_TAP_INTERVAL_MS = 320;
const SINGLE_TAP_MAX_MOVEMENT_PX = 12;
const state = createInitialState();
const swipeState = createSwipeState();
const elements=collectLayoutElements();
const audioController=createAudioController();

let slideAdvanceTimer = null;
let showtimeCountdownInterval = null;
let slideChangeCueAudioContext = null;
let nonAudioPlaybackRemainingSeconds = null;
let pausedNonAudioRemainingSeconds = null;
let slideChangeCueIndicatorToken = 0;
let isSlideTransitionInProgress = false;
let transitionUnlockTimer = null;
let hasPresentationStarted = false;
let singleTouchActionTimer = null;
let singleClickActionTimer = null;
let lastTouchTapTimestamp = 0;

await initApp();

async function initApp() {
    registerLifecycleHooks();
    initializeIcons();
    bindEvents();
    refreshUi();
    await initializeFromQueryParameters();
}

function createAudioController() {
    return new AudioController({
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
            showError(elements.errorBox, `⚠️ ${message}`);
        },
    });
}

function registerLifecycleHooks() {
    registerLayoutLifecycleHooks({
        onVisibilityHidden() {
            resetSwipeState(swipeState);
        },
        onBeforeUnload() {
            cleanupApplication();
        },
    });
}

function cleanupApplication() {
    clearSlideAdvanceTimer();
    clearShowtimeCountdown();
    clearTransitionUnlockTimer();
    clearSingleTouchActionTimer();
    clearSingleClickActionTimer();
    nonAudioPlaybackRemainingSeconds = null;
}

function bindEvents() {
    elements.pickDirectoryBtn.addEventListener('click', async () => {
        await withErrorHandling(elements.errorBox, async () => {
            const deck = await loadDeckFromDirectory();
            await setDeck(deck);
        });
    });

    elements.zipInput.addEventListener('change', async (event) => {
        const [file] = event.target.files ?? [];
        if (!file) {
            return;
        }
        await withErrorHandling(elements.errorBox, async () => {
            const deck = await loadDeckFromZip(file);
            await setDeck(deck);
            event.target.value = '';
        });
    });

    elements.loadRemoteBtn.addEventListener('click', async () => {
        await withErrorHandling(elements.errorBox, async () => {
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
            await resumePresentation();
            keepPlaybackButtonFocus();
            return;
        }

        await withErrorHandling(elements.errorBox, async () => {
            await playCurrentSlide();
        });
        keepPlaybackButtonFocus();
    });
    elements.pauseBtn.addEventListener('click', async () => {
        await pausePresentation();
    });
    elements.stopBtn.addEventListener('click', async () => {
        clearSlideAdvanceTimer();
        clearShowtimeCountdown();
        nonAudioPlaybackRemainingSeconds = null;
        pausedNonAudioRemainingSeconds = null;
        hasPresentationStarted = false;
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
        if (event.key === 'ArrowLeft') await goToSlide(state.currentIndex - 1);
        if (event.key === 'ArrowRight') await goToSlide(state.currentIndex + 1);
        if (event.key === 'Home') await goToSlide(0);
        if (event.key === 'End') await goToSlide(state.deck?.slides.length - 1 ?? -1);
        if (event.key === ' ') {
            event.preventDefault();
            await playCurrentSlide();
        }
    });

    registerStageInteractionArea(elements.slideStage);
    registerStageInteractionArea(elements.transcriptPanel);
    registerStageInteractionArea(elements.errorBox);
}

function registerStageInteractionArea(element) {
    if (!element) {
        return;
    }
    element.addEventListener('touchstart', handleTouchStart, {passive: true});
    element.addEventListener('touchmove', handleTouchMove, {passive: true});
    element.addEventListener('touchend', (event) => {
        void handleTouchEnd(event);
    }, {passive: true});
    element.addEventListener('touchcancel', () => {
        clearSingleTouchActionTimer();
        resetSwipeState(swipeState);
    }, {passive: true});
    element.addEventListener('click', (event) => {
        void handleStageClick(event);
    });
    element.addEventListener('dblclick', handleStageDoubleClick);
}

function isInteractiveControlTarget(target) {
    return target instanceof HTMLInputElement
        || target instanceof HTMLButtonElement
        || target instanceof HTMLAudioElement;
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
    if (isInteractiveControlTarget(event.target)) {
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
    const {isHorizontalSwipe, isVerticalSwipe, horizontalDistance, verticalDistance} = finishSwipe(swipeState, changedTouch);

    resetSwipeState(swipeState);

    if (isHorizontalSwipe) {
        if (horizontalDistance > 0) {
            await goToSlide(state.currentIndex + 1);
            return;
        }

        if (horizontalDistance < 0) {
            await goToSlide(state.currentIndex - 1);
            return;
        }
    }

    if (isVerticalSwipe) {
        if (verticalDistance < 0) {
            await showTranscriptPanelBySwipe();
            return;
        }
        await hideTranscriptPanelBySwipe();
        return;
    }

    const isTap = Math.abs(horizontalDistance) <= SINGLE_TAP_MAX_MOVEMENT_PX
        && Math.abs(verticalDistance) <= SINGLE_TAP_MAX_MOVEMENT_PX;
    if (!isTap) {
        return;
    }

    const now = Date.now();
    const isDoubleTap = now - lastTouchTapTimestamp <= DOUBLE_TAP_INTERVAL_MS;
    lastTouchTapTimestamp = now;
    if (isDoubleTap) {
        clearSingleTouchActionTimer();
        scrollToSlideStageTop();
        return;
    }

    scheduleSingleTouchToggle();
}

function isTouchGeneratedClickEvent(event) {
    if (!(event instanceof MouseEvent)) {
        return false;
    }

    return event.sourceCapabilities?.firesTouchEvents === true;
}

async function handleStageClick(event) {
    if (!state.deck || state.currentIndex < 0 || isSlideTransitionInProgress) {
        return;
    }
    if (isTouchGeneratedClickEvent(event)) {
        return;
    }
    if (isInteractiveControlTarget(event.target)) {
        return;
    }
    if (event.detail > 1) {
        return;
    }

    clearSingleClickActionTimer();
    singleClickActionTimer = window.setTimeout(() => {
        singleClickActionTimer = null;
        void togglePresentationByTouch();
    }, DOUBLE_TAP_INTERVAL_MS);
}

function handleStageDoubleClick(event) {
    if (!state.deck || state.currentIndex < 0 || isSlideTransitionInProgress) {
        return;
    }
    if (isInteractiveControlTarget(event.target)) {
        return;
    }

    clearSingleClickActionTimer();
    scrollToSlideStageTop();
}

function scheduleSingleTouchToggle() {
    clearSingleTouchActionTimer();
    singleTouchActionTimer = window.setTimeout(() => {
        singleTouchActionTimer = null;
        void togglePresentationByTouch();
    }, DOUBLE_TAP_INTERVAL_MS);
}

function clearSingleTouchActionTimer() {
    if (!singleTouchActionTimer) {
        return;
    }
    window.clearTimeout(singleTouchActionTimer);
    singleTouchActionTimer = null;
}

function clearSingleClickActionTimer() {
    if (!singleClickActionTimer) {
        return;
    }
    window.clearTimeout(singleClickActionTimer);
    singleClickActionTimer = null;
}

function scrollToSlideStageTop() {
    elements.slideStage?.scrollIntoView({behavior: 'auto', block: 'start'});
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
    renderLayoutShowtimeCountdown(elements.showtimeCountdown, value);
}

function renderShowtimeDash() {
    renderLayoutShowtimeDash(elements.showtimeCountdown);
}

function renderSpeakingIndicator() {
    renderLayoutSpeakingIndicator(elements.showtimeCountdown);
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
    if (!state.deck || isSlideTransitionInProgress) {
        return;
    }

    const isLastSlide = state.currentIndex >= state.deck.slides.length - 1;
    if (isLastSlide) {
        await playPresentationEndCueWithIndicator();
        return;
    }

    if (state.autoAdvance) {
        await goToSlide(state.currentIndex + 1, {autoplay: true});
    }
}

async function playPresentationEndCueWithIndicator() {
    const cueDurationSeconds = playPresentationEndCue();
    if (cueDurationSeconds <= 0) {
        return;
    }

    const indicatorToken = showSlideChangeCueIndicator();
    window.setTimeout(() => {
        restoreShowtimeCountdownAfterCue(indicatorToken);
    }, cueDurationSeconds * 1000);

    await delay(cueDurationSeconds * 1000);
}

async function initializeFromQueryParameters() {
    const params = new URLSearchParams(window.location.search);
    const remoteUrl = params.get('url')?.trim();

    if (!remoteUrl) {
        return;
    }

    elements.remoteUrlInput.value = remoteUrl;

    await withErrorHandling(elements.errorBox, async () => {
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
    hasPresentationStarted = false;
    pausedNonAudioRemainingSeconds = null;
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
        pausedNonAudioRemainingSeconds = null;
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

function playPresentationEndCue() {
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

        const endCueBellVolume = Math.min(1, Math.max(0.0001, SLIDE_CHANGE_BELL_VOLUME / 4));
        const durationHelle = playGlockeTone(context, helleGlocke, {loudness: endCueBellVolume});
        const durationKleine = kleineGlocke.duration;
        const durationGrosse = grosseGlocke.duration;

        const totalDuration = durationHelle + durationKleine + durationGrosse;

        window.setTimeout(() => {
            playGlockeTone(context, kleineGlocke, {loudness: endCueBellVolume});
        }, durationHelle * 300);

        window.setTimeout(() => {
            playGlockeTone(context, grosseGlocke, {loudness: endCueBellVolume});
        }, (durationHelle + durationKleine) * 300);

        return totalDuration;
    } catch (error) {
        console.debug('Presentation-End-Cue konnte nicht abgespielt werden.', error);
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
    await withErrorHandling(elements.errorBox, async () => {
        hasPresentationStarted = true;
        pausedNonAudioRemainingSeconds = null;
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

async function togglePresentationByTouch() {
    if (!state.deck || state.currentIndex < 0 || !hasPresentationStarted) {
        await playCurrentSlide();
        return;
    }

    if (!isPresentationRunning()) {
        if (elements.audioStatus.textContent === 'Pausiert') {
            await resumePresentation();
            return;
        }
        await playCurrentSlide();
        return;
    }

    await pausePresentation();
}

function isPresentationRunning() {
    if (nonAudioPlaybackRemainingSeconds !== null) {
        return true;
    }
    return elements.audioStatus.textContent.startsWith('Spielt');
}

async function pausePresentation() {
    if (!hasPresentationStarted) {
        return;
    }

    if (!isPresentationRunning()) {
        return;
    }

    if (nonAudioPlaybackRemainingSeconds !== null) {
        pausedNonAudioRemainingSeconds = nonAudioPlaybackRemainingSeconds;
    }
    clearSlideAdvanceTimer();
    clearShowtimeCountdown();
    nonAudioPlaybackRemainingSeconds = null;
    setPlayButtonActive(false);

    if (elements.audioStatus.textContent === 'Pausiert') {
        return;
    }

    if (pausedNonAudioRemainingSeconds !== null) {
        elements.audioStatus.textContent = 'Pausiert';
        return;
    }

    await audioController.pause();
}

async function resumePresentation() {
    if (!hasPresentationStarted) {
        return;
    }

    if (pausedNonAudioRemainingSeconds !== null) {
        const remainingSeconds = pausedNonAudioRemainingSeconds;
        pausedNonAudioRemainingSeconds = null;
        setPlayButtonActive(true);
        startShowtimeCountdown(null, {seconds: remainingSeconds});
        if (state.autoAdvance) {
            clearSlideAdvanceTimer();
            slideAdvanceTimer = window.setTimeout(async () => {
                slideAdvanceTimer = null;
                if (!state.autoAdvance || !state.deck) {
                    return;
                }
                await handleSlidePlaybackCompleted();
            }, remainingSeconds * 1000);
        }
        const currentSlide = state.deck?.slides[state.currentIndex];
        updateSlideAudioStatus(currentSlide);
        return;
    }

    await audioController.resume();
}

async function showTranscriptPanelBySwipe() {
    if (isTranscriptPanelOpen()) {
        return;
    }
    await renderTranscriptContent({keepOpen: true});
}

async function hideTranscriptPanelBySwipe() {
    if (!isTranscriptPanelOpen()) {
        return;
    }
    setTranscriptPanelVisibility(false);
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
    updateTranscriptToggleButton(elements.transcriptToggleBtn, isVisible);
}

function hideTranscriptPanel() {
    setTranscriptPanelVisibility(false);
    clearTranscriptPanelContent();
    scrollToSlideStageTop();
    // elements.playerToolbar?.scrollIntoView({behavior: 'auto', block: 'start'});
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

function checkAudioSupport() {
    if (!audioController.isSpeechReallyUsable()) {
        showError(elements.errorBox, `
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
