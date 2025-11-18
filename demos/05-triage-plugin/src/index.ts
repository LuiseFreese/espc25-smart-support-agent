import { app } from '@azure/functions';
import { triage } from './functions/triage';
import { answer } from './functions/answer';

/**
 * Triage Plugin for Copilot Studio
 *
 * Exposes two REST API endpoints:
 * 1. /api/triage - Classifies support tickets (category + priority)
 * 2. /api/answer - RAG-powered KB search (answer + confidence)
 */

app.http('triage', {
  methods: ['POST'],
  authLevel: 'function',  // Requires function key for API access
  handler: triage
});

app.http('answer', {
  methods: ['POST'],
  authLevel: 'function',  // Requires function key for API access
  handler: answer
});
