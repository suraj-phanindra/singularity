# Singularity

> All your AI context in one place - A cross-platform AI memory layer

Singularity is a Chromium browser extension that aggregates user context across different AI chat platforms (Claude, ChatGPT, Gemini, Perplexity) and automatically injects relevant context into conversations.

## How It Works

When you mention preferences or information in one AI chat (e.g., "I prefer vegetarian food" in Claude), Singularity:
1. Extracts and stores this context locally
2. Automatically injects it into future conversations with other AI agents
3. Makes every AI interaction more personalized and context-aware

**Example:**
- Chat with Claude: "I prefer vegetarian food"
- Later, ask ChatGPT: "Give me protein-rich recipes"
- ChatGPT receives context: "User prefers vegetarian food"
- Result: You get vegetarian protein-rich recipes without re-explaining

## Architecture

### Components

1. **Browser Extension** (Chromium Manifest v3)
   - React-based popup UI
   - Content scripts for each AI platform
   - Background service worker
   - IndexedDB for local storage

2. **Python Backend** (FastAPI + LlamaIndex)
   - Context extraction using Claude Sonnet 4
   - Semantic search with Voyage AI embeddings
   - LlamaIndex workflows for intelligent processing

3. **Privacy-First**
   - All data stored locally (IndexedDB)
   - Backend runs on localhost
   - No external data transmission

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Chromium-based browser (Chrome, Edge, Brave)
- Anthropic API key
- Voyage AI API key

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your API keys:
#   ANTHROPIC_API_KEY=your_key_here
#   VOYAGE_API_KEY=your_key_here

# Run the backend
python run.py
```

The backend will start at `http://localhost:8000`

### 2. Extension Setup

```bash
cd extension

# Install dependencies
npm install

# Build the extension
npm run build
```

### 3. Load Extension in Browser

1. Open Chrome/Edge and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension/dist` folder
5. The Singularity extension should now be loaded

### 4. Verify Setup

1. Click the Singularity extension icon
2. Check that "Backend Status" shows "Connected"
3. Visit Claude.ai or ChatGPT
4. Open browser console (F12) and look for "[Singularity]" logs

## Development

### Running in Development Mode

**Backend (with auto-reload):**
```bash
cd backend
python run.py
```

**Extension (with hot-reload):**
```bash
cd extension
npm run dev
```

After building, reload the extension in `chrome://extensions/`

### Project Structure

```
singularity/
├── extension/              # Browser extension
│   ├── src/
│   │   ├── popup/         # React UI
│   │   ├── content/       # Platform content scripts
│   │   ├── background/    # Service worker
│   │   └── utils/         # Shared utilities
│   ├── manifest.json
│   └── package.json
│
├── backend/               # Python FastAPI backend
│   ├── app/
│   │   ├── agents/       # LlamaIndex workflows
│   │   ├── api/          # FastAPI routes
│   │   └── models/       # Data models
│   ├── main.py
│   └── requirements.txt
│
├── README.md
├── PRD.md                 # Product requirements
└── CLAUDE.md             # Claude Code guidance
```

## Supported Platforms

- ✅ Claude.ai (Anthropic)
- ✅ ChatGPT (OpenAI)
- ✅ Gemini (Google)
- 🚧 Perplexity (Coming soon)

## How to Use

1. **Enable the extension** - Click the popup and ensure it's toggled on
2. **Browse normally** - Chat with your favorite AI platforms
3. **Context is automatic** - Singularity extracts and injects context seamlessly
4. **View your data** - Click the extension icon to see stored facts
5. **Clear anytime** - Use "Clear All Data" to reset

## Privacy & Security

- **Local-first**: All data stored in your browser's IndexedDB
- **No cloud sync**: Data never leaves your machine
- **API calls**: Only to Anthropic and Voyage AI for processing
- **Transparent**: View all stored facts in the popup
- **Control**: Clear your data anytime

## Troubleshooting

### Backend won't start
- Check that API keys are set in `.env`
- Verify Python virtual environment is activated
- Check port 8000 is not already in use

### Extension shows "Backend Offline"
- Ensure backend is running (`python run.py`)
- Check http://localhost:8000/health in browser
- Verify CORS is properly configured

### Context not being injected
- Check browser console for errors
- Ensure extension is enabled
- Verify content script is loaded (look for "[Singularity]" logs)
- Platform selectors may have changed - see content script files

## Roadmap

- [ ] Add Perplexity support
- [ ] Implement Neo4j graph database (currently using IndexedDB)
- [ ] Add context editing/management UI
- [ ] Export/import context data
- [ ] Privacy filters and controls
- [ ] Cross-device sync (optional, encrypted)

## License

MIT

## Contributing

This is currently a personal project. Issues and PRs welcome!
