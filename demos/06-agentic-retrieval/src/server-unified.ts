import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';

// Demo 06 imports
import { planQueries } from './queryPlanning.js';
import { runSearchFanout } from './searchFanout.js';
import { mergeResults } from './mergeResults.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Serve Fluent UI version by default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve unified demos page (Demo 02 + 06 + 07)
app.get('/unified', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/unified.html'));
});

// Demo 02: Simple RAG endpoint
app.post('/api/simple-rag', async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            res.status(400).json({ error: 'Question is required' });
            return;
        }

        // Call the deployed RAG function or use local implementation
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
            body: JSON.stringify({ question }),
        });

        if (!response.ok) {
            throw new Error(`RAG endpoint returned ${response.status}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Simple RAG error:', error);
        res.status(500).json({
            error: 'Failed to process simple RAG search',
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
            reasoning: result.reasoning
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

        // Spawn Demo 03 agent as a child process
        const demo03Path = path.join(__dirname, '../../03-agent-with-tools/agent');

        // Use 'node dist/call-agent.js' with the question as argument
        const childProcess = spawn('node', ['dist/call-agent.js', question], {
            cwd: demo03Path,
            shell: true,
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
                res.status(500).json({
                    error: 'Agent execution failed',
                    details: errorOutput || output,
                    code,
                    rawOutput: output
                });
                return;
            }

            // Extract final answer (capture everything after "✅ Assistant:" until end or [TELEMETRY])
            const answerMatch = output.match(/✅ Assistant:\s*([\s\S]+?)(?=\n\[TELEMETRY\]|$)/);
            const answer = answerMatch ? answerMatch[1].trim() : 'Agent completed successfully';

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
                rawOutput: output // Include for debugging
            });
        });

        childProcess.on('error', (error) => {
            console.error('[Demo 03] Spawn error:', error);
            res.status(500).json({
                error: 'Failed to start agent process',
                details: error.message
            });
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

        // Step 1: Plan queries
        const queries = await planQueries(question);
        res.write(JSON.stringify({ type: 'queries', data: queries }) + '\n');

        // Step 2: Run parallel search
        const passages = await runSearchFanout(queries);
        res.write(JSON.stringify({ type: 'passages', data: passages }) + '\n');

        // Step 3: Merge results
        const answer = await mergeResults(question, passages);
        res.write(JSON.stringify({ type: 'answer', data: answer }) + '\n');

        res.end();

    } catch (error) {
        console.error('Agentic search error:', error);
        res.status(500).json({
            error: 'Failed to process agentic search',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

// Demo 07: Multi-Agent Orchestration endpoint
// Calls Demo 07 CLI and parses the response
app.post('/api/multi-agent', async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            res.status(400).json({ error: 'Question is required' });
            return;
        }

        // Call Demo 07 via child process
        const demo07Path = path.join(__dirname, '../../07-multi-agent-orchestration');

        const child = spawn('npm', ['run', 'dev', '--', question], {
            cwd: demo07Path,
            shell: true
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('close', (code) => {
            if (code !== 0) {
                res.status(500).json({
                    error: 'Multi-agent process failed',
                    details: errorOutput
                });
                return;
            }

            // Parse the output to extract structured data
            const triageMatch = output.match(/Type: (\w+)/);
            const reasonMatch = output.match(/Reason: (.+)/);
            const categoryMatch = output.match(/Category: (\w+)/);
            const agentsMatch = output.match(/Agents called: (.+)/);
            const responseMatch = output.match(/Response:\n([\s\S]+)\n━━━━/);
            const ticketMatch = output.match(/Ticket ID: (TKT-[\w-]+)/);

            res.json({
                triage: {
                    type: triageMatch ? triageMatch[1] : 'UNKNOWN',
                    category: categoryMatch ? categoryMatch[1] : undefined,
                    reason: reasonMatch ? reasonMatch[1] : ''
                },
                agents: agentsMatch ? agentsMatch[1].split(' → ') : [],
                finalResponse: responseMatch ? responseMatch[1].trim() : output,
                ticketId: ticketMatch ? ticketMatch[1] : undefined,
                rawOutput: output
            });
        });

    } catch (error) {
        console.error('Multi-agent error:', error);
        res.status(500).json({
            error: 'Failed to process multi-agent request',
            details: error instanceof Error ? error.message : String(error)
        });
    });
});

// Streaming RAG endpoint (Demo 02 feature)
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
                    temperature: 0.3,
                    max_tokens: 800,
                    stream: true, // Enable streaming
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
    try {
        const { question } = req.body;
        const imageFile = req.file;

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
    );        if (!visionResponse.ok) {
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
                    kbContext = ragData.passages || [];
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
    console.log(`Multi-Modal RAG (Demo 02): POST /api/multimodal-rag`);
    console.log(`Agent Tools (Demo 03): POST /api/agent-tools`);
    console.log(`Agentic Retrieval (Demo 06): POST /api/agentic-search`);
    console.log(`Multi-Agent (Demo 07): POST /api/multi-agent`);
    console.log(`Streaming RAG (Demo 02 Toggle): POST /api/streaming-rag`);

});
