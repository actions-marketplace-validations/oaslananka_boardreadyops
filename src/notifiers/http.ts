export type Fetcher = (url: string | URL, init?: RequestInit) => Promise<Response>;

export interface HttpNotifierDependencies {
  env?: Record<string, string | undefined> | undefined;
  fetcher?: Fetcher | undefined;
}

export function envValue(
  env: Record<string, string | undefined> | undefined,
  name: string | undefined,
): string | undefined {
  if (!name) {
    return undefined;
  }
  const value = (env ?? process.env)[name]?.trim();
  return value || undefined;
}

export async function postJson(fetcher: Fetcher | undefined, url: string, body: unknown): Promise<void> {
  const activeFetch = fetcher ?? globalThis.fetch;
  if (typeof activeFetch !== "function") {
    throw new Error("fetch is not available");
  }
  const response = await activeFetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}
