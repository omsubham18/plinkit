const RECENT_SEARCHES_KEY = 'plinkit-recent-searches';
const MAX_RECENT_SEARCHES = 6;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_RECENT_SEARCHES);
    }
    return [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): string[] {
  const clean = query.trim();
  if (!clean) return getRecentSearches();

  try {
    const current = getRecentSearches();
    // Case-insensitive deduplication, keeping new search on top
    const filtered = current.filter(
      (item) => item.toLowerCase() !== clean.toLowerCase()
    );
    const updated = [clean, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [clean];
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore storage errors
  }
}
