import azure.functions as func
import logging
import json
import os
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AzureOpenAI

app = func.FunctionApp()

# KB article title to filename mapping for source URLs
# Note: Titles must match what Azure AI Search returns (may differ from H1 in markdown)
KB_ARTICLE_MAPPING = {
    "Password Reset": "password-reset.md",
    "Comprehensive Password Recovery and Reset Guide": "password-recovery-detailed.md",
    "Account Access and Authentication Guide": "account-access-guide.md",
    "Account Lockout and Access Issues Resolution Guide": "account-lockout-guide.md",
    "VPN Connection Guide": "vpn-troubleshooting.md",
    "Complete VPN Connection and Troubleshooting Guide": "vpn-comprehensive-guide.md",
    "Billing and Payments": "billing-guide.md",
    "Duplicate Charges and Double Billing Resolution Guide": "duplicate-charges-guide.md",
    "Invoice Payment and Billing Updates Guide": "invoice-payment.md",
    "Email and Calendar Support": "email-and-calendar.md",
    "Software Installation and Update Guide": "software-installation-guide.md"
}

# Base URL for KB articles in GitHub
GITHUB_REPO_BASE = "https://github.com/LuiseFreese/espc25-smart-support-agent/blob/main/demos/02-rag-search/content"

def get_source_url(title: str) -> str:
    """Map KB article title to GitHub URL"""
    filename = KB_ARTICLE_MAPPING.get(title)
    if filename:
        return f"{GITHUB_REPO_BASE}/{filename}"
    return ""  # Return empty string instead of None for OpenAPI 2.0 compatibility

# Initialize clients
search_endpoint = os.getenv("AZURE_AI_SEARCH_ENDPOINT")
search_key = os.getenv("AZURE_AI_SEARCH_API_KEY")
index_name = os.getenv("AZURE_AI_SEARCH_INDEX", "kb-support")
openai_api_key = os.getenv("AZURE_OPENAI_API_KEY")

# Use API key if provided, otherwise fall back to Managed Identity
if openai_api_key:
    openai_client = AzureOpenAI(
        api_key=openai_api_key,
        api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
    )
else:
    credential = DefaultAzureCredential()
    token_provider = get_bearer_token_provider(credential, "https://cognitiveservices.azure.com/.default")
    openai_client = AzureOpenAI(
        azure_ad_token_provider=token_provider,
        api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
    )

search_client = SearchClient(
    search_endpoint,
    index_name,
    AzureKeyCredential(search_key)
)

@app.route(route="rag-search", auth_level=func.AuthLevel.FUNCTION)
def rag_search(req: func.HttpRequest) -> func.HttpResponse:
    """RAG Search endpoint"""
    logging.info('Python HTTP trigger function processed a request.')

    try:
        req_body = req.get_json()
        question = req_body.get('question')

        if not question:
            return func.HttpResponse(
                json.dumps({"error": "Missing 'question' in request body"}),
                mimetype="application/json",
                status_code=400
            )

        logging.info(f"Processing question: {question}")

        # Generate embedding for the question
        embedding_deployment = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-large")
        embedding_response = openai_client.embeddings.create(
            input=question,
            model=embedding_deployment
        )
        question_embedding = embedding_response.data[0].embedding
        logging.info(f"Generated embedding with {len(question_embedding)} dimensions")

        # Perform semantic search with vector + text hybrid
        # Note: Using both vector and semantic together
        results = search_client.search(
            search_text=question,
            vector_queries=[{
                "kind": "vector",
                "vector": question_embedding,
                "fields": "contentVector",
                "k": 50  # Increased for better RRF fusion
            }],
            query_type="semantic",  # SEMANTIC RANKING ENABLED
            semantic_configuration_name="semantic-config",
            top=50,
            select=["title", "content"]  # Don't include @ fields in select
        )

        # Extract results
        contexts = []
        sources = []
        scores = []

        logging.info("━━━━━━━━━ SEARCH RESULTS DEBUG ━━━━━━━━━")

        for result in results:
            # Debug: log result type and all available keys
            logging.info(f"\nResult type: {type(result)}")
            logging.info(f"All result keys: {list(result.keys())}")
            logging.info(f"Result object attributes: {dir(result)}")
            logging.info(f"Result type: {type(result)}")
            logging.info(f"All result keys: {list(result.keys())}")

            contexts.append({
                "title": result.get("title", ""),
                "content": result.get("content", "")
            })
            sources.append(result.get("title", "Unknown"))

            # Get semantic reranker score (SDK uses underscore, not camelCase!)
            # Method 1: Dict-style access - CORRECT KEY with underscore
            reranker_score = result.get("@search.reranker_score")
            # Method 2: Attribute-style access (alternative)
            if reranker_score is None:
                reranker_score = getattr(result, 'reranker_score', None)

            hybrid_score = result.get("@search.score", 0)

            logging.info(f"Document: '{result.get('title')}'")
            logging.info(f"  @search.reranker_score: {reranker_score}")
            logging.info(f"  @search.score: {hybrid_score}")

            # Prioritize semantic reranker score if available
            if reranker_score is not None and reranker_score > 0:
                scores.append(("semantic", reranker_score))
                logging.info(f"  ✅ Using SEMANTIC score: {reranker_score}")
            else:
                scores.append(("hybrid", hybrid_score))
                logging.info(f"  ⚠️ Using HYBRID score: {hybrid_score}")

        logging.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

        if not contexts:
            return func.HttpResponse(
                json.dumps({
                    "answer": "I couldn't find relevant information in the knowledge base.",
                    "confidence": 0.1,
                    "sources": []
                }),
                mimetype="application/json",
                status_code=200
            )

        # Build context for LLM
        context_text = "\n\n".join([
            f"**{ctx['title']}**\n{ctx['content']}"
            for ctx in contexts[:3]  # Top 3 results
        ])

        # Generate answer using GPT
        chat_deployment = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o-mini")
        chat_response = openai_client.chat.completions.create(
            model=chat_deployment,
            messages=[
                {
                    "role": "system",
                    "content": f"""You are a helpful IT support assistant. Use the knowledge base context below to answer questions.

Context from knowledge base:
{context_text}

Answer concisely based on the context above. If the context doesn't contain the answer, say so."""
                },
                {
                    "role": "user",
                    "content": question
                }
            ],
            temperature=0.3,
            max_tokens=500
        )

        answer = chat_response.choices[0].message.content

        # Calculate confidence with proper thresholding for semantic vs hybrid scores
        if scores:
            # Separate semantic and hybrid scores
            semantic_scores = [score for score_type, score in scores if score_type == "semantic"]
            hybrid_scores = [score for score_type, score in scores if score_type == "hybrid"]

            logging.info(f"Semantic scores: {semantic_scores}")
            logging.info(f"Hybrid scores: {hybrid_scores}")

            if semantic_scores:
                # We have semantic reranker scores (0-4 range)
                best = max(semantic_scores)
                logging.info(f"Best semantic score: {best}")

                # Map 0-4 range into confidence bands
                if best >= 3.5:
                    confidence = 0.9
                elif best >= 3.0:
                    confidence = 0.8
                elif best >= 2.0:
                    confidence = 0.6
                elif best >= 1.0:
                    confidence = 0.4
                else:
                    confidence = 0.2
            else:
                # Only BM25/hybrid scores (typical range: 0.01-0.05)
                # Do NOT treat them as normalized 0-1 values!
                best = max(hybrid_scores) if hybrid_scores else 0.0
                logging.info(f"Best hybrid score: {best}")

                # Use thresholding based on actual BM25 score ranges
                if best >= 0.1:
                    confidence = 0.7
                elif best >= 0.03:
                    confidence = 0.5
                elif best > 0:
                    confidence = 0.3
                else:
                    confidence = 0.1
        else:
            confidence = 0.1

        logging.info(f"Final confidence: {confidence}")

        # Get URL for primary source
        primary_source = sources[0] if sources else None
        source_url = get_source_url(primary_source) if primary_source else ""

        return func.HttpResponse(
            json.dumps({
                "answer": answer,
                "confidence": round(confidence, 2),
                "sources": list(set(sources[:5])),
                "sourceUrl": source_url
            }),
            mimetype="application/json",
            status_code=200
        )

    except Exception as e:
        logging.error(f"Error in RAG search: {str(e)}", exc_info=True)
        return func.HttpResponse(
            json.dumps({"error": f"Internal server error: {str(e)}"}),
            mimetype="application/json",
            status_code=500
        )
