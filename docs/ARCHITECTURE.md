# System Architecture

## Overview

The Smart Support Agent system automates support ticket creation through a multi-stage pipeline that processes email requests, classifies them intelligently, searches knowledge bases for relevant information, and persists tickets with AI-generated responses.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Input Sources"
        A1[HTTP POST<br/>Email Data]
        A2[Microsoft 365<br/>Mailbox<br/><i>future</i>]
    end
    
    subgraph "Azure Function App - func-agents-*"
        B[ProcessSupportEmail<br/>Node.js/TypeScript]
        B1[AIService]
        B2[TableStorageService]
        B3[GraphService]
    end
    
    subgraph "AI Services"
        C1[Keyword Triage<br/>In-Process]
        C2[RAG Function<br/>Python/func-rag-*]
        C3[Azure OpenAI<br/>gpt-4o-mini]
        C4[Azure AI Search<br/>kb-support]
    end
    
    subgraph "Data Layer"
        D1[(Table Storage<br/>SupportTickets)]
        D2[(AI Search Index<br/>3 KB Documents)]
    end
    
    subgraph "Monitoring & Security"
        E1[Application Insights<br/>Traces & Metrics]
        E2[Key Vault<br/>Secrets]
    end
    
    A1 -->|POST JSON| B
    A2 -.->|Graph API| B3
    B3 -.->|Read Email| A2
    
    B -->|1. Classify| B1
    B1 -->|Keywords| C1
    C1 -->|Category/Priority| B1
    
    B1 -->|2. Search KB| C2
    C2 -->|Query| C4
    C4 -->|Documents| C2
    C2 -->|Generate| C3
    C3 -->|Answer| C2
    C2 -->|Response| B1
    
    B -->|3. Create Ticket| B2
    B2 -->|Write| D1
    
    C4 <-->|Index| D2
    
    B -->|Log| E1
    B1 -->|Secrets| E2
    
    style B fill:#0078d4,color:#fff
    style C1 fill:#ffb900,color:#000
    style C2 fill:#0078d4,color:#fff
    style D1 fill:#50e6ff,color:#000
    style E1 fill:#00aa00,color:#fff
```

## Component Details

### 1. Email Processing Function (`ProcessSupportEmail`)

**Technology**: Node.js 20, TypeScript, Azure Functions v4

**Responsibilities**:
- Accept email data via HTTP POST (simulation/test mode)
- Read unread emails from mailbox via Graph API (mailbox mode)
- Coordinate triage, RAG search, and storage operations
- Return ticket information and AI-generated responses

**Deployment**: `func-agents-dw7z4hg4ssn2k`

**Key Code**:
```typescript
// Supports both POST (direct) and GET (mailbox) modes
export async function ProcessSupportEmail(request, context) {
  const emailData = await request.json();
  
  // 1. Triage - classify category and priority
  const triage = await aiService.triageTicket(emailData.body);
  
  // 2. RAG Search - find relevant KB articles
  const rag = await aiService.searchKnowledgeBase(emailData.body);
  
  // 3. Create Ticket - persist to Table Storage
  const ticketId = await storageService.createTicket({
    Title: emailData.subject,
    Category: triage.category,
    Priority: triage.priority,
    AIResponse: rag.answer,
    Confidence: rag.confidence
  });
  
  return { ticketId, ...triage, ...rag };
}
```

### 2. Triage Service (Keyword-Based)

**Technology**: TypeScript (in-process)

**Classification Logic**:

```mermaid
flowchart TD
    A[Email Body Text] -->|Scan Keywords| B{Contains?}
    
    B -->|password, login,<br/>access, sign in| C[Access]
    B -->|vpn, network,<br/>connection, disconnect| D[Network]
    B -->|billing, charge,<br/>payment, invoice| E[Billing]
    B -->|software, app,<br/>program| F[Software]
    B -->|No match| G[Other]
    
    A -->|Scan Priority| H{Contains?}
    H -->|urgent, critical,<br/>asap, down| I[High]
    H -->|low priority,<br/>no rush| J[Low]
    H -->|No match| K[Medium]
    
    C --> L[Return Category]
    D --> L
    E --> L
    F --> L
    G --> L
    
    I --> M[Return Priority]
    J --> M
    K --> M
    
    style C fill:#50e6ff,color:#000
    style D fill:#50e6ff,color:#000
    style E fill:#50e6ff,color:#000
    style F fill:#50e6ff,color:#000
    style I fill:#ff6b6b,color:#fff
    style K fill:#ffd93d,color:#000
```

**Accuracy**: 100% on test scenarios (VPN → Network, Password → Access, Billing → Billing)

**Future Enhancement**: Replace with Azure OpenAI-based classification or Prompt Flow deployment

### 3. RAG Search Service

**Technology**: Python 3.11, Azure Functions

**Flow**:

```mermaid
sequenceDiagram
    participant Client as ProcessSupportEmail
    participant RAG as RAG Function
    participant Search as Azure AI Search
    participant OpenAI as Azure OpenAI
    
    Client->>RAG: POST /api/rag-search<br/>{query: "How to reset password?"}
    
    RAG->>Search: Hybrid vector search<br/>(keyword + semantic)
    Search-->>RAG: Top 3 documents<br/>[password-reset.md, ...]
    
    RAG->>OpenAI: Generate answer<br/>Context: [documents]<br/>Question: [query]
    OpenAI-->>RAG: Grounded answer
    
    RAG->>RAG: Calculate confidence<br/>(0.0-1.0)
    
    RAG-->>Client: {answer, confidence, sources}
```

**Deployment**: `func-rag-dw7z4hg4ssn2k`

**Knowledge Base**:
- `billing-guide.md` - Billing procedures and payment FAQs
- `password-reset.md` - Step-by-step password reset instructions
- `vpn-troubleshooting.md` - VPN connection diagnostics

**Index Settings**:
- Hybrid search (vector + BM25)
- Semantic ranking enabled
- Text embedding: `text-embedding-3-large` (3072 dimensions)

### 4. Table Storage Service

**Technology**: Azure Table Storage SDK

**Table Schema**: `SupportTickets`

| Field | Type | Description |
|-------|------|-------------|
| PartitionKey | String | Date (YYYYMMDD) |
| RowKey | String | Timestamp-RandomID |
| TicketID | String | TKT-YYYYMMDD-XXXXXX |
| Title | String | Email subject |
| Description | String | Email body (truncated to 5000 chars) |
| Category | String | Access, Network, Billing, Software, Other |
| Priority | String | High, Medium, Low |
| Status | String | New, AI Resolved, Needs Human Review |
| CustomerEmail | String | From address |
| AIResponse | String | Generated answer from RAG |
| Confidence | Number | 0.0-1.0 |
| CreatedAt | DateTime | Timestamp |

**Example Query**:
```powershell
az storage entity query \
  --table-name SupportTickets \
  --account-name stagentsdw7z4hg4ssn2k \
  --filter "PartitionKey eq '20251112'" \
  --select TicketID,Category,Priority
```

### 5. Microsoft Graph Integration

**Status**: ✅ Configured, ⏳ Not Yet Active

**Purpose**: Read unread emails from support mailbox

**Configuration**:
- App Registration: `f2b47ff8-c292-4231-9365-a607f2689c43`
- Required Permissions: `Mail.Read`, `Mail.ReadWrite`
- Authentication: Client credentials flow

**To Activate**:
1. Set `SUPPORT_EMAIL_ADDRESS` in function app settings
2. Grant mailbox access to service principal
3. Switch endpoint to GET mode or run on timer trigger

## Data Flow

### Complete Request Flow

```mermaid
sequenceDiagram
    autonumber
    
    participant Test as Test Script
    participant Func as ProcessSupportEmail
    participant Triage as Keyword Triage
    participant RAG as RAG Function
    participant Search as AI Search
    participant OpenAI as Azure OpenAI
    participant Storage as Table Storage
    participant Insights as App Insights
    
    Test->>Func: POST /api/processsupportemail<br/>Header: x-functions-key<br/>Body: {subject, body, from}
    
    Func->>Insights: Log: Processing started
    
    Func->>Triage: triageTicket(emailBody)
    Triage->>Triage: Scan for keywords
    Triage-->>Func: {category: "Network", priority: "Medium"}
    
    Func->>Insights: Log: Triage complete
    
    Func->>RAG: POST {query: emailBody}
    RAG->>Search: Hybrid search
    Search-->>RAG: Documents
    RAG->>OpenAI: Generate answer
    OpenAI-->>RAG: Response
    RAG-->>Func: {answer, confidence: 0.3, sources: []}
    
    Func->>Insights: Log: RAG complete
    
    Func->>Storage: createTicket(ticketData)
    Storage->>Storage: Generate RowKey
    Storage->>Storage: Write entity
    Storage-->>Func: RowKey: "1699876543210-abc123"
    
    Func->>Insights: Log: Ticket created
    
    Func-->>Test: 200 OK<br/>{ticketId: "TKT-20251112-XYZ",<br/>category, priority, suggestedResponse}
```

## Security Architecture

### Authentication & Authorization

```mermaid
graph LR
    subgraph "External Access"
        A[Test Client]
    end
    
    subgraph "Azure AD"
        B[App Registration<br/>Service Principal]
    end
    
    subgraph "Function Apps"
        C[ProcessSupportEmail<br/>authLevel: function]
        D[RAG Function<br/>authLevel: function]
    end
    
    subgraph "Azure Services"
        E[Graph API<br/>Mail.Read]
        F[Key Vault<br/>Secrets]
        G[Storage Account<br/>Tables]
        H[Azure OpenAI]
        I[AI Search]
    end
    
    A -->|x-functions-key| C
    C -->|x-functions-key| D
    C -->|Client Credentials| B
    B -->|Access Token| E
    C -->|Connection String| G
    C -->|API Key| H
    C -->|API Key| I
    C -->|Managed Identity| F
    
    style C fill:#ff6b6b,color:#fff
    style D fill:#ff6b6b,color:#fff
    style B fill:#ffb900,color:#000
```

**Security Controls**:
- Function keys required for HTTP endpoints
- Managed Identity for Key Vault access
- Connection strings stored in Key Vault
- HTTPS only
- CORS restrictions (production)

### Secrets Management

| Secret | Storage | Access Method |
|--------|---------|---------------|
| GRAPH_CLIENT_SECRET | Bicep `@secure()` | Function app settings |
| STORAGE_ACCOUNT_KEY | Bicep (auto-generated) | Function app settings |
| RAG_API_KEY | Manual configuration | Function app settings |
| AZURE_AI_SEARCH_API_KEY | Key Vault | Managed Identity |
| Function Keys | Azure Functions platform | Portal / CLI |

## Monitoring & Observability

### Application Insights Integration

```mermaid
graph TB
    subgraph "Function Execution"
        A[ProcessSupportEmail]
        B[AIService]
        C[TableStorageService]
    end
    
    subgraph "Application Insights"
        D[Traces]
        E[Exceptions]
        F[Custom Events]
        G[Dependencies]
    end
    
    subgraph "Queries"
        H[E2E Latency]
        I[Error Rate]
        J[Triage Accuracy]
        K[RAG Performance]
    end
    
    A -->|context.log| D
    B -->|context.error| E
    C -->|context.trackEvent| F
    A -->|HTTP calls| G
    
    D --> H
    E --> I
    D --> J
    G --> K
    
    style D fill:#00aa00,color:#fff
    style E fill:#ff6b6b,color:#fff
```

**Key Metrics**:
- Request duration (P50, P95, P99)
- Success rate
- Triage classification distribution
- RAG confidence scores
- Table Storage write latency

**Sample KQL Query**:
```kql
traces
| where timestamp > ago(1h)
| where operation_Name == "ProcessSupportEmail"
| project timestamp, message, severityLevel
| order by timestamp desc
```

## Deployment Architecture

### Resource Organization

```
Azure Subscription
└── rg-smart-agents-dev (Sweden Central)
    ├── oai-agents-dw7z4hg4ssn2k (OpenAI)
    ├── srch-agents-dw7z4hg4ssn2k (AI Search)
    ├── func-agents-dw7z4hg4ssn2k (Function App - Node.js)
    ├── func-rag-dw7z4hg4ssn2k (Function App - Python)
    ├── stagentsdw7z4hg4ssn2k (Storage Account)
    ├── aihub-agents-dw7z4hg4ssn2k (AI Hub)
    ├── aiproject-agents-dw7z4hg4ssn2k (AI Project)
    ├── appi-smart-agents-dw7z4hg4ssn2k (App Insights)
    ├── kv-agents-dw7z4hg4ssn2k (Key Vault)
    └── plan-agents-dw7z4hg4ssn2k (App Service Plan)
```

### Infrastructure as Code

All resources defined in Bicep:
- `infra/main.bicep` - Orchestration
- `infra/modules/*.bicep` - Individual resource modules
- `infra/parameters.dev.json` - Environment-specific values

**Key Bicep Patterns**:
```bicep
// Secure parameters
@secure()
param graphClientSecret string

// Auto-generated values
var uniqueSuffix = uniqueString(resourceGroup().id)
var functionAppName = 'func-agents-${uniqueSuffix}'

// Managed Identity assignment
identity: {
  type: 'SystemAssigned'
}
```

## Performance Characteristics

### Latency Breakdown

| Stage | Typical Duration | Notes |
|-------|------------------|-------|
| Function cold start | 3-5s | First request or after scaling |
| Function warm request | 50-100ms | Subsequent requests |
| Keyword triage | 1-2ms | In-memory regex |
| RAG search | 500-1500ms | Search + OpenAI generation |
| Table Storage write | 50-100ms | Single entity |
| **Total (warm)** | **600-1700ms** | End-to-end |
| **Total (cold)** | **3.5-6.5s** | Including cold start |

### Scalability

- **Function Apps**: Consumption plan, auto-scale to 200 instances
- **Azure OpenAI**: 120K tokens/minute quota
- **AI Search**: Standard tier, 3 replicas
- **Table Storage**: 20,000 requests/second per partition

**Partition Strategy**:
- PartitionKey = Date (YYYYMMDD)
- Ensures even distribution across days
- Supports efficient time-range queries

## References

- [Azure AI Foundry Documentation](https://learn.microsoft.com/azure/ai-studio/)
- [Azure Functions Best Practices](https://learn.microsoft.com/azure/azure-functions/functions-best-practices)
- [Azure AI Search Hybrid Search](https://learn.microsoft.com/azure/search/hybrid-search-overview)
- [Azure Table Storage Design Patterns](https://learn.microsoft.com/azure/storage/tables/table-storage-design-patterns)
