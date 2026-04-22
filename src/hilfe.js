export function isHelpPanelOpen(helpPanelElement) {
    return !helpPanelElement.classList.contains('hidden');
}

export function toggleHelpPanel(helpPanelElement, helpToggleButtonElement) {
    const shouldOpen = !isHelpPanelOpen(helpPanelElement);
    helpPanelElement.classList.toggle('hidden', !shouldOpen);
    helpToggleButtonElement.setAttribute('aria-expanded', String(shouldOpen));
    const tooltipText = shouldOpen ? 'Steuerungshilfe ausblenden' : 'Steuerungshilfe anzeigen';
    helpToggleButtonElement.title = tooltipText;
    helpToggleButtonElement.setAttribute('aria-label', tooltipText);
}
