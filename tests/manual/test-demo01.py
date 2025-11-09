"""Test Demo 01 - Triage Flow"""
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

# Test ticket
ticket_text = "VPN disconnects every 5 minutes"

# Render classify prompt (simple replacement for Jinja2)
classify_prompt = classify_template.replace("{{ ticket_text }}", ticket_text)

print(f"\n{'='*60}")
print(f"Testing Demo 01 - Triage Flow")
print(f"{'='*60}\n")
print(f"Input Ticket: {ticket_text}\n")

# Call Azure OpenAI
response = client.chat.completions.create(
    model=os.getenv("AZURE_OPENAI_DEPLOYMENT"),
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": classify_prompt}
    ],
    temperature=0.7,
    max_tokens=500
)

result = response.choices[0].message.content

print(f"Classification Result:\n{result}\n")
print(f"{'='*60}\n")

# Try to parse JSON if possible
try:
    parsed = json.loads(result)
    print(f"Category: {parsed.get('category', 'N/A')}")
    print(f"Priority: {parsed.get('priority', 'N/A')}")
except:
    print("(Could not parse as JSON)")
