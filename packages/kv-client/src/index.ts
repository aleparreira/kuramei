/**
 * @kuramei/kv-client
 *
 * Cloudflare KV REST API client for Lambda-side code.
 * Config via env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_KV_NAMESPACE_ID, CLOUDFLARE_API_TOKEN
 *
 * NOTE: ui-worker reads from KV via the native Wrangler KV binding (env.KV.get)
 * and does NOT use this client.
 */

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function baseUrl(): string {
  const accountId = getEnv('CLOUDFLARE_ACCOUNT_ID');
  const namespaceId = getEnv('CLOUDFLARE_KV_NAMESPACE_ID');
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values`;
}

export async function put(key: string, value: string, ttlSeconds: number): Promise<void> {
  const apiToken = getEnv('CLOUDFLARE_API_TOKEN');
  const url = `${baseUrl()}/${encodeURIComponent(key)}?expiration_ttl=${ttlSeconds}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: value,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare KV write failed (${response.status}): ${text}`);
  }
}

export async function get(key: string): Promise<string | null> {
  const apiToken = getEnv('CLOUDFLARE_API_TOKEN');
  const url = `${baseUrl()}/${encodeURIComponent(key)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare KV read failed (${response.status}): ${text}`);
  }

  return response.text();
}

export async function del(key: string): Promise<void> {
  const apiToken = getEnv('CLOUDFLARE_API_TOKEN');
  const url = `${baseUrl()}/${encodeURIComponent(key)}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare KV delete failed (${response.status}): ${text}`);
  }
}
