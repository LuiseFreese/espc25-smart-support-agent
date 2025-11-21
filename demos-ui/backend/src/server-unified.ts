import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';

// Get __dirname first (needed for path.join below)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from multiple .env files
dotenv.config(); // Load from demos-ui/backend/.env
dotenv.config({ path: path.join(__dirname, '../../../demos/07-multi-agent-orchestration/.env') }); // Load Demo 07 .env

// Demo 06 imports
import { planQueries } from './queryPlanning.js';
import { runSearchFanout } from './searchFanout.js';
import { mergeResults } from './mergeResults.js';

// Demo 07 imports (optional - only works when running locally with full repo)
let runMultiAgentOrchestrator: any = null;

// Async initialization for Demo 07
(async () => {
    try {
        const demo07Module = await import('../../../demos/07-multi-agent-orchestration/dist/index.js');
        runMultiAgentOrchestrator = demo07Module.runMultiAgentOrchestrator;
        console.log('✅ Demo 07 multi-agent orchestration loaded');
    } catch (error) {
        console.log('⚠️  Demo 07 not available (this is normal in cloud deployment)');
    }
})();

// Simple rate limiter to prevent quota exhaustion
const requestTimestamps: number[] = [];
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 3; // Conservative: Demo 06 makes 2+ OpenAI calls per request

function checkRateLimit(): boolean {
    const now = Date.now();
    // Remove timestamps older than 1 minute
    while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW_MS) {
        requestTimestamps.shift();
    }
    // Check if under limit
    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
        return false; // Rate limit exceeded
    }
    requestTimestamps.push(now);
    return true; // OK to proceed
}

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for image uploads (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PNG and JPEG images are allowed'));
        }
    },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Optional upload middleware - only processes multipart requests
const optionalUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.is('multipart/form-data')) {
        upload.single('image')(req, res, next);
    } else {
        next();
    }
};

// Serve Fluent UI version by default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve unified demos page (Demo 02 + 06 + 07)
app.get('/unified', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/unified.html'));
});

// Demo 02: Simple RAG endpoint
// Demo 02: Simple RAG with optional image upload (multi-modal)
app.post('/api/simple-rag', optionalUpload, async (req, res) => {
    try {
        // Rate limit check
        if (!checkRateLimit()) {
            res.status(429).json({ 
                error: 'Rate limit exceeded. Please wait a minute before trying again.',
                hint: 'You are hitting the Azure OpenAI quota limit. Wait 60 seconds or request a quota increase.'
            });
            return;
        }
        // Handle both JSON and multipart requests
        let question: string;
        const imageFile = req.file;

        // If multipart (with or without image), question is in req.body
        // If JSON, parse from body
        if (req.is('multipart/form-data')) {
            question = req.body.question;
        } else {
            question = req.body.question;
        }

        if (!question) {
            res.status(400).json({ error: 'Question is required' });
            return;
        }

        let visualAnalysis = null;
        let baseConfidence = 0.5;

        // If image provided, analyze it first with GPT-4 Vision
        if (imageFile) {
            console.log('🖼️ Image uploaded:', imageFile.originalname, `(${imageFile.size} bytes)`);
            
            const visionDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_VISION || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-1-chat';
            const base64Image = imageFile.buffer.toString('base64');
            const dataUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

            const visionResponse = await fetch(
                `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${visionDeployment}/chat/completions?api-version=2024-02-15-preview`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': process.env.AZURE_OPENAI_API_KEY || '',
                    },
                    body: JSON.stringify({
                        messages: [
                            {
                                role: 'system',
                                content: 'You are an image analyzer for an IT support system. Extract key information: what error code/message is shown? What UI elements are visible? What actions were being performed? Keep descriptions factual and concise - DO NOT provide troubleshooting advice yet.'
                            },
                            {
                                role: 'user',
                                content: [
                                    { type: 'text', text: `Describe what you see in this image related to: ${question}` },
                                    { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } }
                                ]
                            }
                        ],
                        max_completion_tokens: 300
                    }),
                }
            );

            if (!visionResponse.ok) {
                throw new Error(`Vision API error: ${await visionResponse.text()}`);
            }

            const visionData = await visionResponse.json();
            visualAnalysis = visionData.choices[0].message.content;
            
            // Log token usage
            if (visionData.usage) {
                console.log(`📊 Vision API tokens: prompt=${visionData.usage.prompt_tokens}, completion=${visionData.usage.completion_tokens}, total=${visionData.usage.total_tokens}`);
            }
            
            console.log('👁️ Vision analysis completed');
            baseConfidence = 0.75; // Higher base confidence with visual context
        }

        // Call the RAG endpoint with the question (or visual analysis)
        const searchQuery = visualAnalysis ? `${question} ${visualAnalysis.substring(0, 200)}` : question;
        const ragEndpoint = process.env.RAG_ENDPOINT || 'http://localhost:7071/api/rag-search';
        const ragApiKey = process.env.RAG_API_KEY;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (ragApiKey) {
            headers['x-functions-key'] = ragApiKey;
        }

        const response = await fetch(ragEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({ question: searchQuery }),
        });

        if (!response.ok) {
            throw new Error(`RAG endpoint returned ${response.status}`);
        }

        const data = await response.json();
        
        // Add visual insights if image was analyzed
        if (visualAnalysis) {
            data.visualInsights = visualAnalysis;
            data.confidence = Math.min(0.95, (data.confidence || baseConfidence) + 0.15);
        }

        res.json(data);

    } catch (error) {
        console.error('Simple RAG error:', error);
        res.status(500).json({
            error: 'Failed to process RAG search',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

// Demo 01: AI Triage endpoint
app.post('/api/triage', async (req, res) => {
    try {
        const { ticketText } = req.body;

        if (!ticketText) {
            res.status(400).json({ error: 'Ticket text is required' });
            return;
        }

        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-1-chat';

        if (!endpoint) {
            throw new Error('AZURE_OPENAI_ENDPOINT not configured');
        }

        const systemPrompt = `You are a support ticket classifier. Analyze the ticket and classify it into ONE category and assign a priority.

Categories:
- Access: Login, password, account issues
- Network: VPN, connectivity, internet problems
- Billing: Charges, invoices, payments
- Software: Application issues, installation
- Other: Everything else

Priorities:
- High: Urgent, critical, emergency, system down
- Medium: Normal issues
- Low: Non-urgent, when you can

Respond ONLY with valid JSON in this exact format:
{"category": "Network", "priority": "Medium", "reasoning": "Brief explanation"}`;

        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-08-01-preview`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (apiKey) {
            headers['api-key'] = apiKey;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: ticketText }
                ],
                max_completion_tokens: 200
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Azure OpenAI returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error('No response from Azure OpenAI');
        }

        // Parse JSON response
        const result = JSON.parse(content.trim());

        res.json({
            category: result.category,
            priority: result.priority,
            reasoning: result.reasoning,
            usage: {
                prompt: data.usage?.prompt_tokens || 0,
                completion: data.usage?.completion_tokens || 0,
                total: data.usage?.total_tokens || 0
            }
        });

    } catch (error) {
        console.error('Triage error:', error);
        res.status(500).json({
            error: 'Failed to classify ticket',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

// Demo 03: Agent with Tools endpoint
app.post('/api/agent-tools', async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            res.status(400).json({ error: 'Question is required' });
            return;
        }

        console.log(`[Demo 03] Running agent with question: "${question}"`);

        // Check if Demo 03 is available (requires full repository context)
        const demo03Path = path.join(__dirname, '../../../demos/03-agent-with-tools/agent');
        const scriptPath = path.join(demo03Path, 'dist', 'call-agent.js');
        
        // Check if script exists
        const fs = await import('fs');
        if (!fs.existsSync(scriptPath)) {
            console.log('⚠️  Demo 03 not available in this deployment');
            res.status(503).json({
                error: 'Demo 03 (Agent with Tools) is not available in this deployment',
                hint: 'This demo requires the full repository context and runs best locally. Try running "npm run dev" in demos-ui/backend locally.'
            });
            return;
        }

        // Spawn Demo 03 agent as a child process
        const nodeExe = `"${process.execPath}"`;
        const quotedScriptPath = `"${scriptPath}"`;
        const childProcess = spawn(nodeExe, [quotedScriptPath, question], {
            cwd: demo03Path,
            shell: true
        });

        let output = '';
        let errorOutput = '';
        const toolCalls: Array<{ name: string; arguments: any; result: any }> = [];
        let currentTool: { name: string; arguments?: any; result?: any } | null = null;

        childProcess.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('[Demo 03 Output]', text);

            // Parse tool execution from output
            const toolMatch = text.match(/🔧 Executing tool: (\w+)/);
            if (toolMatch) {
                // Save previous tool if exists
                if (currentTool && currentTool.name && currentTool.arguments && currentTool.result) {
                    toolCalls.push({
                        name: currentTool.name,
                        arguments: currentTool.arguments,
                        result: currentTool.result
                    });
                }
                // Start new tool
                currentTool = { name: toolMatch[1] };
            }

            // Extract arguments (look for JSON-like structure after "Arguments:")
            const argsMatch = text.match(/Arguments:\s*({[^}]*}|\[[^\]]*\]|.*?)(?=\n|$)/);
            if (argsMatch && currentTool) {
                try {
                    currentTool.arguments = JSON.parse(argsMatch[1].trim());
                } catch {
                    currentTool.arguments = argsMatch[1].trim();
                }
            }

            // Extract result (look for JSON-like structure or text after "Result:")
            const resultMatch = text.match(/Result:\s*({[^}]*}|\[[^\]]*\]|.*?)(?=\n|$)/);
            if (resultMatch && currentTool) {
                try {
                    currentTool.result = JSON.parse(resultMatch[1].trim());
                } catch {
                    currentTool.result = resultMatch[1].trim();
                }
            }
        });

        childProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error('[Demo 03 Error]', data.toString());
        });

        childProcess.on('close', (code) => {
            console.log(`[Demo 03] Process exited with code ${code}`);

            // Save last tool if exists
            if (currentTool && currentTool.name && currentTool.arguments && currentTool.result) {
                toolCalls.push({
                    name: currentTool.name,
                    arguments: currentTool.arguments,
                    result: currentTool.result
                });
            }

            if (code !== 0) {
                if (!res.headersSent) {
                    res.status(500).json({
                        error: 'Agent execution failed',
                        details: errorOutput || output,
                        code,
                        rawOutput: output
                    });
                }
                return;
            }

            // Extract final answer (capture everything after "✅ Assistant:" until end or [TELEMETRY])
            const answerMatch = output.match(/✅ Assistant:\s*([\s\S]+?)(?=\n\[📊 Total usage|\n\[JSON_OUTPUT\]|\n\[TELEMETRY\]|$)/);
            const answer = answerMatch ? answerMatch[1].trim() : 'Agent completed successfully';

            // Extract usage from JSON output
            const jsonMatch = output.match(/\[JSON_OUTPUT\](.+?)\[\/JSON_OUTPUT\]/);
            let usage: { prompt: number; completion: number; total: number } | undefined;
            
            if (jsonMatch) {
                try {
                    const jsonData = JSON.parse(jsonMatch[1]);
                    if (jsonData.usage) {
                        usage = jsonData.usage;
                        console.log(`[Demo 03] Extracted usage: prompt=${usage!.prompt}, completion=${usage!.completion}, total=${usage!.total}`);
                    }
                } catch (error) {
                    console.error('[Demo 03] Failed to parse JSON output:', error);
                }
            }

            // Extract user message
            const userMatch = output.match(/💬 User:\s*(.+?)(?=\n|$)/);
            const userMessage = userMatch ? userMatch[1].trim() : question;

            const conversationFlow = [
                { role: 'user', content: userMessage },
                { role: 'assistant', content: answer }
            ];

            console.log(`[Demo 03] Sending response with ${toolCalls.length} tool calls`);

            res.json({
                answer,
                toolCalls,
                conversationFlow,
                usage,
                rawOutput: output // Include for debugging
            });
        });

        childProcess.on('error', (error) => {
            console.error('[Demo 03] Spawn error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Failed to start agent process',
                    details: error.message
                });
            }
        });

    } catch (error) {
        console.error('Agent tools error:', error);
        res.status(500).json({
            error: 'Failed to execute agent with tools',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

// Demo 06: Agentic Retrieval endpoint
app.post('/api/agentic-search', async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            res.status(400).json({ error: 'Question is required' });
            return;
        }

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        console.log('[Demo 06] Starting agentic search for:', question);

        // Track total token usage
        let totalUsage = { prompt: 0, completion: 0, total: 0 };

        try {
            // Step 1: Plan queries
            const planResult = await planQueries(question);
            const queries = planResult.queries;
            totalUsage.prompt += planResult.usage.prompt;
            totalUsage.completion += planResult.usage.completion;
            totalUsage.total += planResult.usage.total;
            console.log('[Demo 06] Planned queries:', queries);
            res.write(JSON.stringify({ type: 'queries', data: queries }) + '\n');

            // Step 2: Run parallel search
            const passages = await runSearchFanout(queries);
            console.log('[Demo 06] Found passages:', passages.length);
            res.write(JSON.stringify({ type: 'passages', data: passages }) + '\n');

            // Step 3: Merge results
            const mergeResult = await mergeResults(question, passages);
            totalUsage.prompt += mergeResult.usage.prompt;
            totalUsage.completion += mergeResult.usage.completion;
            totalUsage.total += mergeResult.usage.total;
            console.log('[Demo 06] Generated answer:', mergeResult.answer.substring(0, 100) + '...');
            res.write(JSON.stringify({ type: 'answer', data: mergeResult.answer }) + '\n');
            
            // Send token usage (always, even on partial completion)
            res.write(JSON.stringify({ type: 'usage', data: totalUsage }) + '\n');

            res.end();
            console.log('[Demo 06] Completed successfully');

        } catch (innerError) {
            // Send partial token usage if we collected any
            if (totalUsage.total > 0) {
                res.write(JSON.stringify({ type: 'usage', data: totalUsage }) + '\n');
            }
            // Send error message
            res.write(JSON.stringify({ 
                type: 'error', 
                data: { 
                    message: innerError instanceof Error ? innerError.message : String(innerError),
                    hint: 'Azure OpenAI quota exhausted. Your deployment has a tokens-per-minute (TPM) limit. Wait 60+ seconds or request a quota increase in Azure Portal.'
                } 
            }) + '\n');
            res.end();
            console.error('[Demo 06] Error during processing:', innerError);
        }

    } catch (error) {
        console.error('Agentic search error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Failed to process agentic search',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
});

// Demo 07: Multi-Agent Orchestration endpoint
// Calls Demo 07 CLI and parses the response
app.post('/api/multi-agent', async (req, res) => {
    try {
        // Check if Demo 07 is available
        if (!runMultiAgentOrchestrator) {
            res.status(503).json({ 
                error: 'Demo 07 (Multi-Agent Orchestration) is not available in this deployment',
                hint: 'This demo requires the full repository context and runs best locally'
            });
            return;
        }

        const { question } = req.body;

        if (!question) {
            res.status(400).json({ error: 'Question is required' });
            return;
        }

        // Call Demo 07 orchestrator directly (no spawn - much faster!)
        console.log('[Demo 07] Running multi-agent orchestrator for:', question);
        
        const result = await runMultiAgentOrchestrator(question);
        
        console.log('[Demo 07] Completed:', {
            type: result.triage.type,
            agents: result.agents.join(' → '),
            ticketId: result.ticketId
        });

        res.json(result);

    } catch (error) {
        console.error('Multi-agent error:', error);
        res.status(500).json({
            error: 'Failed to process multi-agent request',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

// Streaming RAG endpoint (used by Demo 02 streaming toggle)
app.post('/api/streaming-rag', async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            res.status(400).json({ error: 'Question is required' });
            return;
        }

        // Set headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

        console.log(`[Streaming RAG] Question: "${question}"`);

        // Step 1: Search knowledge base (same as Demo 02)
        const ragEndpoint = process.env.RAG_ENDPOINT || 'http://localhost:7071/api/rag-search';
        const ragApiKey = process.env.RAG_API_KEY;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (ragApiKey) {
            headers['x-functions-key'] = ragApiKey;
        }

        const ragResponse = await fetch(ragEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({ question }),
        });

        if (!ragResponse.ok) {
            throw new Error(`RAG endpoint returned ${ragResponse.status}`);
        }

        const ragData = await ragResponse.json();
        const context = ragData.passages?.map((p: any) => p.content).join('\n\n') || '';

        // Step 2: Stream the answer using Azure OpenAI
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-1-chat';

        if (!endpoint || !apiKey) {
            throw new Error('Azure OpenAI credentials not configured');
        }

        const streamResponse = await fetch(
            `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-08-01-preview`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': apiKey,
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful IT support assistant. Use the provided context to answer questions accurately and concisely.',
                        },
                        {
                            role: 'user',
                            content: `Context:\n${context}\n\nQuestion: ${question}`,
                        },
                    ],
                    max_completion_tokens: 800,
                    stream: true // Enable streaming
                }),
            }
        );

        if (!streamResponse.ok) {
            throw new Error(`OpenAI API returned ${streamResponse.status}`);
        }

        // Stream the response to client
        const reader = streamResponse.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            throw new Error('No response body');
        }

        let fullAnswer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    if (data === '[DONE]') {
                        continue;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content || '';

                        if (content) {
                            fullAnswer += content;
                            // Send each token to client
                            res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }

        // Send completion signal with metadata
        res.write(`data: ${JSON.stringify({
            content: '',
            done: true,
            confidence: ragData.confidence,
            passages: ragData.passages
        })}\n\n`);

        res.end();

        console.log(`[Streaming RAG] Completed. Total length: ${fullAnswer.length} chars`);

    } catch (error) {
        console.error('Streaming RAG error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Streaming failed', done: true })}\n\n`);
        res.end();
    }
});

// Multi-Modal RAG with Vision (Demo 02 image upload feature)
app.post('/api/multimodal-rag', upload.single('image'), async (req, res) => {
    console.log('🔵 Multimodal RAG request received');
    try {
        const { question } = req.body;
        const imageFile = req.file;

        console.log('Question:', question);
        console.log('Image file:', imageFile ? `${imageFile.originalname} (${imageFile.size} bytes)` : 'NO IMAGE');

        if (!imageFile) {
            res.status(400).json({ error: 'No image provided' });
            return;
        }

        if (!question) {
            res.status(400).json({ error: 'Question is required' });
            return;
        }

        // Convert image to base64
        const base64Image = imageFile.buffer.toString('base64');
        const imageUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

        // Call Azure OpenAI with GPT-4 Vision
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        // Try vision-specific deployment first, fallback to main deployment (gpt-5-1-chat has vision)
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_VISION || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-1-chat';

        if (!endpoint || !apiKey) {
            res.status(500).json({ error: 'Azure OpenAI credentials not configured' });
            return;
        }

        console.log(`Using deployment: ${deployment} for vision analysis`);

        const visionResponse = await fetch(
            `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': apiKey,
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an IT support assistant analyzing screenshots, error messages, diagrams, and hardware photos. Provide detailed analysis and troubleshooting steps.',
                        },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: question },
                                { type: 'image_url', image_url: { url: imageUrl } },
                            ],
                        },
                    ],
                    max_completion_tokens: 800
                }),
            }
        );

        if (!visionResponse.ok) {
            const errorText = await visionResponse.text();
            console.error('Vision API error:', errorText);
            res.status(500).json({ 
                error: 'Vision analysis failed',
                details: errorText 
            });
            return;
        }

        const visionData = await visionResponse.json();
        const visualAnalysis = visionData.choices[0].message.content;

        // Optional: Enhance with RAG search based on extracted keywords
        let kbContext = null;
        let confidence = 0.75; // Default for vision-only responses
        let synthesizedAnswer = visualAnalysis;

        try {
            // Extract key terms from visual analysis for RAG search
            const ragEndpoint = process.env.RAG_ENDPOINT;
            const ragApiKey = process.env.RAG_API_KEY;

            console.log('RAG Config:', { 
                hasEndpoint: !!ragEndpoint, 
                hasApiKey: !!ragApiKey,
                endpoint: ragEndpoint ? ragEndpoint.substring(0, 30) + '...' : 'not set'
            });

            if (ragEndpoint && ragApiKey) {
                // Extract key terms from visual analysis or use the user's question
                // Try user question first (more targeted), fallback to visual analysis
                const searchQuery = question || visualAnalysis.split('.')[0];
                console.log('RAG search query:', searchQuery);
                
                const ragResponse = await fetch(ragEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-functions-key': ragApiKey,
                    },
                    body: JSON.stringify({ question: searchQuery }),
                });

                if (ragResponse.ok) {
                    const ragData = await ragResponse.json();
                    console.log('RAG response:', JSON.stringify(ragData).substring(0, 200));
                    
                    // RAG endpoint returns 'sources' array and 'answer', not 'passages'
                    // Convert sources to passage format for consistency
                    if (ragData.sources && ragData.sources.length > 0) {
                        kbContext = ragData.sources.map((source: string, index: number) => ({
                            content: source,
                            score: ragData.confidence || 0.6
                        }));
                    } else {
                        kbContext = [];
                    }
                    console.log('KB articles found:', kbContext.length);
                    
                    // If KB context found, add citations to the visual analysis
                    if (kbContext.length > 0) {
                        confidence = Math.min(0.90, confidence + 0.15);
                        
                        // Add inline citations to the answer
                        synthesizedAnswer = visualAnalysis;
                        
                        // Append citation references
                        synthesizedAnswer += '\n\n**References:**';
                        kbContext.forEach((passage: any, index: number) => {
                            const preview = passage.content.substring(0, 100).trim();
                            synthesizedAnswer += `\n[${index + 1}] ${preview}...`;
                        });
                    }
                } else {
                    const errorText = await ragResponse.text();
                    console.warn('RAG endpoint returned error:', ragResponse.status, errorText);
                }
            } else {
                console.log('RAG enhancement disabled - missing configuration');
            }
        } catch (ragError) {
            console.warn('RAG enhancement skipped:', ragError);
            // Continue without KB context
        }

        res.json({
            answer: synthesizedAnswer,
            confidence,
            visualInsights: visualAnalysis,
            kbContext: kbContext || [],
            imageSize: `${imageFile.size} bytes`,
            imageType: imageFile.mimetype,
        });
    } catch (error) {
        console.error('Multi-modal RAG error:', error);
        res.status(500).json({ 
            error: 'Failed to process image',
            details: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        endpoints: {
            triage: '/api/triage',
            simpleRag: '/api/simple-rag',
            agentTools: '/api/agent-tools',
            agenticSearch: '/api/agentic-search',
            multiAgent: '/api/multi-agent',
            streamingRag: '/api/streaming-rag',
            multimodalRag: '/api/multimodal-rag'
        }
    });
});

app.listen(PORT, () => {
    console.log(`Unified Demo Server running on http://localhost:${PORT}`);
    console.log(`AI Triage (Demo 01): POST /api/triage`);
    console.log(`Simple RAG (Demo 02): POST /api/simple-rag`);
    console.log(`Agent Tools (Demo 03): POST /api/agent-tools`);
    console.log(`Agentic Retrieval (Demo 06): POST /api/agentic-search`);
    console.log(`Multi-Agent (Demo 07): POST /api/multi-agent`);
    console.log(`Streaming RAG (Demo 02 Toggle): POST /api/streaming-rag`);
    console.log(`Multi-Modal RAG (Demo 02 Image): POST /api/multimodal-rag`);
});
