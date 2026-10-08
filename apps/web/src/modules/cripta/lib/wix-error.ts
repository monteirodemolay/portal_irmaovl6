/** Only expose a bounded Wix error identifier and a sanitized message. Never expose a raw response body, header or signed URL. */
export async function wixError(response: Response, operation: string): Promise<Error> {
  let code = '';
  let message = '';
  try {
    const data = await response.json() as {
      details?: { applicationError?: { code?: unknown; description?: unknown; data?: { internalKey?: unknown } } };
      error?: { code?: unknown };
      message?: unknown;
    };
    const candidate = data.details?.applicationError?.code
      ?? data.details?.applicationError?.data?.internalKey
      ?? data.error?.code;
    if (typeof candidate === 'string' && /^[a-zA-Z0-9_.-]{1,90}$/.test(candidate)) code = ` (${candidate})`;
    const candidateMessage = data.details?.applicationError?.description ?? data.message;
    if (typeof candidateMessage === 'string' && !/https?:\/\//i.test(candidateMessage)) {
      message = ` — ${candidateMessage.replace(/\s+/g, ' ').trim().slice(0, 200)}`;
    }
  } catch { /* An invalid response remains a status-only error. */ }
  return new Error(`Wix Media [${operation}]: HTTP ${response.status}${code}${message}.`);
}
