"""Test Demo 02 - RAG Search without requiring ingestion"""
import os
from dotenv import load_dotenv
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

# Load environment
load_dotenv()

# Initialize OpenAI client with Managed Identity / Azure CLI auth
credential = DefaultAzureCredential()
token_provider = get_bearer_token_provider(credential, "https://cognitiveservices.azure.com/.default")

client = AzureOpenAI(
    azure_ad_token_provider=token_provider,
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

# Read KB documents directly
kb_docs = []
kb_files = [
    ("demos/02-rag-search/content/password-reset.md", "Password Reset Guide"),
    ("demos/02-rag-search/content/vpn-troubleshooting.md", "VPN Troubleshooting"),
    ("demos/02-rag-search/content/billing-guide.md", "Billing Guide")
]

print(f"\n{'='*70}")
print(f"Demo 02 - RAG Search Test (Simulated)")
print(f"{'='*70}\n")

for filepath, title in kb_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        kb_docs.append({"title": title, "content": content})

# Test questions
test_questions = [
    "How do I reset my password?",
    "VPN keeps disconnecting, what should I do?",
    "Where can I see my billing history?"
]

for i, question in enumerate(test_questions, 1):
    print(f"\n[{i}/{len(test_questions)}] Question: {question}")
    print("-" * 70)

    # Build context from KB documents
    context_parts = []
    for idx, doc in enumerate(kb_docs, 1):
        context_parts.append(f"[{idx}] {doc['content'][:500]}...\nSource: {doc['title']}")

    context = "\n\n".join(context_parts)

    # Create prompt
    prompt = f"""You are a helpful IT support assistant. Answer the question using ONLY the provided context.

Question: {question}

Context passages:
{context}

Answer concisely and cite sources using [1], [2], etc."""

    try:
        response = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT"),
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=300,
            timeout=30
        )

        answer = response.choices[0].message.content
        print(f"✓ Answer: {answer}\n")
    except Exception as e:
        print(f"✗ Error: {str(e)[:100]}\n")

print(f"{'='*70}")
print(f"RAG Search Testing Complete!")
print(f"{'='*70}\n")
