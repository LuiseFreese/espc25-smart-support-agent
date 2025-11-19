import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { planQueries } from './queryPlanning.js';
import { runSearchFanout } from './searchFanout.js';
import { mergeResults } from './mergeResults.js';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

// API endpoint for agentic retrieval
app.post('/api/search', async (req, res) => {
    try {
        const { question } = req.body;

        if (!question || typeof question !== 'string') {
            return res.status(400).json({
                error: 'Invalid request. Please provide a question string.'
            });
        }

        console.log(`\n🔍 Processing question: "${question}"`);

        // Step 1: Query Planning
        console.log('📝 Step 1: Query Planning...');
        const subQueries = await planQueries(question);
        console.log(`✓ Generated ${subQueries.length} sub-queries`);

        // Send sub-queries to client
        res.write(JSON.stringify({
            type: 'queries',
            data: subQueries
        }) + '\n');

        // Step 2: Search Fanout
        console.log('🔎 Step 2: Parallel Search Fanout...');
        const passages = await runSearchFanout(subQueries);
        console.log(`✓ Found ${passages.length} passages`);

        // Send passages to client
        res.write(JSON.stringify({
            type: 'passages',
            data: passages
        }) + '\n');

        // Step 3: Merge Results
        console.log('✨ Step 3: Merging Results...');
        const answer = await mergeResults(question, passages);
        console.log('✓ Generated final answer');

        // Send final answer to client
        res.write(JSON.stringify({
            type: 'answer',
            data: answer
        }) + '\n');

        res.end();

    } catch (error: any) {
        console.error('❌ Error:', error.message);

        // Send error to client
        res.status(500).json({
            type: 'error',
            error: error.message || 'An unexpected error occurred'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Agentic Retrieval UI Server running at http://localhost:${PORT}`);
    console.log(`📊 API endpoint: http://localhost:${PORT}/api/search`);
    console.log(`💚 Health check: http://localhost:${PORT}/api/health\n`);
});
