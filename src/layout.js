import {setIcon} from './icons.js';

const ELEMENT_SELECTORS = {
    deckTitle: '#deck-title',
    slideCounter: '#slide-counter',
    sourceKind: '#source-kind',
    audioStatus: '#audio-status',
    errorBox: '#error-box',
    playerToolbar: '#player-toolbar',
    slideList: '#slide-list',
    slideStage: '#slide-stage',
    gotoInput: '#goto-input',
    showtimeCountdown: '#showtime-countdown',
    transcriptToggleBtn: '#transcript-toggle-btn',
    transcriptPanel: '#transcript-panel',
    transcriptHint: '#transcript-hint',
    transcriptText: '#transcript-text',
    transcriptAudioPlayer: '#transcript-audio-player',
    autoplayNextCheckbox: '#autoplay-next-checkbox',
    helpToggleBtn: '#help-toggle-btn',
    helpPanel: '#help-panel',
    remoteUrlInput: '#remote-url-input',
    zipInput: '#zip-input',
    pickDirectoryBtn: '#pick-directory-btn',
    loadRemoteBtn: '#load-remote-btn',
    firstBtn: '#first-btn',
    prevBtn: '#prev-btn',
    playBtn: '#play-btn',
    pauseBtn: '#pause-btn',
    stopBtn: '#stop-btn',
    nextBtn: '#next-btn',
    lastBtn: '#last-btn',
    gotoBtn: '#goto-btn',
};

export function collectLayoutElements(root = document) {
    return Object.entries(ELEMENT_SELECTORS).reduce((elements, [name, selector]) => {
        const element = root.querySelector(selector);
        if (!element) {
            throw new Error(`Layout-Element fehlt: ${selector}`);
        }
        elements[name] = element;
        return elements;
    }, {});
}

export function renderShowtimeCountdown(element, value) {
    if (!element) {
        return;
    }

    const safeValue = Math.max(0, Math.floor(value));
    element.textContent = String(safeValue);
    element.classList.remove('is-speaking');
    element.classList.toggle('is-safe', safeValue > 3);
    element.classList.toggle('is-danger', safeValue <= 3);
}

export function renderShowtimeDash(element) {
    if (!element) {
        return;
    }

    element.textContent = '–';
    element.classList.remove('is-danger', 'is-safe', 'is-speaking');
}

export function renderSpeakingIndicator(element) {
    if (!element) {
        return;
    }

    setIcon(element, 'speaking_head');
    element.classList.remove('is-danger', 'is-safe');
    element.classList.add('is-speaking');
}

export function updateTranscriptToggleButton(button, isVisible) {
    button.setAttribute('aria-expanded', String(isVisible));
    button.setAttribute('aria-pressed', String(isVisible));
    button.classList.toggle('is-open', isVisible);

    const tooltipText = isVisible ? 'Audiotext ausblenden' : 'Audiotext einblenden';
    button.title = tooltipText;
    button.setAttribute('aria-label', tooltipText);
}

export function registerLayoutLifecycleHooks({onVisibilityHidden, onBeforeUnload} = {}) {
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            onVisibilityHidden?.();
        }
    };

    const handleBeforeUnload = () => {
        onBeforeUnload?.();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
}
