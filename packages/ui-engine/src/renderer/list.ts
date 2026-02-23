import type { ListSpec, UISpecToken } from '../spec/schema.js';

function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const remaining = expiresAt - now;

  if (remaining <= 0) {
    return '';
  }

  const minutes = Math.floor(remaining / 60_000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  return `${minutes}min`;
}

export function renderList(spec: ListSpec, token: UISpecToken): string {
  const now = Date.now();
  const isExpired = now >= token.expiresAt;
  const timeRemaining = formatTimeRemaining(token.expiresAt);

  const expirationBanner = isExpired
    ? `<div style="background:#fee2e2;color:#991b1b;padding:12px 16px;border-radius:8px;font-size:14px;text-align:center;margin-bottom:20px;">
        Link expirado
      </div>`
    : `<div style="background:#f0fdf4;color:#166534;padding:12px 16px;border-radius:8px;font-size:14px;text-align:center;margin-bottom:20px;">
        Link válido por mais ${timeRemaining}
      </div>`;

  const listItems = spec.items
    .map(
      (item) => `
      <li style="padding:14px 0;border-bottom:1px solid #f3f4f6;">
        <span style="color:#111827;font-size:15px;font-weight:500;display:block;">${item.label}</span>
        ${item.description ? `<span style="color:#6b7280;font-size:13px;display:block;margin-top:4px;">${item.description}</span>` : ''}
      </li>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${spec.title}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px;">
    <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

      <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 16px 0;line-height:1.3;">${spec.title}</h1>

      ${expirationBanner}

      <ul style="list-style:none;margin:0;padding:0;">
        ${listItems}
      </ul>

    </div>
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px;">Enviado via Kuramei</p>
  </div>
</body>
</html>`;
}
