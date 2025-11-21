# Demo 06: Agentic Retrieval

Advanced RAG demo using query decomposition and parallel search fanout, with a **modern Fluent UI React web interface**.

## Overview

This demo shows how to build an **agentic retrieval system** that goes beyond simple RAG:

1. **Query Planning**: LLM decomposes user question into 2-4 focused sub-queries
2. **Parallel Search**: Executes all sub-queries against Azure AI Search simultaneously
3. **Result Merging**: LLM synthesizes passages into one coherent answer with citations

This approach improves retrieval quality by:
- Breaking complex questions into simpler parts
- Searching from multiple angles
- Reducing missed information from single-query approaches

**Features a Fluent UI React web interface!** The demo includes Microsoft Fluent UI components with a unified interface that also includes Demo 07 (Multi-Agent Orchestration).

## Prerequisites

- Azure OpenAI resource with GPT-5.1-chat deployed
- Azure AI Search resource with `kb-support` index (from Demo 02)
- Node.js 20+

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Azure credentials
   ```

3. **Required environment variables:**
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT`
   - `AZURE_AI_SEARCH_ENDPOINT`
   - `AZURE_AI_SEARCH_API_KEY`
   - `AZURE_AI_SEARCH_INDEX`

## Usage

### Fluent UI React App (Recommended)

The unified Fluent UI interface provides access to both Demo 06 (Agentic Retrieval) and Demo 07 (Multi-Agent Orchestration).

**Start both servers:**
```bash
# Install dependencies first (if not done)
npm install

# Start React app + API server (runs concurrently)
npm run ui:react
```

This starts:
- **React app** with Fluent UI components at `http://localhost:5173`
- **API server** for both demos at `http://localhost:3000`

**Or run separately:**
```bash
# Terminal 1 - API Server
npm run ui:react:server

# Terminal 2 - React App  
npm run ui:react:dev
```

**Features:**
- ✨ **Real Microsoft Fluent UI components** (Tab, Button, Card, Input, Spinner)
- 🎯 **Tabbed interface** - Switch between Demo 06 and Demo 07
- 📊 **Real-time visualization** of query planning and search results
- 🔍 **Progressive display** as results stream in
- 📝 **Markdown formatting** with clickable citations
- 🎨 **Microsoft design system** styling

### Command Line

```bash
# Run with a question
npm run dev -- "How do I fix VPN disconnection issues and what MTU settings should I use?"

# Build for production
npm run build
npm start -- "Your question here"
```

## Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 AGENTIC RETRIEVAL DEMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 User question: "How do I fix VPN disconnection issues and what MTU settings should I use?"

🤔 Planning sub-queries...
✓ Generated 3 sub-queries:

   1. VPN disconnection troubleshooting steps
   2. Recommended MTU settings for VPN
   3. Network configuration for stable VPN connection

🔎 Searching knowledge base...
✓ Found 15 passages

📚 Search Results:
   [1] VPN Connection Guide
       If your VPN connection drops every few minutes...
   [2] Complete VPN Troubleshooting Guide
       Recommended MTU size is 1400 in advanced settings...
   ...

💭 Generating final answer...
✓ Answer ready

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 FINAL ANSWER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To fix VPN disconnection issues, follow these steps [1]:
1. Check your internet connection stability
2. Update your VPN client to the latest version
3. Change protocols from UDP to TCP in settings
4. Adjust MTU size to 1400 in advanced settings [2]
5. Disable power saving on your network adapter

For MTU settings specifically, set the value to 1400 [2]. This helps
avoid fragmentation issues that can cause VPN instability [3].
```

## How It Works

### 1. Query Planning (`queryPlanning.ts`)

Uses Azure OpenAI to decompose complex questions:
- Analyzes user intent
- Generates 2-4 focused sub-queries
- Keeps queries short and searchable

### 2. Search Fanout (`searchFanout.ts`)

Executes parallel searches:
- Runs all sub-queries simultaneously using `Promise.all`
- Uses semantic search for better relevance
- Returns top 5 results per query
- Deduplicates results by document ID

### 3. Result Merging (`mergeResults.ts`)

Synthesizes final answer:
- Presents passages with numbered citations
- Instructs LLM to use ONLY provided passages
- Requires inline citations [1], [2], etc.
- Low temperature (0.2) for consistency

## Integration with Other Demos

- **Demo 02**: Uses same Azure AI Search index and KB content
- **Demo 04**: Could enhance ticket creation with better context gathering
- **Demo 07**: Can be used as the RAG agent in multi-agent orchestration

## Architecture

```
User Question
     ↓
Query Planning (LLM)
     ↓
Sub-Queries [Q1, Q2, Q3, Q4]
     ↓
Parallel Search (Azure AI Search)
     ↓
Results [R1, R2, R3, ..., R15]
     ↓
Result Merging (LLM)
     ↓
Final Answer with Citations
```

## Benefits Over Simple RAG

| Aspect | Simple RAG (Demo 02) | Agentic Retrieval (Demo 06) |
|--------|---------------------|----------------------------|
| Query | Single query | 2-4 decomposed queries |
| Search | One search call | Parallel search fanout |
| Coverage | May miss context | Broader document coverage |
| Complex Qs | Struggles | Handles multi-part questions |
| Citations | Generic | Numbered, traceable |

## Cost Considerations

- **2 LLM calls** per question (planning + merging)
- **Multiple search queries** (2-4x vs simple RAG)
- Best for: Complex questions where accuracy > cost
- Use simple RAG for: Simple lookups, high volume

## Next Steps

- Add conversation history support
- Implement query result caching
- Add confidence scoring per passage
- Integrate with Demo 04 email system
