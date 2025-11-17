import { app } from '@azure/functions';
import { triage } from './functions/Triage';

/**
 * Triage Plugin for Copilot Studio
 * 
 * Exposes a single REST API endpoint that classifies support tickets
 * into categories and priorities using keyword-based logic.
 */
app.http('triage', {
  methods: ['POST'],
  authLevel: 'function',  // Requires function key for API access
  handler: triage
});
