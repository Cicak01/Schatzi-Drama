/**
 * Bypass IP blacklist on upstream API (api.sansekai.my.id)
 * by injecting rotating Indonesian ISP IP addresses into X-Forwarded-For headers.
 */

const INDONESIA_IP_PREFIXES = [
  [182, 253], // Telkom Speedy / IndiHome
  [36, 72],   // Telkomsel
  [114, 124], // Telkomsel
  [180, 252], // Indosat Ooredoo
  [110, 137], // XL Axiata
  [125, 160], // Biznet
  [103, 247], // Indonesian ISP
  [202, 80],  // CBN
  [112, 215], // XL Axiata
  [182, 2],   // Telkom
  [36, 80],   // Telkom
  [120, 188], // Telkom
];

export function getRandomIndonesianIp(): string {
  const prefix = INDONESIA_IP_PREFIXES[Math.floor(Math.random() * INDONESIA_IP_PREFIXES.length)];
  const b3 = Math.floor(Math.random() * 250) + 1;
  const b4 = Math.floor(Math.random() * 250) + 1;
  return `${prefix[0]}.${prefix[1]}.${b3}.${b4}`;
}

export async function upstreamFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(
    input instanceof Request ? input.headers : init?.headers
  );
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    headers.set("x-forwarded-for", getRandomIndonesianIp());
    try {
      const res = await fetch(input, {
        ...init,
        headers,
      });

      if (res.status === 403 && attempt < maxRetries) {
        continue;
      }

      return res;
    } catch (err) {
      if (attempt === maxRetries) throw err;
    }
  }

  return fetch(input, { ...init, headers });
}

export function patchUpstreamFetch() {
  if (typeof globalThis === "undefined") return;
  if ((globalThis as any).__upstream_fetch_patched) return;
  (globalThis as any).__upstream_fetch_patched = true;

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    let urlStr = "";
    if (typeof input === "string") {
      urlStr = input;
    } else if (input instanceof URL) {
      urlStr = input.toString();
    } else if (input && typeof (input as any).url === "string") {
      urlStr = (input as any).url;
    }

    if (urlStr && urlStr.includes("api.sansekai.my.id")) {
      const headers = new Headers(
        input instanceof Request ? input.headers : init?.headers
      );
      if (init?.headers) {
        new Headers(init.headers).forEach((value, key) => {
          headers.set(key, value);
        });
      }

      if (!headers.has("x-forwarded-for")) {
        headers.set("x-forwarded-for", getRandomIndonesianIp());
      }

      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const res = await originalFetch.call(this, input, {
            ...init,
            headers,
          });

          // If upstream returns 403 blacklist error, retry with a fresh random IP
          if (res.status === 403 && attempt < maxRetries) {
            headers.set("x-forwarded-for", getRandomIndonesianIp());
            continue;
          }

          return res;
        } catch (err) {
          if (attempt === maxRetries) throw err;
        }
      }
    }

    return originalFetch.call(this, input, init);
  };
}

// Auto-run patch on import
patchUpstreamFetch();
