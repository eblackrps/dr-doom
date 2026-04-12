export const DEFAULT_AUDIO_SETTINGS = {
  master: 80,
  sfx: 100,
  music: 70,
  ambient: 60,
  bitcrush: true,
  spatial: true,
  muteFocus: true,
};

const AUDIO_STORAGE_KEY = 'dr-doom-audio';

function clampPercent(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeAudioSettings(settings = {}) {
  return {
    master: clampPercent(settings.master ?? DEFAULT_AUDIO_SETTINGS.master, DEFAULT_AUDIO_SETTINGS.master),
    sfx: clampPercent(settings.sfx ?? DEFAULT_AUDIO_SETTINGS.sfx, DEFAULT_AUDIO_SETTINGS.sfx),
    music: clampPercent(settings.music ?? DEFAULT_AUDIO_SETTINGS.music, DEFAULT_AUDIO_SETTINGS.music),
    ambient: clampPercent(settings.ambient ?? DEFAULT_AUDIO_SETTINGS.ambient, DEFAULT_AUDIO_SETTINGS.ambient),
    bitcrush: Boolean(settings.bitcrush ?? DEFAULT_AUDIO_SETTINGS.bitcrush),
    spatial: Boolean(settings.spatial ?? DEFAULT_AUDIO_SETTINGS.spatial),
    muteFocus: Boolean(settings.muteFocus ?? DEFAULT_AUDIO_SETTINGS.muteFocus),
  };
}

export function loadAudioSettings() {
  try {
    const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };

    const parsed = JSON.parse(raw);
    return normalizeAudioSettings({ ...DEFAULT_AUDIO_SETTINGS, ...parsed });
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveAudioSettings(partial = {}) {
  const next = normalizeAudioSettings({
    ...loadAudioSettings(),
    ...partial,
  });
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function resetAudioSettings() {
  const next = { ...DEFAULT_AUDIO_SETTINGS };
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}
