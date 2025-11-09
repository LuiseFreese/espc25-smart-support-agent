"""Test Demo 01 with multiple ticket scenarios"""
import os
from dotenv import load_dotenv
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
import json

# Load environment variables
load_dotenv()

# Initialize Azure OpenAI client with Managed Identity / Azure CLI auth
credential = DefaultAzureCredential()
token_provider = get_bearer_token_provider(credential, "https://cognitiveservices.azure.com/.default")

client = AzureOpenAI(
    azure_ad_token_provider=token_provider,
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

# Read prompts
with open("demos/01-triage-promptflow/prompts/system.jinja2", "r") as f:
    system_prompt = f.read()

with open("demos/01-triage-promptflow/prompts/classify.jinja2", "r") as f:
    classify_template = f.read()

# Test tickets
test_tickets = [
    "VPN disconnects every 5 minutes",
    "My password expired and I cannot login",
    "Server is down and all employees cannot access the database",
    "How do I submit an expense report?",
    "Laptop keyboard keys are sticky",
    "Critical security breach detected in production"
]

print(f"\n{'='*70}")
print(f"Testing Demo 01 - Triage Flow with Multiple Tickets")
print(f"{'='*70}\n")

for i, ticket_text in enumerate(test_tickets, 1):
    print(f"\n[{i}/{len(test_tickets)}] Ticket: {ticket_text}")
    print("-" * 70)

    # Render classify prompt
    classify_prompt = classify_template.replace("{{ ticket_text }}", ticket_text)

    # Call Azure OpenAI
    try:
        response = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": classify_prompt}
            ],
            temperature=0.7,
            max_tokens=500,
            timeout=30.0
        )

        result = response.choices[0].message.content

        # Try to parse JSON
        try:
            parsed = json.loads(result)
            print(f"✓ Category: {parsed.get('category', 'N/A')}")
            print(f"✓ Priority: {parsed.get('priority', 'N/A')}")
        except:
            print(f"Result: {result}")
    except Exception as e:
        print(f"✗ Error: {str(e)}")

print(f"\n{'='*70}")
print(f"Testing Complete!")
print(f"{'='*70}\n")
