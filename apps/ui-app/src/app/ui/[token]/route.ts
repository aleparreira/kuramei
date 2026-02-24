import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getUISpec } from '@/lib/dynamo';
import { UISpecTokenSchema, renderNavigation, renderMessage, renderList } from '@kuramei/ui-engine';
import type { UISpec, UISpecToken } from '@kuramei/ui-engine';

const CSP =
  "default-src 'none'; frame-src https://www.openstreetmap.org; style-src 'unsafe-inline'";

function html(body: string, status: number): NextResponse {
  return new NextResponse(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': CSP,
      'Cache-Control': 'no-store',
    },
  });
}

function whatsappUrl(): string {
  const number = process.env['WHATSAPP_NUMBER'] ?? '';
  return `https://wa.me/${number}?text=Preciso+de+um+novo+link`;
}

function renderInvalidToken(): string {
  const wa = whatsappUrl();
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Link inválido</title></head>
<body style="margin:0;padding:32px 20px;background:#f9fafb;font-family:system-ui,sans-serif;text-align:center;">
<p style="font-size:48px">⚠️</p>
<h1 style="color:#111827;font-size:22px">Link inválido</h1>
<p style="color:#6b7280">Este link não é válido ou expirou. Solicite um novo pelo WhatsApp.</p>
<a href="${wa}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#25D366;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Abrir WhatsApp</a>
</body></html>`;
}

function renderSpec(spec: UISpec, token: UISpecToken): string {
  switch (spec.type) {
    case 'navigation': return renderNavigation(spec, token);
    case 'message': return renderMessage(spec, token);
    case 'list': return renderList(spec, token);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;
  if (!token) return html(renderInvalidToken(), 400);

  const secret = process.env['KURAMEI_JWT_SECRET'];
  if (!secret) return html('<h1>Server misconfiguration</h1>', 500);

  const payload = verifyJWT(token, secret);
  if (!payload) return html(renderInvalidToken(), 400);

  let raw: string | null;
  try {
    raw = await getUISpec(payload.hash);
  } catch (err) {
    console.error('DynamoDB error:', err);
    return html('<h1>Internal Server Error</h1>', 500);
  }

  if (!raw) return html(renderInvalidToken(), 410);

  let specToken: UISpecToken;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = UISpecTokenSchema.safeParse(parsed);
    if (!result.success) return html(renderInvalidToken(), 410);
    specToken = result.data as UISpecToken;
  } catch {
    return html(renderInvalidToken(), 410);
  }

  return html(renderSpec(specToken.spec, specToken), 200);
}
