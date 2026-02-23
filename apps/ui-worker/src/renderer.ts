import { renderNavigation, renderMessage, renderList } from '@kuramei/ui-engine';
import type { UISpec, UISpecToken } from '@kuramei/ui-engine';

export function render(spec: UISpec, token: UISpecToken): string {
  switch (spec.type) {
    case 'navigation':
      return renderNavigation(spec, token);
    case 'message':
      return renderMessage(spec, token);
    case 'list':
      return renderList(spec, token);
  }
}

export function renderInvalidToken(whatsappUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Link inválido</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px;">
    <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,0.08);text-align:center;">
      <p style="font-size:48px;margin:0 0 16px 0;">⚠️</p>
      <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 12px 0;">Link inválido</h1>
      <p style="color:#6b7280;font-size:15px;margin:0 0 24px 0;">Este link não é válido. Solicite um novo link pelo WhatsApp.</p>
      <a href="${whatsappUrl}"
         style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:600;">
        Abrir WhatsApp
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px;">Enviado via Kuramei</p>
  </div>
</body>
</html>`;
}

export function renderExpired(whatsappUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Link expirado</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px;">
    <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,0.08);text-align:center;">
      <p style="font-size:48px;margin:0 0 16px 0;">⏱️</p>
      <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 12px 0;">Link expirado</h1>
      <p style="color:#6b7280;font-size:15px;margin:0 0 24px 0;">Este link não está mais disponível. Solicite um novo link pelo WhatsApp.</p>
      <a href="${whatsappUrl}"
         style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:600;">
        Solicitar novo link
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px;">Enviado via Kuramei</p>
  </div>
</body>
</html>`;
}
