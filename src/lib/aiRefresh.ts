const AI_API_URL = process.env.AI_API_URL || 'http://localhost:8000';
const DEFAULT_REFRESH_TIMEOUT_MS = 15000;

export type AiRefreshResult = {
  ok: boolean;
  status?: number;
  data?: unknown;
  error?: string;
  skipped?: boolean;
};

const getRefreshTimeoutMs = () => {
  const configuredTimeout = Number(process.env.AI_REFRESH_TIMEOUT_MS);
  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_REFRESH_TIMEOUT_MS;
};

export const refreshAiGraph = async (reason: string): Promise<AiRefreshResult> => {
  if (process.env.DISABLE_AI_REFRESH === 'true') {
    return { ok: false, skipped: true, error: 'AI refresh disabled by DISABLE_AI_REFRESH' };
  }

  const timeoutMs = getRefreshTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const refreshUrl = `${AI_API_URL.replace(/\/$/, '')}/refresh`;

  try {
    const response = await fetch(refreshUrl, {
      method: 'POST',
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.warn(`[AI] Graph refresh failed after ${reason}: HTTP ${response.status}`, data);
      return { ok: false, status: response.status, data };
    }

    console.log(`[AI] Graph refreshed after ${reason}`);
    return { ok: true, status: response.status, data };
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.name === 'AbortError'
        ? `Timed out after ${timeoutMs}ms`
        : error.message
      : String(error);

    console.warn(`[AI] Graph refresh unavailable after ${reason}: ${message}`);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
};
