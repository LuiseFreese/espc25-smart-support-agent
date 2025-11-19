# Instructions for GitHub Copilot – New Demos 06 + 07

We already have demos 01–05 in this repo (triage, RAG, agent + tools, real ticket creation, Copilot Studio integration).

Now add **two new code-first demos**:

* `demos/06-agentic-retrieval`
* `demos/07-multi-agent-orchestration`

Re-use the *existing* infrastructure, env vars, and concepts wherever possible.

---

## Demo 06 – Agentic Retrieval on Top of Azure AI Search

**Goal**

Build a small TypeScript console app that:

1. Takes a natural-language question from the command line.
2. Uses an LLM call for **query planning**: decompose the question into 2–4 focused sub-queries, using conversation history if present.
3. Runs those sub-queries in **parallel** against the same Azure AI Search index we already use in `demos/02-rag-search`.
4. Uses a second LLM call to **merge the retrieved passages** into one final answer, with simple `[1], [2], ...` citations.
5. Logs:
   * the original question
   * generated sub-queries
   * which documents/snippets were used
   * the final answer

This demo should live in: `demos/06-agentic-retrieval`.

### Tech + Dependencies

* Language: TypeScript (Node 20)
* Use the same `openai` client + env vars as other TS demos:
  * `AZURE_OPENAI_ENDPOINT`
  * `AZURE_OPENAI_API_KEY`
  * `AZURE_OPENAI_DEPLOYMENT`
* Use the same Azure AI Search setup as demo 02:
  * `AZURE_AI_SEARCH_ENDPOINT`
  * `AZURE_AI_SEARCH_API_KEY`
  * `AZURE_AI_SEARCH_INDEX`
* Dependencies in `package.json`:
  * `"openai"` (same major version as `demos/03-agent-with-tools/agent`)
  * `"@azure/search-documents"`
  * `"dotenv"`
  * `"typescript"`, `"ts-node"` for local dev

### Desired Folder + File Structure

```text
demos/06-agentic-retrieval/
  package.json
  tsconfig.json
  .env.example
  src/
    agenticRetrieval.ts
    queryPlanning.ts
    searchFanout.ts
    mergeResults.ts
  README.md
```

### High-Level Behaviour for Copilot

**Put this at top of `src/agenticRetrieval.ts`:**

```typescript
// Build a CLI demo for **agentic retrieval** on top of Azure AI Search.
// Steps:
// 1. Read a question from process.argv or stdin.
// 2. Call an LLM (Azure OpenAI) to generate 2–4 focused sub-queries from the user question.
//    - Use a small helper function in queryPlanning.ts.
//    - Return an array of strings: subQueries: string[].
// 3. For each sub-query, call Azure AI Search (same index and env vars as demos/02-rag-search).
//    - Implement this in searchFanout.ts.
//    - Use semantic search / vector search if available, return top 5 results per sub-query.
// 4. Collect results into a flat list of passages with metadata:
//    - text/content
//    - source/title
//    - subQuery index
// 5. Call the LLM again (mergeResults.ts) with:
//    - original question
//    - list of passages (with numbered IDs)
//    Ask the model to:
//    - write one concise answer using only these passages,
//    - add citations like [1], [2] based on passage IDs,
//    - ignore irrelevant passages.
// 6. Print to console:
//    - "User question: ..."
//    - "Planned sub-queries:"
//    - "Search results (top N):" with IDs + titles
//    - "Final answer:"
// 7. Handle missing config gracefully: if env vars are missing, show a helpful error message and exit with code 1.
```

### queryPlanning.ts – Instruction for Copilot

```typescript
// Implement a function `planQueries(question: string, history?: string[]): Promise<string[]>`.
// Use Azure OpenAI chat completion (via `openai` client) to:
// - take the current question and optional previous turns,
// - return 2–4 focused search queries,
// - avoid changing the meaning of the question,
// - keep queries short (max ~15 words).
// Parse the model response into an array of strings, stripping numbering / bullets.
```

### searchFanout.ts – Instruction for Copilot

```typescript
// Implement a function
//   `runSearchFanout(subQueries: string[]): Promise<SearchHit[]>`
// where SearchHit has:
//   { id: string; content: string; title?: string; url?: string; queryIndex: number }
// Use `@azure/search-documents` with env vars:
//   AZURE_AI_SEARCH_ENDPOINT, AZURE_AI_SEARCH_API_KEY, AZURE_AI_SEARCH_INDEX.
// For each sub-query:
//   - run a search with top = 5
//   - include semantic fields if available
//   - map hits into SearchHit objects with queryIndex set to the index of the sub-query.
// Run all searches in parallel with Promise.all.
```

### mergeResults.ts – Instruction for Copilot

```typescript
// Implement a function
//   `mergeResults(question: string, hits: SearchHit[]): Promise<string>`
// Use Azure OpenAI chat completion to:
//   - show the model the user question and a numbered list of passages:
//       [1] <text> (source: <title>)
//       [2] ...
//   - ask for a concise answer using ONLY those passages,
//   - require inline citations like [1], [3] referring to the passage numbers,
//   - if there is not enough information, say that explicitly.
// Return the answer as a string.
//
// Keep prompts simple and deterministic, temperature ~0.2.
```

---

## Demo 07 – Multi-Agent Orchestration (Local "Mini-Agent System")

**Goal**

Build a small TypeScript console demo that simulates a **multi-agent support system** using the logic we already have:

* **Triage Agent** – classifies the request (reuse the triage function from demo 1 / demo 5, but called from code).
* **FAQ Agent** – answers from a small hard-coded FAQ table (exact QA behaviour).
* **RAG Agent** – reuses the RAG query from demo 02 (single-query RAG is enough).
* **Ticket Agent** – calls the ticket creation function from demo 04/05 (or logs a "fake ticket" to console).
* **Orchestrator Agent** – decides which agent(s) to call in which order.

This is a **local orchestrator**: one Node process, several "agents" as classes or functions. No GUI, just console output.

Folder: `demos/07-multi-agent-orchestration`.

### Tech + Dependencies

* TypeScript (Node 20)
* Reuse the same `openai`, `@azure/search-documents`, `dotenv` dependencies as other TS demos.
* Reuse existing env vars where possible.

### Desired Folder Structure

```text
demos/07-multi-agent-orchestration/
  package.json
  tsconfig.json
  .env.example
  src/
    index.ts              # orchestrator entrypoint
    agents/
      triageAgent.ts
      faqAgent.ts
      ragAgent.ts
      ticketAgent.ts
      types.ts
  README.md
```

### index.ts – Instruction for Copilot

```typescript
// Build a CLI demo for a simple multi-agent support system.
// Components:
// - TriageAgent: classify intent (question vs incident vs other).
// - FaqAgent: answer from a small in-memory FAQ map (exact QA).
// - RagAgent: call the same RAG pipeline as demo 02 (single query to Azure AI Search + LLM).
// - TicketAgent: call the ticket creation HTTP endpoint from demo 04/05 or simulate a ticket.
// - Orchestrator: decide which agent(s) to call and combine their results.
//
// Steps at runtime:
// 1. Read a user message from process.argv or stdin.
// 2. Call TriageAgent with the message; get back something like:
//      { type: 'FAQ' | 'RAG' | 'TICKET' | 'UNKNOWN', category?: string }
// 3. Based on type:
//    - 'FAQ': call FaqAgent; if it returns an answer with confidence < 0.8, fall back to RagAgent.
//    - 'RAG': call RagAgent directly.
//    - 'TICKET': call TicketAgent (and maybe also RagAgent to draft the ticket description).
//    - 'UNKNOWN': call RagAgent and, if still unsure, print "Escalate to human".
// 4. Print a summary of the decisions:
//    - which agents were called, in order
//    - their outputs
//    - the final message shown to the user.
// 5. Keep everything synchronous from the user's perspective (await all calls).
// 6. Add basic error handling and clear console logging so this works well in a live demo.
```

### agents/types.ts – Instruction for Copilot

```typescript
// Define shared types:
// - AgentContext: minimal context (conversationId, timestamp, maybe previous messages).
// - TriageResult: { type: 'FAQ' | 'RAG' | 'TICKET' | 'UNKNOWN'; reason?: string; category?: string; }
// - AgentResponse: { text: string; confidence?: number; meta?: Record<string, unknown>; }
```

### triageAgent.ts – Instruction for Copilot

```typescript
// Export a function `runTriage(message: string): Promise<TriageResult>`.
// For now, implement a lightweight rule-based or OpenAI-based classifier:
// - If message contains words like "refund", "billing" -> type 'TICKET'.
// - If message looks like a short factual question and matches an FAQ key -> type 'FAQ'.
// - If message is long / open question -> type 'RAG'.
// - Else -> 'UNKNOWN'.
// Keep it simple and deterministic.
```

### faqAgent.ts – Instruction for Copilot

```typescript
// Implement `runFaq(message: string): Promise<AgentResponse>`.
// Use a hard-coded map<string, string> of FAQ questions to answers.
// Do a simple similarity check (lower-case, contains key phrase) to find a match.
// If matched, return the answer with confidence 1.0.
// If no match, return { text: '', confidence: 0 }.
```

### ragAgent.ts – Instruction for Copilot

```typescript
// Implement `runRag(question: string): Promise<AgentResponse>`.
// Reuse the same pattern as demos/02-rag-search, but simplified:
// - run one search against Azure AI Search with the question,
// - take top N passages,
// - ask Azure OpenAI to answer using ONLY those passages,
// - return answer and a confidence score based on how many hits were found.
// Keep env var names consistent with other RAG demo.
```

### ticketAgent.ts – Instruction for Copilot

```typescript
// Implement `runTicket(message: string): Promise<AgentResponse>`.
// Option A (preferred): call the existing ticket creation HTTP endpoint from demos/04/05.
//   - URL and auth via env vars (e.g. TICKET_API_URL, TICKET_API_KEY).
//   - Send a JSON body with the message and maybe a category.
//   - Parse response containing ticketId.
//   - Return text like "Created ticket <ticketId> for your issue.".
// Option B (fallback): simulate ticket creation by generating a random ID and logging it to console.
```

---

## Implementation Notes

### Environment Variables

Both demos should reuse existing environment variables where possible:

**From Demo 02/04:**
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT` (or `AZURE_OPENAI_CHAT_DEPLOYMENT`)
- `AZURE_AI_SEARCH_ENDPOINT`
- `AZURE_AI_SEARCH_API_KEY`
- `AZURE_AI_SEARCH_INDEX` (defaults to `kb-support`)

**Demo 07 specific:**
- `TICKET_API_URL` (e.g., `https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api/ProcessSupportEmail`)
- `TICKET_API_KEY` (function key for ticket endpoint)

### Development Commands

Each demo should have these npm scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### README.md Structure

Each demo should include:
1. **Overview** - What this demo shows
2. **Prerequisites** - Required Azure resources and env vars
3. **Setup** - `npm install`, copy `.env.example` to `.env`
4. **Usage** - How to run with example commands
5. **How It Works** - Brief explanation of the approach
6. **Integration with Other Demos** - How it relates to demos 01-05

---

**Last Updated:** November 18, 2025
