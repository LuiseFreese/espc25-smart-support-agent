"""
Test Demo 01: Triage Prompt Flow
Tests the LLM-based classification without full Prompt Flow CLI
"""
import os
import json
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Setup Azure OpenAI client with managed identity
credential = DefaultAzureCredential()
token_provider = get_bearer_token_provider(
    credential, 
    "https://cognitiveservices.azure.com/.default"
)

client = AzureOpenAI(
    azure_ad_token_provider=token_provider,
    api_version="2024-08-01-preview",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

# System prompt (from system.jinja2)
SYSTEM_PROMPT = """You are an IT support ticket classifier. Your task is to analyze incoming support tickets and classify them into appropriate categories and priority levels.

Return ONLY valid JSON with exactly these keys:
- "category": one of ["Billing", "Technical", "Account", "Access"]
- "priority": one of ["High", "Medium", "Low"]

Classification rules:
- **Technical**: Hardware issues, software bugs, VPN, connectivity, performance problems
- **Billing**: Payment issues, refunds, invoice questions, subscription changes
- **Account**: Password resets, profile updates, account settings
- **Access**: Permission requests, role changes, resource access

Priority rules:
- **High**: Outages, security issues, data loss, blocking work for multiple users
- **Medium**: Degraded performance, individual user blocked, workaround available
- **Low**: Feature requests, questions, minor inconveniences

Respond with JSON only. No explanations or additional text."""

# Test cases
test_cases = [
    {
        "ticket_text": "My VPN disconnects every 5 minutes",
        "expected_category": "Technical",
        "expected_priority": "Medium"
    },
    {
        "ticket_text": "I can't reset my password, account is locked",
        "expected_category": "Account",
        "expected_priority": "High"
    },
    {
        "ticket_text": "I was charged twice for my subscription this month",
        "expected_category": "Billing",
        "expected_priority": "Medium"
    },
    {
        "ticket_text": "Need access to the Finance shared folder",
        "expected_category": "Access",
        "expected_priority": "Medium"
    },
    {
        "ticket_text": "URGENT: Entire office lost internet connection",
        "expected_category": "Technical",
        "expected_priority": "High"
    }
]

print("\n" + "="*60)
print("Demo 01: Triage Prompt Flow Validation")
print("="*60 + "\n")

results = []
for i, test in enumerate(test_cases, 1):
    print(f"Test {i}: {test['ticket_text'][:50]}...")
    
    try:
        response = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Classify this support ticket:\n\nTicket:\n{test['ticket_text']}\n\nRespond with JSON only containing \"category\" and \"priority\" fields."}
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=200
        )
        
        result = json.loads(response.choices[0].message.content)
        
        category_match = result["category"] == test["expected_category"]
        priority_match = result["priority"] == test["expected_priority"]
        
        status = "✅" if (category_match and priority_match) else "⚠️"
        
        print(f"  Result: {result['category']} / {result['priority']}")
        print(f"  Expected: {test['expected_category']} / {test['expected_priority']}")
        print(f"  Status: {status} {'PASS' if (category_match and priority_match) else 'PARTIAL' if category_match else 'FAIL'}\n")
        
        results.append({
            "test": test["ticket_text"][:50],
            "category": result["category"],
            "priority": result["priority"],
            "category_match": category_match,
            "priority_match": priority_match,
            "status": status
        })
        
    except Exception as e:
        print(f"  ❌ FAILED: {str(e)}\n")
        results.append({
            "test": test["ticket_text"][:50],
            "category": "ERROR",
            "priority": "ERROR",
            "category_match": False,
            "priority_match": False,
            "status": "❌"
        })

# Summary
print("\n" + "="*60)
print("Test Results Summary")
print("="*60 + "\n")

total = len(results)
category_correct = sum(1 for r in results if r["category_match"])
priority_correct = sum(1 for r in results if r["priority_match"])
fully_correct = sum(1 for r in results if r["category_match"] and r["priority_match"])

print(f"Total Tests: {total}")
print(f"Category Accuracy: {category_correct}/{total} ({category_correct/total*100:.0f}%)")
print(f"Priority Accuracy: {priority_correct}/{total} ({priority_correct/total*100:.0f}%)")
print(f"Fully Correct: {fully_correct}/{total} ({fully_correct/total*100:.0f}%)")
print()

# Print table
print("Detailed Results:")
print("-" * 80)
for r in results:
    print(f"{r['status']} {r['test'][:40]:<40} | {r['category']:<10} | {r['priority']:<8}")
print("-" * 80)
