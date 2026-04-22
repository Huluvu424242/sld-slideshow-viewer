export function showError(errorBox, message) {
    errorBox.textContent = message.replace(/\n/g, '\n');
    errorBox.classList.remove('hidden');
}

export function hideError(errorBox) {
    errorBox.classList.add('hidden');
    errorBox.textContent = '';
}

export async function withErrorHandling(errorBox, fn, options = {}) {
    const {onError} = options;
    try {
        hideError(errorBox);
        await fn();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (typeof onError === 'function') {
            onError(message);
            return;
        }
        showError(errorBox, message);
    }
}
