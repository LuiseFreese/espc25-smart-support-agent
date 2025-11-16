# Azure Smart Support Agent - Architecture Diagram

## System Overview - Mermaid Diagram

```mermaid
graph TB
    subgraph External["External Services"]
        Customer["👤 Customer"]
        SupportTeam["👥 Support Team"]
        GraphAPI["Microsoft Graph API<br/>support@company.com<br/>Webhooks + Email Access"]
    end

    subgraph FuncAgents["func-agents-m4ia3p7llrr4u<br/>Node.js/TypeScript"]
        GraphWebhook["GraphWebhook Function<br/>authLevel: anonymous"]
        ProcessEmail["ProcessSupportEmail Function<br/>1. Get email<br/>2. Check duplicate<br/>3. Triage<br/>4. RAG search<br/>5. Create ticket<br/>6. Auto-reply or forward<br/>7. Mark read"]
        ManageSub["ManageSubscription Function<br/>POST: Create webhook<br/>GET: Check status"]
        AIService["AIService.ts<br/>Keyword Triage<br/>RAG HTTP Client"]
        GraphService["GraphService.ts<br/>Email Read/Write<br/>Communication Services"]
        TableService["TableStorageService.ts<br/>Ticket CRUD<br/>Duplicate Check"]
    end

    subgraph FuncRAG["func-rag-m4ia3p7llrr4u<br/>Python 3.11"]
        RAGSearch["rag_search Function<br/>1. Embed question<br/>2. Semantic search<br/>3. Generate answer<br/>4. Map confidence"]
    end

    subgraph AIServices["AI Services"]
        OpenAI["Azure OpenAI<br/>oai-agents-m4ia3p7llrr4u<br/>• gpt-4o-mini<br/>• text-embedding-3-large"]
        Search["Azure AI Search<br/>srch-agents-m4ia3p7llrr4u<br/>• 11 KB documents<br/>• Semantic ranking<br/>• Hybrid search"]
    end

    subgraph DataStorage["Data & Storage"]
        Storage["Storage Account<br/>stagentsm4ia3p7llrr4u<br/>• SupportTickets table<br/>• Function app storage"]
    end

    subgraph Communication["Communication - Global"]
        CommServices["Azure Communication Services<br/>comm-agents-m4ia3p7llrr4u<br/>• Email domain linked<br/>• DoNotReply@...azurecomm.net"]
    end

    subgraph Monitoring["Monitoring & Logging"]
        AppInsights["Application Insights<br/>appi-smart-agents-m4ia3p7llrr4u<br/>• Request tracking<br/>• Dependency calls<br/>• Custom metrics"]
        LogAnalytics["Log Analytics<br/>log-smart-agents-m4ia3p7llrr4u<br/>• 30-day retention<br/>• Query workspace"]
        AlertRule["Smart Detector Alert<br/>Failure Anomalies"]
    end

    subgraph Infrastructure["Infrastructure"]
        AppPlan["App Service Plan<br/>plan-agents-m4ia3p7llrr4u<br/>• Y1 Consumption<br/>• Linux"]
        KeyVault["Key Vault<br/>kv-agents-m4ia3p7llrr4u<br/>• Future: Secret refs<br/>• RBAC configured"]
        AIHub["AI Hub<br/>aihub-agents-m4ia3p7llrr4u"]
        AIProject["AI Project<br/>aiproject-agents-m4ia3p7llrr4u"]
    end

    %% Main Flow
    Customer -->|"Email to support"| GraphAPI
    GraphAPI -->|"Webhook POST<br/>real-time"| GraphWebhook
    GraphWebhook --> ProcessEmail
    ProcessEmail --> AIService
    AIService -->|"HTTP POST<br/>x-functions-key"| RAGSearch
    RAGSearch -->|"Embed question"| OpenAI
    RAGSearch -->|"Semantic search"| Search
    RAGSearch -->|"Generate answer"| OpenAI
    RAGSearch -->|"answer + confidence"| AIService
    ProcessEmail --> GraphService
    ProcessEmail --> TableService
    TableService -->|"Create ticket"| Storage
    GraphService -->|"Get email"| GraphAPI
    GraphService -->|"Mark read"| GraphAPI
    GraphService -->|"Send reply<br/>(confidence ≥ 0.7)"| CommServices
    CommServices -->|"Auto-reply"| Customer
    GraphService -->|"Forward<br/>(confidence < 0.7)"| SupportTeam

    %% Monitoring
    FuncAgents -.->|"Telemetry"| AppInsights
    FuncRAG -.->|"Telemetry"| AppInsights
    AppInsights -->|"Ingest logs"| LogAnalytics
    AppInsights -.->|"Anomalies"| AlertRule

    %% Infrastructure
    AppPlan -.->|"Hosts"| FuncAgents
    AppPlan -.->|"Hosts"| FuncRAG
    AIHub -.->|"Parent"| AIProject

    style Customer fill:#e1f5fe
    style SupportTeam fill:#e1f5fe
    style GraphAPI fill:#fff3e0
    style FuncAgents fill:#e8f5e9
    style FuncRAG fill:#f3e5f5
    style OpenAI fill:#fff9c4
    style Search fill:#fff9c4
    style Storage fill:#fce4ec
    style CommServices fill:#e0f2f1
    style AppInsights fill:#e3f2fd
```

## Detailed Component Diagram

```mermaid
graph LR
    subgraph Resources["15 Azure Resources"]
        R1["1. Graph API<br/>(External)"]
        R2["2. func-agents<br/>Node.js"]
        R3["3. func-rag<br/>Python"]
        R4["4. Storage Account<br/>stagentsm4ia3p7llrr4u"]
        R5["5. Communication Services<br/>comm-agents-m4ia3p7llrr4u"]
        R6["6. Azure OpenAI<br/>oai-agents-m4ia3p7llrr4u"]
        R7["7. AI Search<br/>srch-agents-m4ia3p7llrr4u"]
        R8["8. App Service Plan<br/>plan-agents-m4ia3p7llrr4u"]
        R9["9. Log Analytics<br/>log-smart-agents-m4ia3p7llrr4u"]
        R10["10. App Insights<br/>appi-smart-agents-m4ia3p7llrr4u"]
        R11["11. Key Vault<br/>kv-agents-m4ia3p7llrr4u"]
        R12["12. AI Hub<br/>aihub-agents-m4ia3p7llrr4u"]
        R13["13. AI Project<br/>aiproject-agents-m4ia3p7llrr4u"]
        R14["14. Smart Detector<br/>Failure Anomalies"]
        R15["15. Email Domain<br/>AzureManagedDomain"]
    end

    R1 -->|"Webhook"| R2
    R2 -->|"HTTP"| R3
    R3 -->|"API Key"| R6
    R3 -->|"API Key"| R7
    R2 -->|"SDK"| R4
    R2 -->|"SDK"| R5
    R2 -->|"Client Creds"| R1
    R8 -.->|"Hosts"| R2
    R8 -.->|"Hosts"| R3
    R10 -->|"Logs"| R9
    R2 -.->|"Telemetry"| R10
    R3 -.->|"Telemetry"| R10
    R10 -.->|"Anomalies"| R14
    R12 -.->|"Parent"| R13
    R12 -.->|"Uses"| R11
    R12 -.->|"Uses"| R4
    R5 -->|"Uses"| R15

    style R1 fill:#fff3e0
    style R2 fill:#e8f5e9
    style R3 fill:#f3e5f5
    style R6 fill:#fff9c4
    style R7 fill:#fff9c4
```

## Data Flow Sequence

```mermaid
sequenceDiagram
    participant C as Customer
    participant G as Graph API
    participant FA as func-agents
    participant FR as func-rag
    participant AI as Azure OpenAI
    participant S as AI Search
    participant TS as Table Storage
    participant CS as Comm Services
    participant ST as Support Team

    C->>G: Send email
    G->>FA: Webhook POST (new email)
    FA->>G: Get email details
    G-->>FA: Email content
    FA->>TS: Check duplicate
    TS-->>FA: Not exists
    FA->>FA: Triage (keywords)
    FA->>FR: HTTP POST /rag-search
    FR->>AI: Embed question
    AI-->>FR: Vector embeddings
    FR->>S: Semantic search
    S-->>FR: Top 3 documents
    FR->>AI: Generate answer
    AI-->>FR: Answer text
    FR-->>FA: answer + confidence
    FA->>TS: Create ticket
    TS-->>FA: TKT-20251116-XXXXX
    alt Confidence ≥ 0.7
        FA->>CS: Send auto-reply
        CS->>C: Email response
    else Confidence < 0.7
        FA->>ST: Forward ticket
    end
    FA->>G: Mark email as read
```

## Authentication & Authorization

```mermaid
graph TB
    subgraph Auth["Authentication Methods"]
        A1["Client Credentials<br/>Graph API"]
        A2["Function Key<br/>func-rag HTTP"]
        A3["API Key<br/>OpenAI + Search"]
        A4["Connection String<br/>Storage + Comm Svc"]
        A5["Managed Identity<br/>RBAC (backup)"]
    end

    FuncAgents["func-agents"] -->|"GRAPH_CLIENT_ID<br/>GRAPH_CLIENT_SECRET<br/>GRAPH_TENANT_ID"| A1
    FuncAgents -->|"RAG_API_KEY"| A2
    FuncRAG["func-rag"] -->|"AZURE_OPENAI_API_KEY"| A3
    FuncRAG -->|"AZURE_AI_SEARCH_KEY"| A3
    FuncAgents -->|"STORAGE_ACCOUNT_KEY"| A4
    FuncAgents -->|"COMM_CONNECTION_STRING"| A4
    FuncAgents -.->|"Configured<br/>not actively used"| A5
    FuncRAG -.->|"Fallback option"| A5

    style A1 fill:#ffebee
    style A2 fill:#fff3e0
    style A3 fill:#e8f5e9
    style A4 fill:#e1f5fe
    style A5 fill:#f3e5f5
```

## Resource Dependencies

```mermaid
graph TD
    subgraph Core["Core Processing"]
        FA[func-agents<br/>Orchestration]
        FR[func-rag<br/>RAG Search]
    end

    subgraph AI["AI Services"]
        OAI[OpenAI<br/>GPT + Embeddings]
        SRCH[AI Search<br/>Knowledge Base]
    end

    subgraph Data["Data Layer"]
        STG[Storage<br/>Tickets Table]
        CS[Communication<br/>Email Sending]
    end

    subgraph Observability["Observability"]
        AI_INS[App Insights<br/>Metrics]
        LOG[Log Analytics<br/>Logs]
    end

    subgraph Infra["Infrastructure"]
        PLAN[App Service Plan<br/>Y1 Consumption]
        KV[Key Vault<br/>Future Secrets]
        HUB[AI Hub<br/>Foundry]
        PROJ[AI Project<br/>Foundry Child]
    end

    FA -->|HTTP POST| FR
    FR --> OAI
    FR --> SRCH
    FA --> STG
    FA --> CS
    PLAN -.-> FA
    PLAN -.-> FR
    FA -.-> AI_INS
    FR -.-> AI_INS
    AI_INS --> LOG
    HUB -.-> PROJ
    HUB -.-> STG
    HUB -.-> KV
    HUB -.-> AI_INS

    style FA fill:#4caf50
    style FR fill:#9c27b0
    style OAI fill:#ff9800
    style SRCH fill:#ff9800
```

---

## Resource Summary Table

| # | Resource Name | Type | Location | Purpose |
|---|---------------|------|----------|---------|
| 1 | Microsoft Graph API | External | M365 Tenant | Email webhooks + mailbox access |
| 2 | func-agents-m4ia3p7llrr4u | Function App (Node.js) | Sweden Central | Orchestration, email processing |
| 3 | func-rag-m4ia3p7llrr4u | Function App (Python) | Sweden Central | RAG search endpoint |
| 4 | stagentsm4ia3p7llrr4u | Storage Account | Sweden Central | SupportTickets table, function storage |
| 5 | comm-agents-m4ia3p7llrr4u | Communication Services | Global | Email sending (auto-replies) |
| 6 | oai-agents-m4ia3p7llrr4u | Azure OpenAI | Sweden Central | GPT-4o-mini + embeddings |
| 7 | srch-agents-m4ia3p7llrr4u | AI Search | Sweden Central | Knowledge base (11 docs) |
| 8 | plan-agents-m4ia3p7llrr4u | App Service Plan | Sweden Central | Hosts both function apps |
| 9 | log-smart-agents-m4ia3p7llrr4u | Log Analytics | Sweden Central | Centralized log storage |
| 10 | appi-smart-agents-m4ia3p7llrr4u | Application Insights | Sweden Central | Telemetry + monitoring |
| 11 | kv-agents-m4ia3p7llrr4u | Key Vault | Sweden Central | Secret storage (future) |
| 12 | aihub-agents-m4ia3p7llrr4u | AI Hub | Sweden Central | AI Foundry container |
| 13 | aiproject-agents-m4ia3p7llrr4u | AI Project | Sweden Central | Prompt flow workspace |
| 14 | Failure Anomalies | Smart Detector Alert | Global | Anomaly detection |
| 15 | AzureManagedDomain | Email Domain | Global | Communication Services domain |

---
