# File Search Tool - Configuration Notes

## Overview
The `file_search` tool is a GA cloud-based vector grounding feature in Azure AI Foundry.  
It allows you to upload curated documents (PDFs, markdown, text) to a vector store, which the agent can query.

## When to Use File Search vs Azure AI Search

| Feature           | File Search                         | Azure AI Search (enterpriseSearch)            |
| ----------------- | ----------------------------------- | --------------------------------------------- |
| **Purpose**       | Curated, small-scale grounding      | Enterprise-wide knowledge base                |
| **Data Source**   | Uploaded files (via Foundry portal) | Existing Azure AI Search index                |
| **Use Case**      | FAQs, policies, internal docs       | Product documentation, troubleshooting guides |
| **Configuration** | `vectorStore: auto`                 | OpenAPI spec with endpoint                    |
| **Maintenance**   | Manual file uploads                 | Automated ingestion pipeline                  |

## Setup Instructions

1. **Navigate to Azure AI Foundry portal**
   - Go to your AI Project
   - Select "Vector Stores" from the left menu

2. **Create a Vector Store**
   - Click "New Vector Store"
   - Name it: `support-agent-files`
   - Upload your curated documents:
     - `refund-policy.md`
     - `vpn-faq.md`
     - `billing-guidelines.pdf`
     - etc.

3. **Configure in Agent YAML**
   ```yaml
   - type: file_search
     name: fileSearch
     description: Cloud vector grounding store for FAQs and policy documents
     config:
       vectorStore: auto  # Auto-discovers your project's vector store
   ```

4. **Test in Playground**
   - Ask: "What is our refund policy?"
   - The agent will call `fileSearch` tool
   - Review the trace to see retrieved chunks

## Best Practices

- **Keep files focused**: Upload only curated, authoritative documents
- **Use Azure AI Search for scale**: If you have 100+ documents, use the `enterpriseSearch` tool instead
- **Complement, don't duplicate**: File Search is for quick reference; Azure AI Search is for comprehensive retrieval
- **Monitor traces**: Check which tool the agent chooses for each query

## Example Documents to Upload

Create these files in your vector store:

### refund-policy.md
```markdown
# Refund Policy

Customers can request refunds within 30 days of purchase.
To initiate a refund:
1. Email support@contoso.com
2. Include order number and reason
3. Refunds processed within 5-7 business days
```

### vpn-faq.md
```markdown
# VPN Frequently Asked Questions

**Q: Why does my VPN disconnect?**  
A: Common causes include network switching, firewall rules, or session timeouts.

**Q: How do I reconnect?**  
A: Click the VPN icon and select "Connect". If issues persist, restart the VPN client.
```

## Troubleshooting

- **Agent not using file_search**: Check your vector store has documents and is linked to the project
- **Low-quality answers**: Upload more specific documents or use better prompts in agent instructions
- **Tool not appearing**: Ensure `vectorStore: auto` is set and the Foundry extension is updated
