import { verifyJWT, parseUISpecToken } from './validate.js';
import { render, renderInvalidToken, renderExpired } from './renderer.js';

interface Env {
  KV: KVNamespace;
  KURAMEI_JWT_SECRET: string;
  WHATSAPP_NUMBER: string;
}

const CSP =
  "default-src 'none'; frame-src https://www.openstreetmap.org; style-src 'unsafe-inline'";

function htmlResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': CSP,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/^\/ui\/(.+)$/);

    if (!pathMatch || request.method !== 'GET') {
      return htmlResponse('<h1>Not Found</h1>', 404);
    }

    const token = pathMatch[1];
    if (!token) {
      return htmlResponse('<h1>Not Found</h1>', 404);
    }

    const whatsappUrl = `https://wa.me/${env.WHATSAPP_NUMBER}?text=Preciso+de+um+novo+link`;

    const payload = await verifyJWT(token, env.KURAMEI_JWT_SECRET);
    if (!payload) {
      return htmlResponse(renderInvalidToken(whatsappUrl), 400);
    }

    const raw = await env.KV.get(payload.hash);
    if (!raw) {
      return htmlResponse(renderExpired(whatsappUrl), 410);
    }

    const specToken = parseUISpecToken(raw);
    if (!specToken) {
      return htmlResponse(renderExpired(whatsappUrl), 410);
    }

    const html = render(specToken.spec, specToken);
    return htmlResponse(html, 200);
  },
};
