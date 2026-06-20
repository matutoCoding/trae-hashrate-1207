const STORAGE_PREFIX = 'instrument-rental-';

export function saveToStorage<T>(key: string, data: T): void {
  try {
    const storageKey = STORAGE_PREFIX + key;
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const storageKey = STORAGE_PREFIX + key;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored) as T;
    }
    return defaultValue;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
}

export function clearStorage(key?: string): void {
  if (key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } else {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(k);
      }
    });
  }
}
