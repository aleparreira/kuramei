import type { NavigationSpec, UISpecToken } from '../spec/schema.js';

function formatDestination(destination: string): string {
  return destination
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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

export function renderNavigation(spec: NavigationSpec, token: UISpecToken): string {
  const now = Date.now();
  const isExpired = now >= token.expiresAt;
  const destination = formatDestination(spec.destination);
  const encodedDestination = encodeURIComponent(spec.destination);
  const timeRemaining = formatTimeRemaining(token.expiresAt);

  const wazeUrl = `waze://?q=${encodedDestination}&navigate=yes`;
  const googleMapsUrl = `https://www.google.com/maps/search/?q=${encodedDestination}`;
  const appleMapsUrl = `maps://?q=${encodedDestination}`;

  const expirationBanner = isExpired
    ? `<div style="background:#fee2e2;color:#991b1b;padding:12px 16px;border-radius:8px;font-size:14px;text-align:center;margin-bottom:20px;">
        Link expirado
      </div>`
    : `<div style="background:#f0fdf4;color:#166534;padding:12px 16px;border-radius:8px;font-size:14px;text-align:center;margin-bottom:20px;">
        Link válido por mais ${timeRemaining}
      </div>`;

  const navigationButtons = isExpired
    ? `<p style="color:#6b7280;font-size:14px;text-align:center;margin:0;">Este link não está mais disponível.</p>`
    : `<a href="${wazeUrl}" style="display:block;background:#00bcd4;color:#000;text-decoration:none;padding:16px;border-radius:12px;font-size:16px;font-weight:600;text-align:center;margin-bottom:12px;">
        Abrir no Waze
      </a>
      <a href="${googleMapsUrl}" style="display:block;background:#4285f4;color:#fff;text-decoration:none;padding:16px;border-radius:12px;font-size:16px;font-weight:600;text-align:center;margin-bottom:12px;">
        Abrir no Google Maps
      </a>
      <a href="${appleMapsUrl}" style="display:block;background:#000;color:#fff;text-decoration:none;padding:16px;border-radius:12px;font-size:16px;font-weight:600;text-align:center;">
        Abrir no Apple Maps
      </a>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Navegar para ${destination}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px;">
    <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

      <p style="color:#6b7280;font-size:13px;margin:0 0 6px 0;text-transform:uppercase;letter-spacing:0.05em;">Destino</p>
      <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 24px 0;line-height:1.2;">${destination}</h1>

      ${expirationBanner}

      <div>
        ${navigationButtons}
      </div>

    </div>
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px;">Enviado via Kuramei</p>
  </div>
</body>
</html>`;
}
