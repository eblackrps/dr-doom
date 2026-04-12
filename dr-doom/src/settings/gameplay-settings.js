const SETTINGS_KEY = 'dr-doom-gameplay';

export const DEFAULT_GAMEPLAY_SETTINGS = {
  mouseSensitivity: 1.0,
  fov: 75,
  invertY: false,
};

function normalize(settings = {}) {
  return {
    mouseSensitivity: Math.max(0.4, Math.min(2.5, Number(settings.mouseSensitivity ?? DEFAULT_GAMEPLAY_SETTINGS.mouseSensitivity))),
    fov: Math.max(60, Math.min(100, Math.round(Number(settings.fov ?? DEFAULT_GAMEPLAY_SETTINGS.fov)))),
    invertY: !!settings.invertY,
  };
}

export function loadGameplaySettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return normalize({ ...DEFAULT_GAMEPLAY_SETTINGS, ...raw });
  } catch {
    return { ...DEFAULT_GAMEPLAY_SETTINGS };
  }
}

export function saveGameplaySettings(partial = {}) {
  const next = normalize({ ...loadGameplaySettings(), ...partial });
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function resetGameplaySettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_GAMEPLAY_SETTINGS));
  } catch {}
  return { ...DEFAULT_GAMEPLAY_SETTINGS };
}
