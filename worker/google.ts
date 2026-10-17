import { HEADERS } from '../shared/leads';

export interface GoogleCredentials {
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
  GOOGLE_SHEET_ID: string;
  GOOGLE_SHEET_TAB: string;
}
export class UpstreamError extends Error {
  constructor(
    public status: number,
    public stage: string,
  ) {
    super(`${stage}:${status}`);
  }
}
export type Fetcher = typeof fetch;
const encoder = new TextEncoder();
function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
export async function googleAccessToken(
  env: GoogleCredentials,
  fetcher: Fetcher = fetch,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = base64url(
    encoder.encode(
      JSON.stringify({
        iss: env.GOOGLE_CLIENT_EMAIL,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const pem = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s/g, '');
  const bytes = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    bytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(`${header}.${claims}`),
  );
  const assertion = `${header}.${claims}.${base64url(new Uint8Array(signature))}`;
  const response = await fetcher('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new UpstreamError(response.status, 'oauth');
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new UpstreamError(502, 'oauth');
  return data.access_token;
}
export function sheetRange(tab: string, cells: string) {
  return `'${tab.replace(/'/g, "''")}'!${cells}`;
}
export function valuesUrl(env: GoogleCredentials, cells: string) {
  return `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_SHEET_ID)}/values/${encodeURIComponent(sheetRange(env.GOOGLE_SHEET_TAB, cells))}`;
}
export async function readHeaders(env: GoogleCredentials, token: string, fetcher: Fetcher = fetch) {
  const response = await fetcher(valuesUrl(env, 'A1:N1'), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new UpstreamError(response.status, 'headers');
  const data = (await response.json()) as { values?: string[][] };
  return data.values?.[0] || [];
}
export function headersMatch(headers: string[]) {
  return headers.length === HEADERS.length && HEADERS.every((v, i) => v === headers[i]);
}
export async function appendLead(env: GoogleCredentials, row: string[], fetcher: Fetcher = fetch) {
  const token = await googleAccessToken(env, fetcher);
  if (!headersMatch(await readHeaders(env, token, fetcher)))
    throw new UpstreamError(409, 'headers');
  // Never retry an append automatically: a timeout may happen after Google has stored it.
  const response = await fetcher(
    valuesUrl(env, 'A:N') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ majorDimension: 'ROWS', values: [row] }),
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) throw new UpstreamError(response.status, 'append');
  const data = (await response.json()) as { updates?: { updatedRows?: number } };
  if (data.updates?.updatedRows !== 1) throw new UpstreamError(502, 'append');
}
