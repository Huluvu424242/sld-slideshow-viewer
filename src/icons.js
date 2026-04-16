/**
 * Usage
 *
 * Erzeugung in HTML
 * <button
 *   id="play-btn"
 *   class="icon-btn icon-btn--play"
 *   type="button"
 *   title="Abspielen"
 *   aria-label="Abspielen"
 *   aria-pressed="false"
 *   data-icon-state-group="playPause"
 *   data-icon-state="paused">
 * </button>
 *
 * Und einmal alles Initialisieren im js am Anfang mit
 * initializeIcons();
 *
 * Zustandwechseln im Javascript
 * setIconState(playButton, "playPause", "playing");
 * playButton.setAttribute("aria-pressed", "true");
 *
 * Dynamisch neue Icons erzeugen mit
 *
 * const playButton = createIconButton({
 *   iconName: "play",
 *   className: "icon-btn icon-btn--play",
 *   title: "Abspielen",
 *   ariaLabel: "Abspielen",
 *   pressed: false,
 *   stateGroup: "playPause",
 *   state: "paused"
 * });
 *
 * document.body.appendChild(playButton);
 *
 * playButton.addEventListener("click", () => {
 *   const nextState = toggleIconState(playButton);
 *   playButton.setAttribute("aria-pressed", String(nextState === "playing"));
 * });
 *
 */


export const ICONS = Object.freeze({
    /*
     * Icon: play
     * Copyright: Beispielautor
     * Lizenz: MIT
     * Quelle: https://hier.hab-ich-her.de
     */
    play: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M10 8.75l5.5 3.25L10 15.25v-6.5z"></path>
    </svg>
  `,
    /*
     * Icon: pause
     * Copyright: Beispielautor
     * Lizenz: MIT
     * Quelle: https://hier.hab-ich-her.de
     */
    pause: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M9.5 8.5v7"></path>
      <path d="M14.5 8.5v7"></path>
    </svg>
  `,
    next: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6v12M10 7l6 5-6 5V7z"></path>
    </svg>
  `
});

export const ICON_STATES = Object.freeze({
    playPause: Object.freeze({
        playing: "pause",
        paused: "play"
    }),

    transcriptVisibility: Object.freeze({
        visible: "eye",
        hidden: "eyeOff"
    })
});

function getIconMarkup(iconName) {
    const svg = ICONS[iconName];
    if (!svg) {
        throw new Error(`Unbekanntes Icon: "${iconName}"`);
    }
    return svg;
}

export function setIcon(element, iconName) {
    if (!(element instanceof Element)) {
        throw new TypeError("setIcon: element muss ein DOM-Element sein.");
    }

    element.dataset.icon = iconName;
    element.innerHTML = getIconMarkup(iconName);
}

export function initializeIcons(root = document) {
    if (!(root instanceof Element) && root !== document) {
        throw new TypeError("initializeIcons: root muss document oder ein DOM-Element sein.");
    }

    root.querySelectorAll("[data-icon], [data-icon-state-group][data-icon-state]").forEach((element) => {
        const { icon, iconStateGroup, iconState } = element.dataset;

        try {
            if (iconStateGroup && iconState) {
                setIconState(element, iconStateGroup, iconState);
            } else if (icon) {
                setIcon(element, icon);
            }
        } catch (error) {
            console.warn(error.message, element);
        }
    });
}

export function createIconButton(options = {}) {
    const {
        iconName,
        type = "button",
        className = "icon-btn",
        title = "",
        ariaLabel = "",
        pressed,
        stateGroup,
        state
    } = options;

    const button = document.createElement("button");
    button.type = type;
    button.className = className;

    if (title) {
        button.title = title;
    }

    if (ariaLabel) {
        button.setAttribute("aria-label", ariaLabel);
    }

    if (typeof pressed === "boolean") {
        button.setAttribute("aria-pressed", String(pressed));
    }

    if (stateGroup) {
        button.dataset.iconStateGroup = stateGroup;
    }

    if (state) {
        button.dataset.iconState = state;
    }

    if (stateGroup && state) {
        setIconState(button, stateGroup, state);
    } else if (iconName) {
        setIcon(button, iconName);
    } else {
        throw new Error("createIconButton: Es muss entweder iconName oder stateGroup + state angegeben werden.");
    }

    return button;
}

export function setIconState(element, stateGroup, stateName) {
    if (!(element instanceof Element)) {
        throw new TypeError("setIconState: element muss ein DOM-Element sein.");
    }

    const group = ICON_STATES[stateGroup];
    if (!group) {
        throw new Error(`Unbekannte Zustandsgruppe: "${stateGroup}"`);
    }

    const iconName = group[stateName];
    if (!iconName) {
        throw new Error(
            `Unbekannter Zustand "${stateName}" in Zustandsgruppe "${stateGroup}".`
        );
    }

    element.dataset.iconStateGroup = stateGroup;
    element.dataset.iconState = stateName;
    setIcon(element, iconName);
}

export function toggleIconState(element) {
    if (!(element instanceof Element)) {
        throw new TypeError("toggleIconState: element muss ein DOM-Element sein.");
    }

    const { iconStateGroup, iconState } = element.dataset;
    if (!iconStateGroup || !iconState) {
        throw new Error("toggleIconState: data-icon-state-group oder data-icon-state fehlt.");
    }

    const group = ICON_STATES[iconStateGroup];
    if (!group) {
        throw new Error(`Unbekannte Zustandsgruppe: "${iconStateGroup}"`);
    }

    const stateNames = Object.keys(group);
    const currentIndex = stateNames.indexOf(iconState);
    if (currentIndex === -1) {
        throw new Error(
            `Unbekannter aktueller Zustand "${iconState}" in Gruppe "${iconStateGroup}".`
        );
    }

    const nextIndex = (currentIndex + 1) % stateNames.length;
    const nextState = stateNames[nextIndex];

    setIconState(element, iconStateGroup, nextState);
    return nextState;
}

