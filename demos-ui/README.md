# Demos UI - Unified Interface for 7 Demos

Single React + TypeScript application serving all demo endpoints through one unified UI.



## Structure

```
demos-ui/
├── frontend/           # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx    # Main UI with 7 demo tabs
│   │   └── App.module.css
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── backend/            # Express.js unified backend
│   ├── src/
│   │   └── server-unified.ts  # All demo endpoints
│   ├── dist/          # Compiled TypeScript
│   ├── tsconfig.json
│   └── package.json
├── .env               # Environment variables
├── CONSOLIDATION-NOTES.md  # Demo 02+08 merge details
└── README.md          # This file
```

## Quick Start

### 1. Install Dependencies

```powershell
# Backend
cd demos-ui/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Azure credentials:

```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_DEPLOYMENT_VISION=gpt-4o

# Azure AI Search
AZURE_AI_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_AI_SEARCH_API_KEY=your-key
AZURE_AI_SEARCH_INDEX=kb-support

# RAG Function (for Demo 02, 08)
RAG_ENDPOINT=https://func-rag-xxx.azurewebsites.net/api/rag-search
RAG_API_KEY=your-function-key
```

### 3. Run Servers

```powershell
# Terminal 1: Backend (port 3000)
cd demos-ui/backend
npm run dev

# Terminal 2: Frontend (port 5173)
cd demos-ui/frontend
npm run dev
```

### 4. Access UI

Open http://localhost:5173 in your browser.

## Available Demos

| Demo | Endpoint | Description |
|------|----------|-------------|
| Demo 01 | `POST /api/triage` | Keyword-based triage classification |
| Demo 02 | `POST /api/simple-rag` | Basic RAG search with **optional image upload** (GPT-4 Vision) + streaming |
| Demo 03 | `POST /api/agent-tools` | Function calling patterns |
| Demo 06 | `POST /api/agentic-search` | Query planning + parallel search |
| Demo 07 | `POST /api/multi-agent` | Multi-agent orchestration |

**Note:** Demo 02 supports optional image upload for multi-modal RAG. Upload a screenshot, diagram, or photo to get GPT-4 Vision analysis combined with knowledge base search.

## Development

### Backend

```powershell
cd demos-ui/backend

# Build TypeScript
npm run build

# Start server
npm start

# Dev mode (rebuild + start)
npm run dev
```

### Frontend

```powershell
cd demos-ui/frontend

# Dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

**Frontend (React + Vite):**
- Single-page application with tab navigation
- Fluent UI v9 components
- TypeScript for type safety
- Real-time demo switching without page reload

**Backend (Express.js):**
- RESTful API endpoints for all demos
- CORS enabled for local development
- Environment variable configuration
- Unified error handling

**Communication:**
- Frontend calls backend API endpoints
- Backend orchestrates Azure OpenAI, AI Search, RAG functions
- Responses formatted for UI display

## Key Features

### Demo 02: Streaming RAG
- Toggle between streaming and non-streaming responses
- Server-Sent Events (SSE) for real-time token delivery
- Confidence scoring and passage display

### Demo 02: Multi-Modal RAG
- Drag-and-drop image upload
- GPT-4 Vision analysis
- Knowledge base citations with [1], [2] markers
- Clickable citations to full passages

## Troubleshooting

**Port conflicts:**
```powershell
# Kill processes on port 3000 or 5173
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
```

**Environment variables not loaded:**
- Ensure `.env` file exists in `demos-ui/` directory
- Restart backend server after changing `.env`

**CORS errors:**
- Backend must be running on port 3000
- Frontend must be running on port 5173
- Check CORS configuration in `server-unified.ts`

## Migration Notes

This unified UI replaces the previous structure where each demo had its own UI. Benefits:

- ✅ Single codebase for all demos
- ✅ Consistent UI/UX across demos
- ✅ Shared components and styling
- ✅ Easier maintenance and updates
- ✅ Better development workflow

**Old structure:** `demos/06-agentic-retrieval/` (contained unified UI)  
**New structure:** `demos-ui/` (dedicated unified UI folder)

Individual demo folders (01-08) now focus on their core logic without UI concerns.
