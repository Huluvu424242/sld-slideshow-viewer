export function bindPlayerButtonEvents({
    elements,
    getCurrentIndex,
    getDeck,
    getAudioStatus,
    goToSlide,
    resumePresentation,
    playCurrentSlide,
    pausePresentation,
    stopPresentation,
    keepPlaybackButtonFocus,
    withErrorHandling,
    errorBox,
}) {
    elements.firstBtn.addEventListener('click', () => goToSlide(0));
    elements.prevBtn.addEventListener('click', () => goToSlide(getCurrentIndex() - 1));
    elements.nextBtn.addEventListener('click', () => goToSlide(getCurrentIndex() + 1));
    elements.lastBtn.addEventListener('click', () => goToSlide(getDeck()?.slides.length - 1 ?? -1));
    elements.gotoBtn.addEventListener('click', () => goToSlide(Number(elements.gotoInput.value) - 1));

    elements.playBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!getDeck() || getCurrentIndex() < 0) {
            return;
        }

        if (getAudioStatus() === 'Pausiert') {
            await resumePresentation();
            keepPlaybackButtonFocus();
            return;
        }

        await withErrorHandling(errorBox, async () => {
            await playCurrentSlide();
        });
        keepPlaybackButtonFocus();
    });

    elements.pauseBtn.addEventListener('click', async () => {
        await pausePresentation();
    });

    elements.stopBtn.addEventListener('click', async () => {
        await stopPresentation();
    });
}

export function bindAutoAdvanceToggle({
    elements,
    setAutoAdvanceEnabled,
    syncAutoSlideChangeForCurrentSlide,
}) {
    elements.autoplayNextCheckbox.addEventListener('change', () => {
        setAutoAdvanceEnabled(elements.autoplayNextCheckbox.checked);
        syncAutoSlideChangeForCurrentSlide();
    });
}

export function scheduleAutoAdvanceForShowtime({
    slide,
    autoAdvance,
    clearSlideAdvanceTimer,
    updateSlideAudioStatus,
    getSlideShowtimeSeconds,
    setSlideAdvanceTimer,
    onPlaybackCompleted,
}) {
    clearSlideAdvanceTimer();

    const showtime = getSlideShowtimeSeconds(slide);
    if (!autoAdvance()) {
        updateSlideAudioStatus(slide);
        return false;
    }

    updateSlideAudioStatus(slide);
    setSlideAdvanceTimer(window.setTimeout(async () => {
        setSlideAdvanceTimer(null);
        if (!autoAdvance()) {
            return;
        }
        await onPlaybackCompleted();
    }, showtime * 1000));

    return true;
}

export function syncAutoSlideChangeForCurrentSlide({
    slide,
    autoAdvance,
    setNonAudioPlaybackRemainingSeconds,
    clearSlideAdvanceTimer,
    clearShowtimeCountdown,
    setPlayButtonActive,
    startShowtimeCountdown,
    scheduleAutoAdvanceForShowtime,
}) {
    if (!slide || slide.audio) {
        setNonAudioPlaybackRemainingSeconds(null);
        clearSlideAdvanceTimer();
        clearShowtimeCountdown();
        setPlayButtonActive(false);
        return;
    }

    if (!autoAdvance) {
        clearSlideAdvanceTimer();
        setPlayButtonActive(false);
        return;
    }

    setPlayButtonActive(true);
    startShowtimeCountdown(slide);
    scheduleAutoAdvanceForShowtime(slide);
}
