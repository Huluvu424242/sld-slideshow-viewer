export function inferAudioType(audioConfig = {}) {
    const explicitType = String(audioConfig.type || '').trim().toLowerCase();
    if (explicitType) {
        return explicitType;
    }

    const src = String(audioConfig.src || '').trim();
    if (!src) {
        return '';
    }

    return src
        .split('#', 1)[0]
        .split('?', 1)[0]
        .split('.')
        .pop()
        ?.toLowerCase();
}

export function ssmlToDisplayText(ssml) {
    const normalized = String(ssml).replace(/\r\n?/g, '\n');
    const withStructure = normalized
        .replace(/<\s*break\b[^>]*\/?>/gi, '\n')
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\s*\/\s*(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6)\s*>/gi, '\n')
        .replace(/<\s*\/\s*(s|sentence)\s*>/gi, '\n')
        .replace(/<\s*\/\s*(speak|paragraph)\s*>/gi, '\n\n');

    const withoutTags = withStructure.replace(/<[^>]+>/g, '');
    const decoded = decodeSimpleXmlEntities(withoutTags);

    return preserveStructuredText(decoded);
}

export function isTextAudioType(audioType) {
    return audioType === 'txt' || audioType === 'ssml';
}

export function isPlayableAudioType(audioType, sourcePath = '') {
    const normalizedType = String(audioType || '').toLowerCase();
    if (PLAYABLE_AUDIO_TYPES.has(normalizedType)) {
        return true;
    }
    if (normalizedType && !isTextAudioType(normalizedType)) {
        return false;
    }

    const extension = String(sourcePath)
        .split('#', 1)[0]
        .split('?', 1)[0]
        .split('.')
        .pop()
        ?.toLowerCase();

    return PLAYABLE_AUDIO_TYPES.has(extension || '');
}

const PLAYABLE_AUDIO_TYPES = new Set(['mp3', 'm4a', 'aac', 'wav', 'ogg', 'oga', 'opus', 'flac', 'webm', 'mp4']);

export function preserveStructuredText(text) {
    return String(text)
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function canPlayInAudioElement(audioElement, audioType, sourcePath) {
    const mimeType = inferMimeType(audioType, sourcePath);
    if (!mimeType) {
        return false;
    }
    return audioElement.canPlayType(mimeType) !== '';
}

function decodeSimpleXmlEntities(text) {
    return String(text)
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&apos;', "'");
}

function inferMimeType(audioType, sourcePath) {
    const normalizedType = String(audioType || '').toLowerCase();
    if (normalizedType === 'ssml') return 'application/ssml+xml';
    if (normalizedType === 'txt') return 'text/plain';
    if (normalizedType === 'mp3') return 'audio/mpeg';
    if (normalizedType === 'wav') return 'audio/wav';
    if (normalizedType === 'ogg') return 'audio/ogg';
    if (normalizedType === 'oga') return 'audio/ogg';
    if (normalizedType === 'opus') return 'audio/ogg; codecs=opus';
    if (normalizedType === 'm4a') return 'audio/mp4';
    if (normalizedType === 'aac') return 'audio/aac';
    if (normalizedType === 'flac') return 'audio/flac';
    if (normalizedType === 'webm') return 'audio/webm';
    if (normalizedType === 'mp4') return 'audio/mp4';

    const extension = String(sourcePath)
        .split('#', 1)[0]
        .split('?', 1)[0]
        .split('.')
        .pop()
        ?.toLowerCase();

    const extensionToMime = {
        ssml: 'application/ssml+xml',
        txt: 'text/plain',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        oga: 'audio/ogg',
        opus: 'audio/ogg; codecs=opus',
        m4a: 'audio/mp4',
        aac: 'audio/aac',
        flac: 'audio/flac',
        webm: 'audio/webm',
        mp4: 'audio/mp4',
    };

    return extensionToMime[extension] || '';
}
