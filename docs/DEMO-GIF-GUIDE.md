# Demo GIF Creation Guide

This guide explains how to create the demo GIF for Kuramei.

## Screenshots Captured

The following screenshots are available in `docs/assets/demo-screens/`:

| File | Description |
|------|-------------|
| `02-loaded.png` | Canvas loaded with demo data (light mode) |
| `03-chat-open.png` | Chat panel open with prompt suggestions |
| `04-export-modal.png` | Export Terraform modal with file list |
| `05-full-canvas.png` | Full canvas view with chat panel |
| `06-canvas-clean.png` | Clean canvas without chat (light mode) |
| `07-dark-mode.png` | Dark mode view |

## Recommended Flow for Demo GIF

1. **Canvas view** (3s) - Show the architecture diagram
2. **Open chat** (2s) - Click chat toggle, show suggestions
3. **Chat interaction** (5s) - Type a prompt, show AI response
4. **Diagram update** (3s) - Show new node appearing
5. **Export modal** (5s) - Click Export, show Terraform files
6. **Dark mode** (2s) - Toggle theme (optional)

Total: ~20-30 seconds

## Creating the GIF

### Option 1: Screen Recording (Recommended)

1. **Start servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend && source .venv/bin/activate && uvicorn src.main:app --reload

   # Terminal 2 - Frontend
   cd frontend && pnpm dev
   ```

2. **Seed demo data:**
   ```bash
   cd backend && python scripts/seed_demo.py
   ```

3. **Record with OBS or QuickTime:**
   - Set resolution to 1280x720 or 1920x1080
   - Record at 30 FPS
   - Perform the demo flow

4. **Convert to GIF:**
   ```bash
   # Install ffmpeg if needed
   brew install ffmpeg gifsicle

   # Convert video to GIF
   ffmpeg -i demo.mov -vf "fps=10,scale=1280:-1:flags=lanczos" -c:v gif demo-raw.gif

   # Optimize GIF size
   gifsicle -O3 --colors 256 demo-raw.gif -o docs/assets/demo.gif
   ```

### Option 2: From Screenshots (Current)

If you have ImageMagick installed:

```bash
# Install ImageMagick
brew install imagemagick

# Create GIF from screenshots (3 second delay per frame)
convert -delay 300 -loop 0 \
  docs/assets/demo-screens/06-canvas-clean.png \
  docs/assets/demo-screens/03-chat-open.png \
  docs/assets/demo-screens/05-full-canvas.png \
  docs/assets/demo-screens/04-export-modal.png \
  docs/assets/demo-screens/07-dark-mode.png \
  docs/assets/demo.gif

# Optimize
gifsicle -O3 docs/assets/demo.gif -o docs/assets/demo.gif
```

### Option 3: Browser Automation

Use agent-browser to capture frames programmatically:

```bash
# Capture flow with agent-browser
agent-browser --headed open http://localhost:3000
agent-browser wait 2000
agent-browser screenshot frame-01.png

# Interact with chat
agent-browser click "e5"  # Toggle chat
agent-browser wait 500
agent-browser screenshot frame-02.png

# ... continue for each frame
```

Then assemble with ffmpeg:

```bash
ffmpeg -framerate 2 -i frame-%02d.png -vf "fps=10" demo.gif
```

## Specifications

- **Resolution:** 1280x720 minimum
- **FPS:** 10-15 (smooth but small file)
- **Duration:** 20-60 seconds
- **Max size:** 5MB
- **Format:** GIF (for GitHub/README compatibility)

## Current Status

Screenshots have been captured. To complete the GIF:

1. Install ffmpeg: `brew install ffmpeg gifsicle`
2. Run the screen recording flow above
3. Place final GIF at `docs/assets/demo.gif`

## Alternative: Static Preview

If GIF creation is not possible, use `docs/assets/demo-screens/04-export-modal.png` as a static preview image. This shows the key feature (Terraform export) in one image.
