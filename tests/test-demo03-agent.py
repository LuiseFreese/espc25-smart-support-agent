"""
Test Demo 03: Agent with Tools (Function Calling)
Tests Azure OpenAI function calling with mock tool responses
"""
import os
import json
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from dotenv import load_dotenv

load_dotenv()

# Setup Azure OpenAI client
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

# Tool definitions
tools = [
    {
        "type": "function",
        "function": {
            "name": "getOrderStatus",
            "description": "Get order status and tracking information for a specific order",
            "parameters": {
                "type": "object",
                "properties": {
                    "orderId": {
                        "type": "string",
                        "description": "The unique order identifier"
                    }
                },
                "required": ["orderId"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "createTicket",
            "description": "Create a new support ticket for a customer issue",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Short summary of the issue"
                    },
                    "description": {
                        "type": "string",
                        "description": "Detailed description of the problem"
                    },
                    "customerId": {
                        "type": "string",
                        "description": "Customer identifier"
                    }
                },
                "required": ["title", "description", "customerId"]
            }
        }
    }
]

# Mock tool execution
def execute_tool(tool_call):
    name = tool_call.function.name
    args = json.loads(tool_call.function.arguments)
    
    if name == "getOrderStatus":
        # Mock order database
        orders = {
            "12345": {
                "orderId": "12345",
                "status": "In Transit",
                "eta": "2025-11-15",
                "trackingNumber": "TRK-98765-ABCD",
                "items": ["Laptop Stand", "Wireless Mouse"]
            },
            "67890": {
                "orderId": "67890",
                "status": "Delivered",
                "eta": "2025-11-10",
                "trackingNumber": "TRK-54321-WXYZ",
                "items": ["USB-C Cable", "Power Adapter"]
            }
        }
        order = orders.get(args["orderId"], {"error": "Order not found"})
        return json.dumps(order)
    
    elif name == "createTicket":
        # Mock ticket creation
        ticket_id = f"TKT-{args['customerId'][:4].upper()}-{len(args['title'])}"
        return json.dumps({
            "ticketId": ticket_id,
            "title": args["title"],
            "status": "Open",
            "message": "Ticket created successfully"
        })
    
    return json.dumps({"error": "Unknown function"})

# Test agent with function calling
test_cases = [
    {
        "query": "Where is my order 12345?",
        "expected_tool": "getOrderStatus",
        "expected_param": "12345"
    },
    {
        "query": "What's the status of order 67890?",
        "expected_tool": "getOrderStatus",
        "expected_param": "67890"
    },
    {
        "query": "I need help with my printer, it's not working. My customer ID is CUST123",
        "expected_tool": "createTicket",
        "expected_param": "CUST123"
    },
    {
        "query": "Create a ticket for network issues, customer ABC456",
        "expected_tool": "createTicket",
        "expected_param": "ABC456"
    }
]

print("\n" + "="*70)
print("Demo 03: Agent with Tools (Function Calling) Validation")
print("="*70 + "\n")

results = []

for i, test in enumerate(test_cases, 1):
    print(f"Test {i}: {test['query']}")
    
    try:
        messages = [
            {"role": "system", "content": "You are a helpful customer service agent. Use the available tools to help customers.\n\nIMPORTANT: When a customer mentions ANY problem, issue, or asks for help with something, you MUST create a support ticket using the createTicket tool. Always create a ticket for customer problems."},
            {"role": "user", "content": test["query"]}
        ]
        
        # First API call - model decides tool to use
        response = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini"),
            messages=messages,
            tools=tools,
            tool_choice="auto",
            temperature=0.0
        )
        
        message = response.choices[0].message
        
        # Check if tool was called
        if message.tool_calls:
            tool_call = message.tool_calls[0]
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments)
            
            print(f"  🔧 Tool called: {tool_name}")
            print(f"     Arguments: {tool_args}")
            
            # Execute tool
            tool_result = execute_tool(tool_call)
            print(f"     Result: {tool_result[:100]}...")
            
            # Second API call - synthesize final response
            messages.append({
                "role": "assistant",
                "content": None,
                "tool_calls": [{"id": tool_call.id, "type": "function", "function": {"name": tool_name, "arguments": json.dumps(tool_args)}}]
            })
            messages.append({
                "role": "tool",
                "content": tool_result,
                "tool_call_id": tool_call.id
            })
            
            final_response = client.chat.completions.create(
                model=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini"),
                messages=messages,
                temperature=0.7
            )
            
            final_answer = final_response.choices[0].message.content
            print(f"  💬 Final answer: {final_answer[:150]}...")
            
            # Validate
            tool_match = tool_name == test["expected_tool"]
            param_match = test["expected_param"] in str(tool_args.values())
            
            status = "✅" if (tool_match and param_match) else "⚠️"
            
            results.append({
                "query": test["query"][:50],
                "tool_called": tool_name,
                "expected_tool": test["expected_tool"],
                "tool_match": tool_match,
                "param_match": param_match,
                "status": status
            })
            
            print(f"  Status: {status} {'PASS' if (tool_match and param_match) else 'PARTIAL' if tool_match else 'FAIL'}\n")
        else:
            print(f"  ❌ No tool called - model responded directly\n")
            results.append({
                "query": test["query"][:50],
                "tool_called": "None",
                "expected_tool": test["expected_tool"],
                "tool_match": False,
                "param_match": False,
                "status": "❌"
            })
        
    except Exception as e:
        print(f"  ❌ FAILED: {str(e)}\n")
        results.append({
            "query": test["query"][:50],
            "tool_called": "ERROR",
            "expected_tool": test["expected_tool"],
            "tool_match": False,
            "param_match": False,
            "status": "❌"
        })

# Summary
print("\n" + "="*70)
print("Test Results Summary")
print("="*70 + "\n")

total = len(results)
tool_correct = sum(1 for r in results if r["tool_match"])
param_correct = sum(1 for r in results if r["param_match"])
fully_correct = sum(1 for r in results if r["tool_match"] and r["param_match"])

print(f"Total Tests: {total}")
print(f"Correct Tool Selection: {tool_correct}/{total} ({tool_correct/total*100:.0f}%)")
print(f"Correct Parameters: {param_correct}/{total} ({param_correct/total*100:.0f}%)")
print(f"Fully Correct: {fully_correct}/{total} ({fully_correct/total*100:.0f}%)")
print()

# Print table
print("Detailed Results:")
print("-" * 85)
for r in results:
    print(f"{r['status']} {r['query'][:35]:<35} | {r['tool_called']:<20} | Expected: {r['expected_tool']}")
print("-" * 85)
