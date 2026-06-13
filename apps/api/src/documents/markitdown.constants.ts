export const DEFAULT_MARKITDOWN_URL = 'http://localhost:8000';
export const DEFAULT_MARKITDOWN_TIMEOUT_MS = 60_000;

export function getMarkitdownUrl(): string {
  const url = process.env.MARKITDOWN_URL?.trim();
  return url || DEFAULT_MARKITDOWN_URL;
}

export function getMarkitdownTimeoutMs(): number {
  const raw = process.env.MARKITDOWN_TIMEOUT_MS?.trim();
  if (!raw) {
    return DEFAULT_MARKITDOWN_TIMEOUT_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MARKITDOWN_TIMEOUT_MS;
  }
  return parsed;
}
