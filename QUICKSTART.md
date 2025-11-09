# Quick Start Guide

Get Singularity up and running in 5 minutes!

## Prerequisites Check

Before starting, ensure you have:
- [ ] Node.js 18+ installed (`node --version`)
- [ ] Python 3.9+ installed (`python --version`)
- [ ] Anthropic API key ([get one here](https://console.anthropic.com/))
- [ ] Voyage AI API key ([get one here](https://www.voyageai.com/))
- [ ] Chrome, Edge, or Brave browser

## Step 1: Clone & Navigate (30 seconds)

```bash
cd singularity
```

## Step 2: Backend Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate    # Windows
# OR
source venv/bin/activate # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env   # Windows
# OR
cp .env.example .env     # macOS/Linux

# Edit .env and add your API keys
# ANTHROPIC_API_KEY=sk-ant-...
# VOYAGE_API_KEY=pa-...

# Start the backend
python run.py
```

You should see:
```
✓ Environment variables configured
Starting FastAPI server...
Server will be available at: http://localhost:8000
```

Leave this terminal running!

## Step 3: Extension Setup (1 minute)

Open a NEW terminal:

```bash
cd extension

# Install dependencies
npm install

# Build extension
npm run build
```

## Step 4: Load in Browser (1 minute)

1. Open your Chromium browser
2. Go to `chrome://extensions/`
3. Toggle "Developer mode" ON (top right)
4. Click "Load unpacked"
5. Navigate to and select: `singularity/extension/dist`
6. You should see Singularity extension loaded!

## Step 5: Test It! (30 seconds)

1. Click the Singularity icon in your browser toolbar
2. Verify "Backend Status" shows "Connected" (green dot)
3. Visit [Claude.ai](https://claude.ai)
4. Open DevTools (F12) → Console tab
5. Look for `[Singularity] Content script loaded for Claude.ai`

## Next Steps

### Try the MVP Flow:

1. **On Claude.ai**, say: "I prefer vegetarian food and I love Italian cuisine"
2. Wait a few seconds for extraction
3. **On ChatGPT**, ask: "Suggest some protein-rich recipes"
4. ChatGPT should receive context about your preferences!

### Check Stored Context:

- Click the Singularity extension icon
- View "Recent Context" section
- See extracted facts with platforms and timestamps

### Troubleshooting:

**Backend shows offline?**
- Check terminal - is `python run.py` still running?
- Visit http://localhost:8000/health - should show status

**No context being injected?**
- Check browser console for errors
- Ensure extension is enabled (toggle in popup)
- Verify backend received the message (check backend terminal logs)

**Nothing happens when chatting?**
- AI platforms may have updated their UI
- Content script selectors might need updating
- Check console for `[Singularity]` logs

## Development Mode

Want to modify the code?

**Backend** (auto-reload on changes):
```bash
cd backend
python run.py
```

**Extension** (rebuild and reload):
```bash
cd extension
npm run build
# Then click "Reload" on the extension in chrome://extensions
```

## What's Next?

Check out:
- [README.md](README.md) - Full documentation
- [PRD.md](PRD.md) - Product requirements and architecture
- [CLAUDE.md](CLAUDE.md) - Developer guidance

Happy context aggregating! 🚀
