"""Ingest knowledge base documents into Azure AI Search"""
import os
from dotenv import load_dotenv
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    SearchField,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    SemanticConfiguration,
    SemanticPrioritizedFields,
    SemanticField,
    SemanticSearch,
)
from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AzureOpenAI
import glob

# Load environment
load_dotenv()

# Initialize clients
search_endpoint = os.getenv("AZURE_AI_SEARCH_ENDPOINT")
search_key = os.getenv("AZURE_AI_SEARCH_API_KEY")  # Still needed for index creation (admin operation)
index_name = os.getenv("AZURE_AI_SEARCH_INDEX", "kb-support")

# Use DefaultAzureCredential for OpenAI (works locally via Azure CLI, in Azure via Managed Identity)
credential = DefaultAzureCredential()
token_provider = get_bearer_token_provider(credential, "https://cognitiveservices.azure.com/.default")

openai_client = AzureOpenAI(
    azure_ad_token_provider=token_provider,
    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

print(f"\n{'='*70}")
print(f"Demo 02 - Knowledge Base Ingestion")
print(f"{'='*70}\n")

# Create index
print("Creating search index...")
index_client = SearchIndexClient(search_endpoint, AzureKeyCredential(search_key))

fields = [
    SimpleField(name="id", type="Edm.String", key=True),
    SearchableField(name="title", type="Edm.String"),
    SearchableField(name="content", type="Edm.String"),
    SearchField(
        name="contentVector",
        type="Collection(Edm.Single)",
        searchable=True,
        vector_search_dimensions=3072,
        vector_search_profile_name="vector-profile"
    ),
]

vector_search = VectorSearch(
    algorithms=[HnswAlgorithmConfiguration(name="hnsw-config")],
    profiles=[VectorSearchProfile(name="vector-profile", algorithm_configuration_name="hnsw-config")]
)

semantic_config = SemanticConfiguration(
    name="semantic-config",
    prioritized_fields=SemanticPrioritizedFields(
        title_field=SemanticField(field_name="title"),
        content_fields=[SemanticField(field_name="content")]
    )
)

index = SearchIndex(
    name=index_name,
    fields=fields,
    vector_search=vector_search,
    semantic_search=SemanticSearch(configurations=[semantic_config])
)

try:
    result = index_client.create_or_update_index(index)
    print(f"✓ Index '{index_name}' created successfully")
except Exception as e:
    if "already exists" in str(e).lower() or "resourceexists" in str(e).lower():
        print(f"✓ Index '{index_name}' already exists, continuing...")
    else:
        print(f"Warning: {str(e)[:200]}")
        print("Attempting to continue...")

# Read and embed documents
print("\nReading knowledge base documents...")
docs_path = "demos/02-rag-search/content"
documents = []

import os
for filename in os.listdir(docs_path):
    if not filename.endswith('.md'):
        continue

    filepath = os.path.join(docs_path, filename)
    i = len(documents) + 1

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract title from first line
    lines = content.split('\n')
    title = lines[0].replace('#', '').strip() if lines else filename

    print(f"  [{i}] {filename}: {title}")

    # Generate embedding
    try:
        embedding_response = openai_client.embeddings.create(
            model=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT"),
            input=content,
            timeout=30
        )
        embedding = embedding_response.data[0].embedding

        documents.append({
            "id": filename.replace('.md', '').replace('-', '_'),
            "title": title,
            "content": content,
            "contentVector": embedding
        })
        print(f"      ✓ Embedded successfully")
    except Exception as e:
        print(f"      ✗ Error embedding: {str(e)[:100]}")

# Upload to search
if documents:
    print(f"\nUploading {len(documents)} documents to Azure AI Search...")
    search_client = SearchClient(search_endpoint, index_name, AzureKeyCredential(search_key))
    try:
        result = search_client.upload_documents(documents)
        print(f"✓ Uploaded {len(result)} documents successfully")
    except Exception as e:
        print(f"✗ Upload error: {str(e)[:200]}")
else:
    print("\n✗ No documents found to upload!")

print(f"\n{'='*70}")
print(f"Ingestion Complete! Index '{index_name}' is ready for queries.")
print(f"{'='*70}\n")
