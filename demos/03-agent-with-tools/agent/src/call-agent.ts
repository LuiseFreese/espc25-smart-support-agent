import * as dotenv from 'dotenv';
import * as path from 'path';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import { AzureOpenAI } from 'openai';

// Load .env from project root (3 levels up from src/)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
const OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-1-chat';
const OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';
const FUNCTION_BASE_URL = process.env.AZURE_FUNCTION_APP_URL || 'https://func-agents-dw7z4hg4ssn2k.azurewebsites.net/api';
const USE_MANAGED_IDENTITY = process.env.USE_MANAGED_IDENTITY === 'true';

// Debug: Check if endpoint is loaded
if (!OPENAI_ENDPOINT) {
  console.error('❌ AZURE_OPENAI_ENDPOINT not found in environment variables');
  console.error('   Check .env file at:', path.join(__dirname, '../../../.env'));
  process.exit(1);
}

// Initialize Azure OpenAI client
// Priority: 1) USE_MANAGED_IDENTITY flag, 2) API key if present, 3) Managed Identity fallback
let client: AzureOpenAI;
if (USE_MANAGED_IDENTITY) {
  console.log('✓ Using Managed Identity authentication (USE_MANAGED_IDENTITY=true)');
  const credential = new DefaultAzureCredential();
  const scope = 'https://cognitiveservices.azure.com/.default';
  const azureADTokenProvider = getBearerTokenProvider(credential, scope);
  client = new AzureOpenAI({
    azureADTokenProvider,
    deployment: OPENAI_DEPLOYMENT,
    apiVersion: OPENAI_API_VERSION,
    endpoint: OPENAI_ENDPOINT,
  });
} else if (OPENAI_API_KEY) {
  console.log('✓ Using API key authentication');
  client = new AzureOpenAI({
    apiKey: OPENAI_API_KEY,
    deployment: OPENAI_DEPLOYMENT,
    apiVersion: OPENAI_API_VERSION,
    endpoint: OPENAI_ENDPOINT,
  });
} else {
  console.log('✓ Using Managed Identity authentication (no API key found)');
  const credential = new DefaultAzureCredential();
  const scope = 'https://cognitiveservices.azure.com/.default';
  const azureADTokenProvider = getBearerTokenProvider(credential, scope);
  client = new AzureOpenAI({
    azureADTokenProvider,
    deployment: OPENAI_DEPLOYMENT,
    apiVersion: OPENAI_API_VERSION,
    endpoint: OPENAI_ENDPOINT,
  });
}

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Tool definitions matching OpenAPI spec
const tools = [
  {
    type: 'function',
    function: {
      name: 'getOrderStatus',
      description: 'Get order status and tracking information for a specific order',
      parameters: {
        type: 'object',
        properties: {
          orderId: {
            type: 'string',
            description: 'The unique order identifier',
          },
        },
        required: ['orderId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createTicket',
      description: 'Create a new support ticket for a customer issue',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Short summary of the issue',
          },
          description: {
            type: 'string',
            description: 'Detailed description of the problem',
          },
          customerId: {
            type: 'string',
            description: 'Customer identifier',
          },
        },
        required: ['title', 'description', 'customerId'],
      },
    },
  },
];

// Call Azure OpenAI Chat Completions
async function callOpenAI(messages: Message[], toolChoice: any = 'auto'): Promise<any> {
  const response = await client.chat.completions.create({
    model: OPENAI_DEPLOYMENT,
    messages: messages as any,
    tools: tools as any,
    tool_choice: toolChoice,
    max_completion_tokens: 800
  });

  // Log token usage
  if (response.usage) {
    console.log(`📊 Demo 03 Agent tokens: prompt=${response.usage.prompt_tokens}, completion=${response.usage.completion_tokens}, total=${response.usage.total_tokens}`);
  }

  return response;
}

// Execute tool function
async function executeToolCall(toolCall: ToolCall): Promise<string> {
  const { name, arguments: argsStr } = toolCall.function;
  const args = JSON.parse(argsStr);

  console.log(`Executing tool: ${name}`);
  console.log(`   Arguments:`, args);

  let result: any;

  if (name === 'getOrderStatus') {
    const response = await fetch(`${FUNCTION_BASE_URL}/GetOrderStatus?orderId=${args.orderId}`);

    if (!response.ok) {
      return JSON.stringify({
        error: `Function returned ${response.status}: ${response.statusText}`,
        message: 'The order status service is currently unavailable. Please try again later.'
      });
    }

    result = await response.json();
  } else if (name === 'createTicket') {
    const response = await fetch(`${FUNCTION_BASE_URL}/CreateTicket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      return JSON.stringify({
        error: `Function returned ${response.status}: ${response.statusText}`,
        message: 'The ticket creation service is currently unavailable. Please try again later.'
      });
    }

    result = await response.json();
  } else {
    throw new Error(`Unknown tool: ${name}`);
  }

  console.log(`   Result:`, result);
  return JSON.stringify(result);
}

// Emit custom telemetry (Application Insights)
function emitTelemetry(eventName: string, properties: Record<string, any> = {}): void {
  // In production, send to Application Insights REST API
  // For demo, just log to console
  console.log(`[TELEMETRY] ${eventName}:`, properties);
}

// Main agent loop
export async function runAgent(userMessage: string): Promise<string> {
  const startTime = Date.now();

  const messages: Message[] = [
    {
      role: 'system',
      content: `You are a helpful customer service agent. Use the available tools to help customers.

IMPORTANT: When a customer mentions ANY problem, issue, or asks for help with something,
you MUST create a support ticket using the createTicket tool. Always create a ticket
for customer problems.

For order status inquiries, use the getOrderStatus tool.

Be concise and professional in your responses.`,
    },
    {
      role: 'user',
      content: userMessage,
    },
  ];

  console.log('\n💬 User:', userMessage);
  console.log('\nProcessing...\n');

  let iterations = 0;
  const MAX_ITERATIONS = 5;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await callOpenAI(messages);
    const choice = response.choices[0];
    const assistantMessage = choice.message;

    // Track token usage
    if (response.usage) {
      totalInputTokens += response.usage.prompt_tokens || 0;
      totalOutputTokens += response.usage.completion_tokens || 0;

      emitTelemetry('TokenUsage', {
        input_tokens: response.usage.prompt_tokens,
        output_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
      });
    }

    // If no tool calls, return the final answer
    if (choice.finish_reason === 'stop') {
      const duration = Date.now() - startTime;

      emitTelemetry('ResponseGenerated', {
        duration_ms: duration,
        iterations,
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        has_tool_calls: false,
      });

      console.log('✅ Assistant:', assistantMessage.content);
      
      // Output JSON for backend parsing (usage will be displayed in UI)
      const result = {
        response: assistantMessage.content,
        usage: {
          prompt: totalInputTokens,
          completion: totalOutputTokens,
          total: totalInputTokens + totalOutputTokens
        }
      };
      console.log('\n[JSON_OUTPUT]' + JSON.stringify(result) + '[/JSON_OUTPUT]');
      
      return assistantMessage.content;
    }

    // Handle tool calls
    if (choice.finish_reason === 'tool_calls' && assistantMessage.tool_calls) {
      messages.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const toolResult = await executeToolCall(toolCall);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }

      console.log('');
    } else {
      throw new Error(`Unexpected finish_reason: ${choice.finish_reason}`);
    }
  }

  throw new Error('Max iterations reached');
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const userMessage = args.join(' ') || 'Where is order 12345?';

  try {
    await runAgent(userMessage);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
