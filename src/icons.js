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
     * Autor: Huluvu424242
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
    * Autor: Huluvu424242
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
     * Autor: Huluvu424242
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
      * Autor: Huluvu424242
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
      * Autor: Huluvu424242
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
    * Autor: Huluvu424242
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
     * Autor: Huluvu424242
     * Lizenz: MIT
     * Quelle: selbst erstellt
     */
    next: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.5 7l7 5-7 5V7z" />
    </svg>
  `,
    /*
     * Icon: eye
     * Autor: Huluvu424242
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
     * Icon: glocke
     * Autor: Huluvu424242
     * Lizenz: MIT
     * Quelle: selbst erstellt
     */
    glocke: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="g24" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fff3a0"/>
          <stop offset="40%" stop-color="#f7c21c"/>
          <stop offset="75%" stop-color="#d08d00"/>
          <stop offset="100%" stop-color="#8c5300"/>
        </linearGradient>
    
        <linearGradient id="rim24" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffd54d"/>
          <stop offset="100%" stop-color="#8c5300"/>
        </linearGradient>
    
        <radialGradient id="clapper24" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#fff2a6"/>
          <stop offset="60%" stop-color="#d28c00"/>
          <stop offset="100%" stop-color="#8c5300"/>
        </radialGradient>
      </defs>
    
      <!-- Aufhängung -->
      <path
        d="M9 5a3 3 0 0 1 6 0v1h-2V5a1 1 0 0 0-2 0v1H9z"
        fill="url(#g24)"
        stroke="#8c5300"
        stroke-width="0.8"
        stroke-linejoin="round"
      />
    
      <!-- Glocke -->
      <path
        d="M12 6
           C16 6 18 9 18 13
           C18 15 19 16 20 17
           C20.5 17.5 20 18.5 19 18.5
           H5
           C4 18.5 3.5 17.5 4 17
           C5 16 6 15 6 13
           C6 9 8 6 12 6Z"
        fill="url(#g24)"
        stroke="#8c5300"
        stroke-width="0.9"
        stroke-linejoin="round"
      />
    
      <!-- Glanz -->
      <path
        d="M8 9
           C9 7.8 10.5 7.3 12 7.5
           C10 9 9.5 11 9.5 13
           C9.5 14 9.2 15 8.7 15.5
           C7.5 14.5 7 13 7 11.5
           C7 10.5 7.3 9.5 8 9Z"
        fill="#fff8c0"
        opacity="0.5"
      />
    
      <!-- unterer Rand -->
      <path
        d="M5 18
           C7 19 9 19.5 12 19.5
           C15 19.5 17 19 19 18
           C19.5 18.5 19 19.5 18 20
           C16.5 20.5 14.5 21 12 21
           C9.5 21 7.5 20.5 6 20
           C5 19.5 4.5 18.5 5 18Z"
        fill="url(#rim24)"
      />
    
      <!-- Klöppel (nach unten verschoben) -->
      <circle
        cx="12"
        cy="18.4"
        r="1.8"
        fill="url(#clapper24)"
        stroke="#8c5300"
        stroke-width="0.6"
      />
    </svg>
  `,
    /*
     * Icon: glocke_128x128
     * Autor: Huluvu424242
     * Lizenz: MIT
     * Quelle: selbst erstellt
     */
    glocke_128x128: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="icon"
      viewBox="0 0 128 128"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bellBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fff7b8"/>
          <stop offset="12%" stop-color="#ffe45c"/>
          <stop offset="38%" stop-color="#f7c51d"/>
          <stop offset="68%" stop-color="#d99500"/>
          <stop offset="100%" stop-color="#8c5300"/>
        </linearGradient>
    
        <linearGradient id="bellSideShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#fff7cf" stop-opacity="0.85"/>
          <stop offset="28%" stop-color="#fff1a8" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
    
        <linearGradient id="rimGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffd54d"/>
          <stop offset="55%" stop-color="#d79a00"/>
          <stop offset="100%" stop-color="#8c5300"/>
        </linearGradient>
    
        <radialGradient id="innerBell" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stop-color="#8f5200"/>
          <stop offset="60%" stop-color="#6e3d00"/>
          <stop offset="100%" stop-color="#452300"/>
        </radialGradient>
    
        <radialGradient id="clapperGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#fff2a6"/>
          <stop offset="20%" stop-color="#ffd84a"/>
          <stop offset="70%" stop-color="#d28c00"/>
          <stop offset="100%" stop-color="#8c5300"/>
        </radialGradient>
    
        <linearGradient id="loopGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffe97a"/>
          <stop offset="45%" stop-color="#e4ab08"/>
          <stop offset="100%" stop-color="#8d5500"/>
        </linearGradient>
    
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#6f4300" flood-opacity="0.35"/>
        </filter>
    
        <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
          <feOffset dx="0" dy="1" result="offsetBlur"/>
          <feComposite in="offsetBlur" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="innerShadow"/>
          <feColorMatrix in="innerShadow" type="matrix" values="
            0 0 0 0 0.45
            0 0 0 0 0.24
            0 0 0 0 0.00
            0 0 0 0.45 0" />
        </filter>
      </defs>
    
      <!-- Aufhängung -->
      <g filter="url(#softShadow)">
        <path
          d="M64 10
             C56 10 50 16 50 24
             v6
             h10
             v-6
             c0-2.4 1.6-4 4-4
             s4 1.6 4 4
             v6
             h10
             v-6
             c0-8-6-14-14-14z"
          fill="url(#loopGrad)"
          stroke="#9a5e00"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path
          d="M57 16
             C54 18 52.5 21 52.5 24.5"
          fill="none"
          stroke="#fff3a8"
          stroke-width="3"
          stroke-linecap="round"
          opacity="0.65"
        />
      </g>
    
      <!-- Glockenkörper -->
      <g filter="url(#softShadow)">
        <path
          d="M64 22
             C92 22 103 44 103 72
             C103 88 110 98 118 106
             C120.5 108.5 120 114 116 116
             C111 118.5 103 119 64 119
             C25 119 17 118.5 12 116
             C8 114 7.5 108.5 10 106
             C18 98 25 88 25 72
             C25 44 36 22 64 22z"
          fill="url(#bellBody)"
          stroke="#9a5e00"
          stroke-width="2.5"
          stroke-linejoin="round"
        />
    
        <!-- linker heller Spiegelglanz -->
        <path
          d="M37 40
             C42 31 50 28 58 30
             C46 42 44 58 44 78
             C44 86 42 92 39 97
             C34 92 31 83 31 71
             C31 58 33 48 37 40z"
          fill="url(#bellSideShade)"
          opacity="0.95"
        />
    
        <!-- oberer weicher Glanz -->
        <ellipse
          cx="56"
          cy="39"
          rx="24"
          ry="11"
          fill="#fff8c8"
          opacity="0.28"
          transform="rotate(-10 56 39)"
        />
    
        <!-- rechte dunklere Seite für 3D -->
        <path
          d="M82 29
             C94 35 101 49 101 71
             C101 88 107 98 114 105
             C116 107 116 112 113 113.5
             C107 116 95 116.5 76 117
             C91 110 96 94 96 75
             C96 57 92 41 82 29z"
          fill="#8c5300"
          opacity="0.18"
        />
      </g>
    
      <!-- Unterer Rand -->
      <g filter="url(#softShadow)">
        <path
          d="M21 91
             C32 98 46 101 64 101
             C82 101 96 98 107 91
             C112 95 116 100 118 106
             C119 109 118 113 114 115
             C108 118 94 119 64 119
             C34 119 20 118 14 115
             C10 113 9 109 10 106
             C12 100 16 95 21 91z"
          fill="url(#rimGrad)"
          stroke="#9a5e00"
          stroke-width="2"
          stroke-linejoin="round"
        />
    
        <!-- Glanzlinie am Rand -->
        <path
          d="M25 95
             C40 99 50 100.5 64 100.5
             C78 100.5 91 99 103 95"
          fill="none"
          stroke="#fff5b0"
          stroke-width="2.5"
          stroke-linecap="round"
          opacity="0.75"
        />
      </g>
    
      <!-- Innenseite der Glocke -->
      <ellipse
        cx="64"
        cy="104"
        rx="45"
        ry="12"
        fill="url(#innerBell)"
        opacity="0.95"
      />
    
      <!-- Klöppel-Aufhängung -->
      <path
        d="M64 83
           C64 83 64 88 64 91"
        fill="none"
        stroke="#8a5200"
        stroke-width="3"
        stroke-linecap="round"
      />
    
      <!-- Klöppel -->
      <g filter="url(#softShadow)">
        <circle
          cx="64"
          cy="103"
          r="11"
          fill="url(#clapperGrad)"
          stroke="#9a5e00"
          stroke-width="2"
        />
        <ellipse
          cx="60"
          cy="99"
          rx="3.2"
          ry="4.6"
          fill="#fff6c3"
          opacity="0.7"
        />
      </g>
    
      <!-- sanfte Schattierung Übergang Körper -> Rand -->
      <path
        d="M20 88
           C34 94 47 96 64 96
           C81 96 94 94 108 88
           C105 92 103 95 103 98
           C91 102 79 104 64 104
           C49 104 37 102 25 98
           C25 95 23 92 20 88z"
        fill="#7a4700"
        opacity="0.16"
      />
    
      <!-- feine Kontur unten -->
      <path
        d="M19 104
           C28 111 43 114 64 114
           C85 114 100 111 109 104"
        fill="none"
        stroke="#6f4300"
        stroke-width="1.6"
        stroke-linecap="round"
        opacity="0.55"
      />
    </svg>
  `,
    /*
     * Icon: help
     * Autor: Huluvu424242
     * Lizenz: MIT
     * Quelle: selbst erstellt
     */
    help: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.4 9.2a2.6 2.6 0 0 1 5.2.1c0 1.2-.7 1.8-1.8 2.5-.8.5-1.3 1-1.3 2" />
        <circle cx="12" cy="16.9" r="0.7" />
    </svg>
  `,
    /*
     * Icon: error_info
     * Autor: Huluvu424242
     * Lizenz: MIT
     * Quelle: selbst erstellt
     */
    error_info: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="triRed24" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ff7a7a"/>
          <stop offset="55%" stop-color="#e02121"/>
          <stop offset="100%" stop-color="#8f0000"/>
        </linearGradient>
    
        <linearGradient id="triEdge24" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffd0d0"/>
          <stop offset="100%" stop-color="#680000"/>
        </linearGradient>
    
        <linearGradient id="boltYellow24" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff59a"/>
          <stop offset="45%" stop-color="#ffd400"/>
          <stop offset="100%" stop-color="#d79a00"/>
        </linearGradient>
      </defs>
    
      <!-- Dreieck -->
      <path
        d="M12 3.2
           L21 19
           C21.3 19.5 21 20.2 20.2 20.2
           H3.8
           C3 20.2 2.7 19.5 3 19
           Z"
        fill="url(#triRed24)"
        stroke="url(#triEdge24)"
        stroke-width="1"
        stroke-linejoin="round"
      />
    
      <!-- Glanz -->
      <path
        d="M11.8 5.2
           L5.5 17
           H8
           L13.2 7.4
           C13.4 7 13.2 6.4 12.8 6
           C12.5 5.8 12.2 5.5 11.8 5.2Z"
        fill="#ffffff"
        opacity="0.18"
      />
    
      <!-- linker Blitz -->
      <path
        d="M8.2 10.2
           L10.2 10.2
           L9.1 12.2
           L10.8 12.2
           L8.8 15.2
           L9.4 13.1
           L7.8 13.1
           Z"
        fill="url(#boltYellow24)"
        stroke="#9a6a00"
        stroke-width="0.35"
        stroke-linejoin="round"
      />
    
      <!-- rechter Blitz -->
      <path
        d="M15.8 10.2
           L13.8 10.2
           L14.9 12.2
           L13.2 12.2
           L15.2 15.2
           L14.6 13.1
           L16.2 13.1
           Z"
        fill="url(#boltYellow24)"
        stroke="#9a6a00"
        stroke-width="0.35"
        stroke-linejoin="round"
      />
    
      <!-- X-Augen -->
      <path
        d="M9.3 8.3 L10.6 9.6 M10.6 8.3 L9.3 9.6"
        stroke="#fff7f7"
        stroke-width="1"
        stroke-linecap="round"
      />
      <path
        d="M13.4 8.3 L14.7 9.6 M14.7 8.3 L13.4 9.6"
        stroke="#fff7f7"
        stroke-width="1"
        stroke-linecap="round"
      />
    </svg>
  `,
    /*
     * Icon: speaking_head
     * Autor: Twitter
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
