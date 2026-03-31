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

export function loadAudioSettings() {
  try {
    const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };

    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AUDIO_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveAudioSettings(partial) {
  const next = {
    ...loadAudioSettings(),
    ...partial,
  };
  localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetAudioSettings() {
  localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(DEFAULT_AUDIO_SETTINGS));
  return { ...DEFAULT_AUDIO_SETTINGS };
}
