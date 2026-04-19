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
     * Icon: first
     * Copyright: Huluvu424242
     * Lizenz: MIT
     * Quelle: selbst erstellt
     */
    first: `
     <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 6v12M14 7l-6 5 6 5V7z" />
     </svg>
    `,
    /*
    * Icon: last
    * Copyright: Huluvu424242
    * Lizenz: MIT
    * Quelle: selbst erstellt
    */
    last: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6v12M10 7l6 5-6 5V7z" />
    </svg>
    `,
    /*
     * Icon: play
     * Copyright: Huluvu424242
     * Lizenz: MIT
     * Quelle: selbst erstellt
     */
    play: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.75l5.5 3.25L10 15.25v-6.5z" />
    </svg>
  `,
    /*
      * Icon: pause
      * Copyright: Huluvu424242
      * Lizenz: MIT
      * Quelle: selbst erstellt
      */
    pause: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 7v10M15 7v10" />
    </svg>
  `,
    /*
      * Icon: stop
      * Copyright: Huluvu424242
      * Lizenz: MIT
      * Quelle: selbst erstellt
      */
    stop: `
     <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="8" y="8" width="8" height="8" rx="1" />
     </svg>
  `,
    /*
    * Icon: prev
    * Copyright: Huluvu424242
    * Lizenz: MIT
    * Quelle: selbst erstellt
    */
    prev: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.5 7l-7 5 7 5V7z" />
    </svg>
  `,
    /*
     * Icon: next
     * Copyright: Huluvu424242
     * Lizenz: MIT
     * Quelle: selbst erstellt
     */
    next: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6v12M10 7l6 5-6 5V7z"></path>
    </svg>
  `,
    /*
     * Icon: eye
     * Copyright: Huluvu424242
     * Lizenz: MIT
     * Quelle: selbst erstellt
     */
    eye: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6z" />
        <circle cx="12" cy="12" r="2.8" />
        <path class="eye-slash" d="M4 4l16 16" />
    </svg>
  `,
    /*
     * Icon: speaking_head
     * Copyright: Twitter
     * Lizenz: MIT
     * Quelle: https://www.svgrepo.com/svg/407507/speaking-head
     * Lizenznahme: 16.04.2026
     * modified by Huluvu424242 at 16.04.2026
     */
    speaking_head: `
    <svg width="800px" height="800px" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     aria-hidden="true"
     role="img"
     class="iconify iconify--twemoji"
     preserveAspectRatio="xMidYMid meet">
        <path class="speak"
              d="M35.838 23.159a.997.997 0 0 1-.998 1.003l-5 .013a.998.998 0 0 1-1-.997a.998.998 0 0 1 .995-1.004l5-.013a1 1 0 0 1 1.003.998zm-1.587-5.489a1 1 0 0 1-.475 1.333l-4.517 2.145a1 1 0 0 1-.856-1.809l4.516-2.144a1 1 0 0 1 1.332.475zm.027 10.987a1 1 0 0 0-.48-1.33l-4.527-2.122a1 1 0 1 0-.848 1.81l4.526 2.123a1 1 0 0 0 1.329-.481z"></path>
        <path class="head"
              d="M27.979 14.875c-1.42-.419-2.693-1.547-3.136-2.25c-.76-1.208.157-1.521-.153-4.889C24.405 4.653 20.16 1.337 15 1c-2.346-.153-4.786.326-7.286 1.693c-6.42 3.511-8.964 10.932-4.006 18.099c4.47 6.46.276 9.379.276 9.379s.166 1.36 2.914 3.188c2.749 1.827 6.121.588 6.121.588s1.112-3.954 4.748-3.59c2.606.384 6.266-.129 7.191-1.024c.865-.837-.151-1.886.539-4.224c-2.365-.232-3.665-1.359-3.79-2.948c2.625.255 3.708-.578 4.458-1.495c-.021-.54-.075-1.686-.127-2.454c2.322-.672 3.212-2.962 1.941-3.337z"></path>
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

