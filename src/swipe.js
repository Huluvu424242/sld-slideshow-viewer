export const SWIPE_MIN_HORIZONTAL_DISTANCE_PX = 45;
export const SWIPE_MIN_VERTICAL_DISTANCE_PX = 45;
export const SWIPE_MAX_ORTHOGONAL_DRIFT_PX = 120;

export function createSwipeState() {
    return {
        startX: 0,
        startY: 0,
        lastX: 0,
        lastY: 0,
        tracking: false,
    };
}

export function startSwipeTracking(state, touch) {
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.lastX = touch.clientX;
    state.lastY = touch.clientY;
    state.tracking = true;
}

export function updateSwipeTracking(state, touch) {
    state.lastX = touch.clientX;
    state.lastY = touch.clientY;
}

export function finishSwipe(state, changedTouch) {
    const endX = changedTouch?.clientX ?? state.lastX;
    const endY = changedTouch?.clientY ?? state.lastY;
    const horizontalDistance = endX - state.startX;
    const verticalDistance = endY - state.startY;
    const isHorizontalSwipe = Math.abs(horizontalDistance) >= SWIPE_MIN_HORIZONTAL_DISTANCE_PX
        && Math.abs(verticalDistance) <= SWIPE_MAX_ORTHOGONAL_DRIFT_PX
        && Math.abs(horizontalDistance) > Math.abs(verticalDistance);
    const isVerticalSwipe = Math.abs(verticalDistance) >= SWIPE_MIN_VERTICAL_DISTANCE_PX
        && Math.abs(horizontalDistance) <= SWIPE_MAX_ORTHOGONAL_DRIFT_PX
        && Math.abs(verticalDistance) > Math.abs(horizontalDistance);

    return {
        isHorizontalSwipe,
        isVerticalSwipe,
        horizontalDistance,
        verticalDistance,
    };
}

export function resetSwipeState(state) {
    state.startX = 0;
    state.startY = 0;
    state.lastX = 0;
    state.lastY = 0;
    state.tracking = false;
}
