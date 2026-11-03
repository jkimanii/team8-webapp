const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/*
fetch() with a timeout and a small, careful retry loop.

Retry:     the call timed out or the connection failed; 429 (waiting for
           Retry-After); 500, 502, 503, 504.
Don't:     400, 401, 403, 404 (the request is wrong, so asking again changes
           nothing) and anything that is not a GET (a retry could do a write
           twice).
Never forever: at most `retries` retries, and a wait that doubles each time.

Returns the final Response, even when it is a failure status: the caller checks
res.ok. Throws only when every attempt failed without an answer (timeout, or
no connection).
*/
async function fetchWithRetry(url, options = {}, config = {}) {
  const { timeoutMs = 1500, retries = 2, delayMs = 200 } = config;
  const method = (options.method || 'GET').toUpperCase();
  const maxRetries = method === 'GET' ? retries : 0; // never retry writes

  for (let attempt = 0; ; attempt++) {
    let wait = delayMs * 2 ** attempt; // 200 ms, then 400 ms
    let reason;

    try {
      // The timeout: after timeoutMs the request is cancelled and fetch throws
      // a TimeoutError.
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
      });

      // The exit: a good answer, a non-retryable status, or no retries left.
      if (!RETRY_STATUSES.has(res.status) || attempt >= maxRetries) return res;

      reason = `status ${res.status}`;
      const retryAfter = Number(res.headers.get('Retry-After'));
      if (res.status === 429 && retryAfter > 0) {
        wait = Math.min(retryAfter * 1000, 5000); // wait as asked, up to 5 s
      }
      await res.body?.cancel().catch(() => {}); // free the connection first
    } catch (err) {
      if (attempt >= maxRetries) throw err; // out of retries
      reason =
        err.name === 'TimeoutError'
          ? 'timeout'
          : err.cause?.code || err.message;
    }

    // Says why, never prints the URL's headers or any key.
    console.warn(
      `partner attempt ${attempt + 1} failed (${reason}), retrying in ${wait} ms`
    );
    await sleep(wait);
  }
}

module.exports = { fetchWithRetry };
