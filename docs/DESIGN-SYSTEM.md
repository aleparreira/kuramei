# Kuramei Design System

Identidade visual e diretrizes de design para o Kuramei.

---

## Cores

### Paleta Principal

| Nome | Hex | RGB | Uso |
|------|-----|-----|-----|
| **Coral** | `#ff4c60` | 255, 76, 96 | Primaria, CTAs, alertas |
| **Aqua** | `#65ebe7` | 101, 235, 231 | Secundaria, links, destaques |
| **Canvas** | `#f9f9fe` | 249, 249, 254 | Background claro |
| **Ink** | `#454360` | 69, 67, 96 | Texto principal |

### Paleta Estendida

| Nome | Hex | Uso |
|------|-----|-----|
| Coral Light | `#ff7a8a` | Hover states |
| Coral Dark | `#e6364a` | Active states |
| Aqua Light | `#8ff0ed` | Hover states |
| Aqua Dark | `#4dd4d0` | Active states |
| Canvas Dark | `#1a1a2e` | Background dark mode |
| Ink Light | `#6b6987` | Texto secundario |
| Ink Lighter | `#9492a6` | Placeholders |

### Semanticas

| Nome | Light Mode | Dark Mode | Uso |
|------|------------|-----------|-----|
| Success | `#22c55e` | `#4ade80` | Confirmacoes |
| Warning | `#f59e0b` | `#fbbf24` | Alertas |
| Error | `#ef4444` | `#f87171` | Erros |
| Info | `#3b82f6` | `#60a5fa` | Informacoes |

---

## Tipografia

### Font Family

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", monospace;
```

### Escala

| Nome | Size | Weight | Line Height | Uso |
|------|------|--------|-------------|-----|
| Display | 48px | 700 | 1.1 | Hero headlines |
| H1 | 36px | 700 | 1.2 | Page titles |
| H2 | 28px | 600 | 1.3 | Section titles |
| H3 | 22px | 600 | 1.4 | Card titles |
| H4 | 18px | 600 | 1.4 | Subsections |
| Body | 16px | 400 | 1.5 | Texto corrido |
| Small | 14px | 400 | 1.5 | Labels, captions |
| Tiny | 12px | 400 | 1.4 | Badges, tooltips |

---

## Espacamento

### Base Unit

`4px` (todos espacamentos sao multiplos de 4)

### Escala

| Token | Value | Uso |
|-------|-------|-----|
| `space-0` | 0 | - |
| `space-1` | 4px | Inline spacing |
| `space-2` | 8px | Icon gaps |
| `space-3` | 12px | Small padding |
| `space-4` | 16px | Default padding |
| `space-5` | 20px | Medium padding |
| `space-6` | 24px | Section gaps |
| `space-8` | 32px | Large gaps |
| `space-10` | 40px | Section margins |
| `space-12` | 48px | Page sections |
| `space-16` | 64px | Major sections |

---

## Componentes shadcn

### Configuracao do Tema

`components.json`:
```json
{
  "style": "new-york",
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "zinc"
  }
}
```

### CSS Variables (globals.css)

```css
@layer base {
  :root {
    /* Background */
    --background: 249 249 254; /* Canvas */
    --foreground: 69 67 96; /* Ink */

    /* Primary (Coral) */
    --primary: 255 76 96;
    --primary-foreground: 255 255 255;

    /* Secondary (Aqua) */
    --secondary: 101 235 231;
    --secondary-foreground: 69 67 96;

    /* Accent */
    --accent: 101 235 231;
    --accent-foreground: 69 67 96;

    /* Muted */
    --muted: 243 243 248;
    --muted-foreground: 107 105 135;

    /* Card */
    --card: 255 255 255;
    --card-foreground: 69 67 96;

    /* Border */
    --border: 228 228 235;
    --input: 228 228 235;
    --ring: 255 76 96;

    /* Radius */
    --radius: 0.5rem;
  }

  .dark {
    --background: 26 26 46;
    --foreground: 243 243 248;

    --primary: 255 76 96;
    --primary-foreground: 255 255 255;

    --secondary: 101 235 231;
    --secondary-foreground: 26 26 46;

    --muted: 45 45 70;
    --muted-foreground: 148 146 166;

    --card: 35 35 58;
    --card-foreground: 243 243 248;

    --border: 55 55 80;
    --input: 55 55 80;
  }
}
```

---

## React Flow - Node Styles

### Node Types Visuais

```typescript
const nodeStyles = {
  system: {
    background: '#ff4c60',
    color: '#ffffff',
    border: '2px solid #e6364a',
    borderRadius: '12px',
  },
  service: {
    background: '#ffffff',
    color: '#454360',
    border: '2px solid #65ebe7',
    borderRadius: '8px',
  },
  database: {
    background: '#f0fdf4',
    color: '#454360',
    border: '2px solid #22c55e',
    borderRadius: '8px',
    icon: 'Database',
  },
  queue: {
    background: '#fef3c7',
    color: '#454360',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    icon: 'MessageSquare',
  },
  bucket: {
    background: '#e0f2fe',
    color: '#454360',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    icon: 'Archive',
  },
  function: {
    background: '#fae8ff',
    color: '#454360',
    border: '2px solid #d946ef',
    borderRadius: '8px',
    icon: 'Zap',
  },
  external_system: {
    background: '#f3f4f6',
    color: '#6b7280',
    border: '2px dashed #9ca3af',
    borderRadius: '8px',
  },
  gateway: {
    background: '#65ebe7',
    color: '#454360',
    border: '2px solid #4dd4d0',
    borderRadius: '8px',
    icon: 'Globe',
  },
};
```

### Edge Styles

```typescript
const edgeStyles = {
  calls: {
    stroke: '#454360',
    strokeWidth: 2,
    animated: false,
  },
  publishes: {
    stroke: '#f59e0b',
    strokeWidth: 2,
    strokeDasharray: '5,5',
    animated: true,
  },
  subscribes: {
    stroke: '#22c55e',
    strokeWidth: 2,
    strokeDasharray: '5,5',
    animated: true,
  },
  reads: {
    stroke: '#3b82f6',
    strokeWidth: 2,
    animated: false,
  },
  writes: {
    stroke: '#ef4444',
    strokeWidth: 2,
    animated: false,
  },
};
```

---

## Icones

### Provider: Lucide React

```bash
npm install lucide-react
```

### Mapeamento Node Type → Icone

| Node Type | Icone |
|-----------|-------|
| system | `Box` |
| service | `Server` |
| database | `Database` |
| queue | `MessageSquare` |
| bucket | `Archive` |
| function | `Zap` |
| job | `Clock` |
| ui | `Monitor` |
| external_system | `ExternalLink` |
| gateway | `Globe` |
| vpc | `Network` |
| subnet | `GitBranch` |
| identity | `UserCheck` |
| secret | `Key` |

### Cloud Provider Icons

Para icones de cloud providers (AWS, Azure, GCP), usar:

```bash
npm install @icons-pack/react-simple-icons
```

Ou SVGs customizados de:
- AWS: https://aws.amazon.com/architecture/icons/
- Azure: https://docs.microsoft.com/en-us/azure/architecture/icons/
- GCP: https://cloud.google.com/icons

---

## Layout

### Canvas (React Flow)

```typescript
const canvasConfig = {
  defaultViewport: { x: 0, y: 0, zoom: 1 },
  minZoom: 0.1,
  maxZoom: 4,
  snapToGrid: true,
  snapGrid: [16, 16],
  fitView: true,
  fitViewOptions: {
    padding: 0.2,
  },
};
```

### Grid System

- Container: `max-w-7xl` (1280px)
- Grid: 12 colunas
- Gutter: 24px (space-6)
- Margin: 16px mobile, 24px tablet, 32px desktop

### Breakpoints

| Nome | Width | Uso |
|------|-------|-----|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |
| 2xl | 1536px | Wide screens |

---

## Animacoes

### Transicoes Padrao

```css
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

### Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Acessibilidade

### Contraste

Todas as combinacoes de cor devem ter contraste minimo:
- **Normal text**: 4.5:1
- **Large text**: 3:1
- **UI components**: 3:1

### Focus States

```css
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

### Screen Readers

- Usar `aria-label` em icones interativos
- `aria-live` para updates dinamicos no canvas
- `role="img"` com `aria-label` para nodes

---

## Exemplo de Node Component

```tsx
import { Handle, Position } from 'reactflow';
import { Database } from 'lucide-react';

interface ServiceNodeProps {
  data: {
    name: string;
    type: string;
    cost?: {
      monthlyUSD: number;
    };
  };
}

export function ServiceNode({ data }: ServiceNodeProps) {
  return (
    <div className="px-4 py-3 bg-white border-2 border-aqua rounded-lg shadow-sm min-w-[150px]">
      <Handle type="target" position={Position.Top} className="!bg-ink" />

      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-ink-light" />
        <span className="font-medium text-ink">{data.name}</span>
      </div>

      {data.cost && (
        <div className="mt-2 text-xs text-ink-light">
          ${data.cost.monthlyUSD}/mo
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-ink" />
    </div>
  );
}
```

---

## Assets

### Logo

- Primary: Coral (#ff4c60) no fundo claro
- Inverted: Branco no fundo escuro
- Tamanhos: 32px, 64px, 128px, 256px, 512px

### Favicon

- 16x16, 32x32, 180x180 (apple-touch-icon)
- Formato: PNG ou SVG

### OG Image

- Tamanho: 1200x630px
- Background: Canvas ou Ink
- Logo + Tagline

---

## Changelog

| Versao | Data | Mudancas |
|--------|------|----------|
| 1.0 | 2026-01-22 | Versao inicial |
