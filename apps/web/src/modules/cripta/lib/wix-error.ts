/** Only expose bounded Wix error identifiers. Never expose a response body or signed URL. */
export async function wixError(response: Response, operation: string): Promise<Error> {
  let code = '';
  try {
    const data = await response.json() as {
      details?: { applicationError?: { code?: unknown; data?: { internalKey?: unknown } } };
      error?: { code?: unknown };
    };
    const candidate = data.details?.applicationError?.code
      ?? data.details?.applicationError?.data?.internalKey
      ?? data.error?.code;
    if (typeof candidate === 'string' && /^[a-zA-Z0-9_.-]{1,90}$/.test(candidate)) code = ` (${candidate})`;
  } catch { /* An invalid response remains a status-only error. */ }
  return new Error(`Wix Media [${operation}]: HTTP ${response.status}${code}.`);
}
