import type { Page } from '@playwright/test';
import { createMockAdapter } from '../../src/mock/adapter';
import { seed, type Database } from '../../src/mock/fixtures';
import { resolveApiConfiguration } from '../../src/api/config';
import type { AuthSession, Envelope } from '../../src/types';
import type { BaseQueryApi } from '@reduxjs/toolkit/query';

// Only tests intercept HTTP. The production browser executes real fetchBaseQuery.
export async function installHttpFixture(page: Page) {
  const config = resolveApiConfiguration('false', process.env.NEXT_PUBLIC_API_BASE_URL);
  if (config.error) throw new Error(config.error);
  const prefix = new URL(config.baseUrl).pathname;
  let value = JSON.stringify(seed());
  const adapter = createMockAdapter({getItem: () => value, setItem: (_key, next) => {value = next;}}, 0);
  const runtime = {signal: new AbortController().signal, abort() {}, dispatch: () => {}, getState: () => ({}), extra: undefined, endpoint: 'httpFixture', type: 'query'} as BaseQueryApi;
  let queue = Promise.resolve();
  await page.route(`${config.baseUrl}/**`, route => {
    queue = queue.then(async () => {
      const request = route.request();
      const cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type,idempotency-key,accept', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,OPTIONS'};
      if (request.method() === 'OPTIONS') {await route.fulfill({status:204, headers:cors});return;}
      let body: unknown;
      if (request.headers()['content-type']?.startsWith('multipart/form-data')) {
        body = await new Request('http://fixture.test', {method:'POST', headers:request.headers(), body:Uint8Array.from(request.postDataBuffer() ?? [])}).formData();
      } else if (request.postData()) body = request.postDataJSON();
      const url = new URL(request.url());
      const endpoint = url.pathname.slice(prefix.length) + url.search;
      const response = await adapter({url:endpoint, method:request.method(), headers:request.headers(), body}, runtime, {});
      if (!response.error && ['/auth/login','/auth/link/exchange'].includes(endpoint)) {
        const session = (response.data as Envelope<AuthSession>).data;
        const db = JSON.parse(value) as Database;
        delete db.tokens[session.accessToken];
        session.accessToken = `e30.${Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.${crypto.randomUUID()}`;
        db.tokens[session.accessToken] = session;
        value = JSON.stringify(db);
      }
      if (response.error) {
        await route.fulfill({status:typeof response.error.status === 'number' ? response.error.status : 500, headers:cors, contentType:'application/json', body:JSON.stringify(response.error.data)});
      } else if (response.data instanceof Blob) {
        await route.fulfill({status:200, headers:cors, contentType:response.data.type, body:Buffer.from(await response.data.arrayBuffer())});
      } else await route.fulfill({status:200, headers:cors, contentType:'application/json', body:JSON.stringify(response.data)});
    });
    return queue;
  });
}
