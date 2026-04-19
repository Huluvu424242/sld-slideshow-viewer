export function showError(errorBox, message) {
    errorBox.textContent = message.replace(/\n/g, '\n');
    errorBox.classList.remove('hidden');
}

export function hideError(errorBox) {
    errorBox.classList.add('hidden');
    errorBox.textContent = '';
}

export async function withErrorHandling(errorBox, fn) {
    try {
        hideError(errorBox);
        await fn();
    } catch (error) {
        showError(errorBox, error instanceof Error ? error.message : String(error));
    }
}
