import axios from 'axios';
import { TriageResult, RAGResult } from '../models/Ticket';

export class AIService {
  private triageEndpoint: string;
  private triageApiKey: string;
  private ragEndpoint: string;
  private ragApiKey: string;

  constructor() {
    this.triageEndpoint = process.env.TRIAGE_ENDPOINT || '';
    this.triageApiKey = process.env.TRIAGE_API_KEY || '';
    this.ragEndpoint = process.env.RAG_ENDPOINT || '';
    this.ragApiKey = process.env.RAG_API_KEY || '';
  }

  async triageTicket(emailBody: string): Promise<TriageResult> {
    // If no triage endpoint configured, use keyword-based fallback
    if (!this.triageEndpoint) {
      return this.keywordBasedTriage(emailBody);
    }

    try {
      const response = await axios.post(this.triageEndpoint, {
        ticket_text: emailBody
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.triageApiKey}`
        },
        timeout: 30000
      });

      // Parse JSON string if needed (promptflow returns JSON as string)
      const result = typeof response.data.result === 'string'
        ? JSON.parse(response.data.result)
        : response.data;

      return {
        category: result.category || 'Other',
        priority: result.priority || 'Medium'
      };
    } catch (error) {
      console.error('Triage failed, using fallback:', error);
      return this.keywordBasedTriage(emailBody);
    }
  }

  // Public method for direct keyword-based triage
  async performTriage(emailBody: string): Promise<TriageResult> {
    return this.keywordBasedTriage(emailBody);
  }

  private keywordBasedTriage(emailBody: string): TriageResult {
    const text = emailBody.toLowerCase();

    // Category detection
    let category = 'Other';
    if (text.includes('password') || text.includes('login') || text.includes('access') || text.includes('cant sign in')) {
      category = 'Access';
    } else if (text.includes('vpn') || text.includes('network') || text.includes('connection') || text.includes('disconnect')) {
      category = 'Network';
    } else if (text.includes('billing') || text.includes('charge') || text.includes('payment') || text.includes('invoice')) {
      category = 'Billing';
    } else if (text.includes('software') || text.includes('application') || text.includes('program') || text.includes('app')) {
      category = 'Software';
    }

    // Priority detection
    let priority = 'Medium';
    if (text.includes('urgent') || text.includes('critical') || text.includes('asap') || text.includes('emergency') || text.includes('down')) {
      priority = 'High';
    } else if (text.includes('low priority') || text.includes('when you can') || text.includes('no rush')) {
      priority = 'Low';
    }

    return { category, priority };
  }

  async searchKnowledgeBase(question: string): Promise<RAGResult> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add API key if configured
      if (this.ragApiKey) {
        headers['x-functions-key'] = this.ragApiKey;
      }

      const response = await axios.post(this.ragEndpoint, {
        question: question  // RAG function expects 'question' not 'query'
      }, {
        headers,
        timeout: 90000  // Increased to 90s for RAG search
      });

      return {
        answer: response.data.answer || 'We have received your request and will respond shortly.',
        confidence: response.data.confidence || 0.5,
        sources: response.data.sources || []
      };
    } catch (error) {
      console.error('RAG search failed:', error);
      return {
        answer: 'We have received your support request and will respond shortly.',
        confidence: 0.3,
        sources: []
      };
    }
  }
}

