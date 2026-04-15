export async function loadDeckFromDirectory() {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('Dieser Browser unterstützt das Öffnen lokaler Verzeichnisse nicht. Nutze stattdessen ZIP oder einen Chromium-basierten Browser.');
  }

  const root = await window.showDirectoryPicker();
  const manifestText = await readTextFromHandle(root, 'slides.json');
  const manifest = JSON.parse(manifestText);
  return buildDeck(manifest, {
    sourceKind: 'Lokales Verzeichnis',
    async loadText(relativePath) {
      return readTextFromHandle(root, relativePath);
    },
    async resolvePlayableUrl(relativePath) {
      const file = await readFileFromHandle(root, relativePath);
      return URL.createObjectURL(file);
    },
    resolveAssetPath(relativePath) {
      return createObjectUrlFromHandle(root, relativePath);
    },
  });
}

export async function loadDeckFromZip(file) {
  const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const manifestEntry = zip.file('slides.json');
  if (!manifestEntry) {
    throw new Error('ZIP enthält keine slides.json im Wurzelverzeichnis.');
  }

  const manifest = JSON.parse(await manifestEntry.async('text'));
  const objectUrlCache = new Map();

  return buildDeck(manifest, {
    sourceKind: 'ZIP-Archiv',
    async loadText(relativePath) {
      const entry = zip.file(normalize(relativePath));
      if (!entry) {
        throw new Error(`Datei im ZIP nicht gefunden: ${relativePath}`);
      }
      return entry.async('text');
    },
    async resolvePlayableUrl(relativePath) {
      return getObjectUrl(zip, relativePath, objectUrlCache);
    },
    resolveAssetPath(relativePath) {
      return getObjectUrl(zip, relativePath, objectUrlCache);
    },
  });
}

export async function loadDeckFromRemote(url) {
  const normalizedUrl = new URL(url, window.location.href).href;

  if (isArchiveBundleUrl(normalizedUrl)) {
    const response = await fetch(normalizedUrl);
    if (!response.ok) {
      throw new Error(`Remote-SLD/ZIP konnte nicht geladen werden: HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const remoteFileName = inferRemoteFileName(normalizedUrl);
    return loadDeckFromZip(new File([blob], remoteFileName, { type: 'application/zip' }));
  }

  const manifestUrl = normalizedUrl.toLowerCase().endsWith('slides.json')
    ? normalizedUrl
    : new URL('slides.json', ensureDirectoryUrl(normalizedUrl)).href;

  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error(`Remote-Manifest konnte nicht geladen werden: HTTP ${response.status}`);
  }
  const manifest = await response.json();
  const baseUrl = manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1);

  return buildDeck(manifest, {
    sourceKind: 'Remote',
    async loadText(relativePath) {
      const textResponse = await fetch(new URL(relativePath, baseUrl));
      if (!textResponse.ok) {
        throw new Error(`Remote-Datei konnte nicht geladen werden: ${relativePath}`);
      }
      return textResponse.text();
    },
    async resolvePlayableUrl(relativePath) {
      return new URL(relativePath, baseUrl).href;
    },
    resolveAssetPath(relativePath) {
      return new URL(relativePath, baseUrl).href;
    },
  });
}

async function buildDeck(manifest, assetLoader) {
  validateManifest(manifest);

  const slides = [];
  for (const [index, slide] of manifest.slides.entries()) {
    const contentPath = slide.content;
    const contentText = await assetLoader.loadText(contentPath);
    slides.push({
      ...slide,
      audio: normalizeAudio(slide.audio),
      index,
      showtime: normalizeShowtime(slide.showtime),
      contentPath,
      contentText,
      format: slide.format,
    });
  }

  return {
    title: manifest.title || 'Unbenannte Slideshow',
    manifest,
    slides,
    assetLoader,
    sourceKind: assetLoader.sourceKind,
  };
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Manifest ist leer oder ungültig.');
  }
  if (!Array.isArray(manifest.slides) || manifest.slides.length === 0) {
    throw new Error('Manifest enthält keine Folien.');
  }
  for (const [index, slide] of manifest.slides.entries()) {
    if (!slide.content) {
      throw new Error(`Folie ${index + 1} besitzt kein content-Feld.`);
    }

    if (!slide.audio) {
      const showtime = normalizeShowtime(slide.showtime);
      if (!showtime) {
        throw new Error(`Folie ${index + 1} besitzt weder audio noch ein gültiges showtime-Attribut.`);
      }
    }
  }
}


function normalizeAudio(value) {
  if (typeof value === 'string') {
    const src = value.trim();
    return src ? { src } : undefined;
  }

  if (value && typeof value === 'object') {
    return value;
  }

  return undefined;
}

function normalizeShowtime(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : undefined;
}

async function readTextFromHandle(rootHandle, relativePath) {
  const file = await readFileFromHandle(rootHandle, relativePath);
  return file.text();
}

async function readFileFromHandle(rootHandle, relativePath) {
  const parts = normalize(relativePath).split('/').filter(Boolean);
  let current = rootHandle;
  for (let i = 0; i < parts.length - 1; i += 1) {
    current = await current.getDirectoryHandle(parts[i]);
  }
  return current.getFileHandle(parts.at(-1)).then((handle) => handle.getFile());
}

function createObjectUrlFromHandle(rootHandle, relativePath) {
  const promise = readFileFromHandle(rootHandle, relativePath).then((file) => URL.createObjectURL(file));
  return promise;
}

function ensureDirectoryUrl(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function inferRemoteFileName(url) {
  const pathname = new URL(url).pathname;
  const candidate = pathname.split('/').pop();
  if (!candidate) {
    return 'remote.sld';
  }
  return candidate;
}

function isArchiveBundleUrl(url) {
  const pathname = new URL(url).pathname.toLowerCase();
  return pathname.endsWith('.zip') || pathname.endsWith('.sld');
}

function normalize(path) {
  return String(path).replaceAll('\\', '/').replace(/^\.\//, '');
}

async function getObjectUrl(zip, relativePath, objectUrlCache) {
  const normalized = normalize(relativePath);
  if (objectUrlCache.has(normalized)) {
    return objectUrlCache.get(normalized);
  }

  const entry = zip.file(normalized);
  if (!entry) {
    throw new Error(`Datei im SLD/ZIP nicht gefunden: ${relativePath}`);
  }
  const blob = await entry.async('blob');
  const objectUrl = URL.createObjectURL(blob);
  objectUrlCache.set(normalized, objectUrl);
  return objectUrl;
}
