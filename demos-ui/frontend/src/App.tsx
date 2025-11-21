import { useState, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
import 'prismjs/components/prism-typescript';
import {
  Tab,
  TabList,
  makeStyles,
  shorthands,
  tokens,
  Button,
  Input,
  Card,
  CardHeader,
  Spinner,
  Text,
  Title3,
  Body1,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Checkbox,
} from '@fluentui/react-components';
import {
  Search20Regular,
  BotSparkle20Regular,
  DocumentSearch20Regular,
  Wrench20Regular,
  Grid20Regular,
  Info20Regular,
  ChevronRight20Regular,
  Image20Regular,
  ArrowUpload24Regular,
  BookInformation20Regular,
  Flowchart20Regular,
  Code20Regular,
  Target20Regular,
  Library20Regular
} from '@fluentui/react-icons';

// API Configuration - use environment variables for production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const RAG_API_BASE_URL = import.meta.env.VITE_RAG_API_BASE_URL || 'http://localhost:7071';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
    ...shorthands.padding('24px'),
    maxWidth: '1200px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('24px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    marginBottom: '16px',
  },
  headerContent: {
    flex: 1,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: '32px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  headerSubtitle: {
    fontSize: '16px',
    color: tokens.colorNeutralForeground3,
  },
  logo: {
    height: '60px',
    width: 'auto',
  },
  searchForm: {
    display: 'flex',
    ...shorthands.gap('8px'),
    ...shorthands.margin('16px', '0'),
  },
  searchInput: {
    flexGrow: 1,
  },
  exampleButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('8px'),
    ...shorthands.margin('12px', '0'),
  },
  resultCard: {
    ...shorthands.margin('16px', '0'),
  },
  section: {
    ...shorthands.margin('16px', '0'),
  },
  passage: {
    ...shorthands.padding('16px'),
    ...shorthands.borderRadius('8px'),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.margin('8px', '0'),
  },
  agentBadge: {
    display: 'inline-block',
    ...shorthands.padding('6px', '12px'),
    ...shorthands.borderRadius('12px'),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: '13px',
    fontWeight: 600,
  },
  citation: {
    color: tokens.colorBrandForeground1,
    textDecoration: 'none',
    fontWeight: 600,
  },
  infoAccordion: {
    ...shorthands.margin('12px', '0'),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius('8px'),
  },
  flowStep: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.margin('8px', '0'),
  },
  techItem: {
    display: 'flex',
    alignItems: 'flex-start',
    ...shorthands.gap('8px'),
    ...shorthands.margin('6px', '0'),
  },
  footer: {
    textAlign: 'center',
    ...shorthands.padding('24px'),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
    marginTop: '32px',
    color: tokens.colorNeutralForeground3,
    fontSize: '14px',
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('32px'),
    ...shorthands.border('2px', 'dashed', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius('8px'),
    backgroundColor: tokens.colorNeutralBackground2,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '16px',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground3,
      ...shorthands.borderColor(tokens.colorBrandStroke1),
    },
  },
  dropZoneActive: {
    ...shorthands.borderColor(tokens.colorBrandStroke1),
    backgroundColor: tokens.colorBrandBackground2,
  },
  dropZoneText: {
    marginTop: '12px',
    fontSize: '16px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
  },
  dropZoneSubtext: {
    marginTop: '4px',
    fontSize: '14px',
    color: tokens.colorNeutralForeground3,
  },
  demoSection: {
    ...shorthands.border('2px', 'solid', tokens.colorBrandBackground),
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('20px'),
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow8,
    marginBottom: '24px',
  },
  learnMoreDivider: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.margin('32px', '0', '24px', '0'),
    '::before': {
      content: '""',
      flex: 1,
      height: '1px',
      backgroundColor: tokens.colorNeutralStroke2,
      marginRight: '12px',
    },
    '::after': {
      content: '""',
      flex: 1,
      height: '1px',
      backgroundColor: tokens.colorNeutralStroke2,
      marginLeft: '12px',
    },
  },
  learnMoreLabel: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    fontSize: '14px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  educationalSection: {
    marginBottom: '16px',
  },
  educationalCardHeader: {
    fontSize: '16px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
  },
});

interface Demo01Result {
  category?: string;
  priority?: string;
  reasoning?: string;
  usage?: { prompt: number; completion: number; total: number };
}

interface Demo02Result {
  answer?: string;
  confidence?: number;
  passages?: Array<{ content: string; score: number }>;
  isStreaming?: boolean;
  visualInsights?: string;
  usage?: { prompt: number; completion: number; total: number };
}

interface Demo03Result {
  answer?: string;
  toolCalls?: Array<{
    name: string;
    arguments: string;
    result: string;
  }>;
  conversationFlow?: Array<{
    role: string;
    content: string;
  }>;
  error?: string;
  hint?: string;
  usage?: { prompt: number; completion: number; total: number };
}

interface Demo06Result {
  queries?: string[];
  passages?: Array<{ content: string; score?: number }>;
  answer?: string;
  error?: string;
  hint?: string;
  usage?: { prompt: number; completion: number; total: number };
}

interface Demo07Result {
  triage?: { type: string; category?: string; reason: string };
  agents?: string[];
  finalResponse?: string;
  ticketId?: string;
  error?: string;
  hint?: string;
  usage?: { prompt: number; completion: number; total: number };
}

export default function App() {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<'demo01' | 'demo02' | 'demo03' | 'demo06' | 'demo07'>('demo01');
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [expandedArchitecture, setExpandedArchitecture] = useState<string | null>(null);
  const [ticketText, setTicketText] = useState('');
  const [question02, setQuestion02] = useState('');
  const [selectedImage02, setSelectedImage02] = useState<File | null>(null);
  const [imagePreview02, setImagePreview02] = useState<string>('');
  const [isDragging02, setIsDragging02] = useState(false);
  const [question03, setQuestion03] = useState('');
  const [question06, setQuestion06] = useState('');
  const [question07, setQuestion07] = useState('');

  const [loading01, setLoading01] = useState(false);
  const [loading02, setLoading02] = useState(false);
  const [loading03, setLoading03] = useState(false);
  const [loading06, setLoading06] = useState(false);
  const [loading07, setLoading07] = useState(false);
  const [result01, setResult01] = useState<Demo01Result>({});
  const [result02, setResult02] = useState<Demo02Result>({});
  const [result03, setResult03] = useState<Demo03Result>({});
  const [result06, setResult06] = useState<Demo06Result>({});
  const [result07, setResult07] = useState<Demo07Result>({});

  const [expandedSnippets, setExpandedSnippets] = useState<Set<string>>(new Set());

  // Debug: Log result06 changes
  useEffect(() => {
    console.log('[Demo 06] Result state updated:', JSON.stringify(result06, null, 2));
    console.log('[Demo 06] Has usage?', !!result06.usage, 'Usage value:', result06.usage);
  }, [result06]);

  const toggleArchitecture = (id: string) => {
    setExpandedArchitecture(expandedArchitecture === id ? null : id);
  };

  const toggleSnippet = (id: string) => {
    setExpandedSnippets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Highlight code snippets when they expand
  useEffect(() => {
    Prism.highlightAll();
  }, [expandedSnippets]);

  const architectureDiagrams: Record<string, string> = {
    'demo01': '/diagrams/demo01_ai_triage.png',
    'demo02': '/diagrams/demo02_simple_rag.png',
    'demo03': '/diagrams/demo03_agent_tools.png',
    'demo06': '/diagrams/demo06_agentic_retrieval.png',
    'demo07': '/diagrams/demo07_multi_agent.png'
  };

  const handleTabChange = (tab: 'demo01' | 'demo02' | 'demo03' | 'demo06' | 'demo07') => {
    setSelectedTab(tab);
    // Clear all input fields and results when switching tabs
    setTicketText('');
    setQuestion02('');
    setSelectedImage02(null);
    setImagePreview02('');
    setQuestion03('');
    setQuestion06('');
    setQuestion07('');
    setResult01({});
    setResult02({});
    setResult03({});
    setResult06({});
    setResult07({});
  };

  const handleDemo01Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketText.trim()) return;

    setLoading01(true);
    setResult01({});

    try {
      const response = await fetch(`${API_BASE_URL}/api/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketText }),
      });

      const data = await response.json();
      setResult01(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading01(false);
    }
  };

  const handleDemo02Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question02.trim()) return;

    setLoading02(true);
    setResult02({ isStreaming: streamingEnabled, answer: '' });

    try {
      if (selectedImage02) {
        // Multi-modal mode: Image + Text
        const formData = new FormData();
        formData.append('image', selectedImage02);
        formData.append('question', question02);

        const response = await fetch(`${RAG_API_BASE_URL}/api/simple-rag`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to analyze image');
        }

        const data = await response.json();
        setResult02(data);
      } else if (streamingEnabled) {
        // Streaming mode
        const response = await fetch(`${RAG_API_BASE_URL}/api/streaming-rag`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: question02 }),
        });

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedAnswer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.done) {
                  setResult02(prev => ({
                    ...prev,
                    isStreaming: false,
                    confidence: data.confidence,
                    passages: data.passages
                  }));
                } else if (data.content) {
                  accumulatedAnswer += data.content;
                  setResult02(prev => ({
                    ...prev,
                    answer: accumulatedAnswer,
                    isStreaming: true
                  }));
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } else {
        // Non-streaming mode
        const response = await fetch(`${RAG_API_BASE_URL}/api/simple-rag`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: question02 }),
        });

        const data = await response.json();
        setResult02(data);
      }
    } catch (error) {
      console.error('Error:', error);
      setResult02({ answer: 'Error: Failed to get response', isStreaming: false });
    } finally {
      setLoading02(false);
    }
  };

  const handleDemo03Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question03.trim()) return;

    setLoading03(true);
    setResult03({});

    try {
      const response = await fetch(`${API_BASE_URL}/api/agent-tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question03 }),
      });

      // Handle 503 Service Unavailable (demo not available in cloud)
      if (response.status === 503) {
        const errorData = await response.json();
        setResult03({ 
          error: errorData.error || 'Service unavailable',
          hint: errorData.hint || 'This demo is not available in the cloud deployment.'
        });
        setLoading03(false);
        return;
      }

      const data = await response.json();
      setResult03(data);
    } catch (error) {
      console.error('Error:', error);
      setResult03({ error: 'Failed to process request', hint: String(error) });
    } finally {
      setLoading03(false);
    }
  };

  const handleDemo06Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question06.trim()) return;

    setLoading06(true);
    setResult06({});

    try {
      const response = await fetch(`${API_BASE_URL}/api/agentic-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question06 }),
      });

      // Check for rate limit error (429)
      if (response.status === 429) {
        const errorData = await response.json();
        setResult06({ 
          error: errorData.error || 'Rate limit exceeded',
          hint: errorData.hint || 'Please wait a minute before trying again.'
        });
        setLoading06(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            console.log('[Demo 06 Stream] Received message:', data.type, data.data);
            if (data.type === 'queries') {
              setResult06((prev) => ({ ...prev, queries: data.data }));
            } else if (data.type === 'passages') {
              setResult06((prev) => ({ ...prev, passages: data.data }));
            } else if (data.type === 'answer') {
              setResult06((prev) => ({ ...prev, answer: data.data }));
            } else if (data.type === 'usage') {
              console.log('[Demo 06] Setting usage state:', data.data);
              setResult06((prev) => ({ ...prev, usage: data.data }));
            } else if (data.type === 'error') {
              setResult06((prev) => ({ 
                ...prev, 
                error: data.data.message,
                hint: data.data.hint 
              }));
            }
          } catch (err) {
            console.error('Parse error:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setResult06({ 
        error: 'An error occurred while processing your request.',
        hint: 'Please try again in a moment.'
      });
    } finally {
      setLoading06(false);
    }
  };

  const handleDemo07Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question07.trim()) return;

    setLoading07(true);
    setResult07({});

    try {
      const response = await fetch(`${API_BASE_URL}/api/multi-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question07 }),
      });

      // Handle 503 Service Unavailable (demo not available in cloud)
      if (response.status === 503) {
        const errorData = await response.json();
        setResult07({ 
          error: errorData.error || 'Service unavailable',
          hint: errorData.hint || 'This demo is not available in the cloud deployment.'
        });
        setLoading07(false);
        return;
      }

      const data = await response.json();
      setResult07(data);
    } catch (error) {
      console.error('Error:', error);
      setResult07({ error: 'Failed to process request', hint: String(error) });
    } finally {
      setLoading07(false);
    }
  };

  const handleDemo02ImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processDemo02ImageFile(file);
    }
  };

  const processDemo02ImageFile = (file: File) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PNG or JPEG image');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('Image must be smaller than 20MB');
      return;
    }

    setSelectedImage02(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview02(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDemo02DragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging02(true);
  };

  const handleDemo02DragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging02(false);
  };

  const handleDemo02Drop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging02(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processDemo02ImageFile(files[0]);
    }
  };

  const handleDemo02DropZoneClick = () => {
    document.getElementById('demo02-image-upload-input')?.click();
  };

  const fillQuestion = (demo: 'demo01' | 'demo02' | 'demo03' | 'demo06' | 'demo07', text: string) => {
    if (demo === 'demo01') {
      setTicketText(text);
    } else if (demo === 'demo02') {
      setQuestion02(text);
    } else if (demo === 'demo03') {
      setQuestion03(text);
    } else if (demo === 'demo06') {
      setQuestion06(text);
    } else if (demo === 'demo07') {
      setQuestion07(text);
    }
  };

  return (
    <div className={styles.container}>
            <div className={styles.header}>
        <img src="/ESPC_logo_rgb_colour_navdock_2023.svg" alt="ESPC 25" className={styles.logo} />
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>Smart Support Agents</div>
          <div className={styles.headerSubtitle}>Powered by Azure OpenAI & AI Search</div>
        </div>
        <div style={{ width: '200px' }}></div>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={(_, data) => handleTabChange(data.value as any)}>
        <Tab icon={<Grid20Regular />} value="demo01">
          Demo 01: AI Triage
        </Tab>
        <Tab icon={<DocumentSearch20Regular />} value="demo02">
          Demo 02: Simple RAG
        </Tab>
        <Tab icon={<Wrench20Regular />} value="demo03">
          Demo 03: Agent Tools
        </Tab>
        <Tab icon={<Search20Regular />} value="demo06">
          Demo 06: Agentic Retrieval
        </Tab>
        <Tab icon={<BotSparkle20Regular />} value="demo07">
          Demo 07: Multi-Agent
        </Tab>
      </TabList>

      {selectedTab === 'demo01' && (
        <>
          <Card className={styles.demoSection}>
            <CardHeader
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target20Regular />
                  <Text weight="semibold">Try the Demo</Text>
                </div>
              }
            />

            <form onSubmit={handleDemo01Submit} className={styles.searchForm}>
              <Input
                className={styles.searchInput}
                value={ticketText}
                onChange={(e) => setTicketText(e.target.value)}
                placeholder="Describe your support issue..."
                size="large"
              />
              <Button type="submit" appearance="primary" size="large" disabled={loading01}>
                {loading01 ? <Spinner size="tiny" /> : 'Classify'}
              </Button>
            </form>

            <div className={styles.exampleButtons}>
              <Button size="small" onClick={() => fillQuestion('demo01', 'VPN disconnects every 5 minutes')}>
                VPN Issue
              </Button>
              <Button size="small" onClick={() => fillQuestion('demo01', 'I forgot my password and cannot log in')}>
                Password Reset
              </Button>
              <Button size="small" onClick={() => fillQuestion('demo01', 'I was charged twice on my last invoice')}>
                Billing Problem
              </Button>
            </div>

            {loading01 && <Spinner label="Classifying ticket..." />}

            {result01.category && (
              <div className={styles.section}>
                <div className={styles.passage}>
                  <Text weight="semibold" block>Category: {result01.category}</Text>
                  <Text weight="semibold" block>Priority: {result01.priority}</Text>
                  {result01.reasoning && (
                    <Text size={200} block style={{ marginTop: '8px' }}>
                      Reasoning: {result01.reasoning}
                    </Text>
                  )}
                </div>
              </div>
            )}

            {result01.usage && (() => {
              const inputCostPer1M = 2.50;
              const outputCostPer1M = 10.00;
              const usdToEur = 0.92;
              
              const inputCostUSD = (result01.usage.prompt / 1_000_000) * inputCostPer1M;
              const outputCostUSD = (result01.usage.completion / 1_000_000) * outputCostPer1M;
              const totalCostUSD = inputCostUSD + outputCostUSD;
              const totalCostEUR = totalCostUSD * usdToEur;
              
              return (
                <div className={styles.section} style={{ 
                  backgroundColor: '#F3F2F1', 
                  border: '1px solid #EDEBE9',
                  borderRadius: '4px',
                  padding: '12px'
                }}>
                  <Text weight="semibold" size={300}>Token Usage & Cost</Text>
                  <div style={{ display: 'flex', gap: '24px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <Text size={200}>
                        <span style={{ fontWeight: 600 }}>Prompt:</span> {result01.usage.prompt.toLocaleString()}
                      </Text>
                      <Text size={200}>
                        <span style={{ fontWeight: 600 }}>Completion:</span> {result01.usage.completion.toLocaleString()}
                      </Text>
                      <Text size={200} style={{ fontWeight: 600, color: tokens.colorBrandForeground1 }}>
                        Total: {result01.usage.total.toLocaleString()}
                      </Text>
                    </div>
                    <div style={{ borderLeft: '1px solid #EDEBE9', paddingLeft: '24px' }}>
                      <Text size={200} style={{ fontWeight: 600, color: tokens.colorPaletteDarkOrangeForeground2 }}>
                        ~€{totalCostEUR.toFixed(4)} EUR
                      </Text>
                      <Text size={100} block style={{ color: tokens.colorNeutralForeground3, marginTop: '2px' }}>
                        (${totalCostUSD.toFixed(4)} USD)
                      </Text>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>

          <div className={styles.learnMoreDivider}>
            <div className={styles.learnMoreLabel}>
              <Library20Regular />
              <span>Learn More</span>
            </div>
          </div>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo01-how')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookInformation20Regular />
                    <Text className={styles.educationalCardHeader}>How It Works</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo01-how' && (
              <div style={{ padding: '16px' }}>
                <Text weight="semibold" block style={{ marginBottom: '8px' }}>Flow:</Text>
                <div className={styles.flowStep}>
                  <Text>Ticket Text</Text>
                  <ChevronRight20Regular />
                  <Text>System Prompt + GPT-5.1-chat</Text>
                  <ChevronRight20Regular />
                  <Text>JSON Classification</Text>
                </div>

                <Text weight="semibold" block style={{ marginTop: '16px', marginBottom: '8px' }}>Technology:</Text>
                <div className={styles.techItem}>
                  <Text>• Azure OpenAI Chat Completion API</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• GPT-5.1-chat reads ticket and classifies based on system prompt</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• No embeddings - pure text reasoning</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• System prompt defines categories (Access/Network/Billing/Software) and priorities</Text>
                </div>
              </div>
            )}
          </Card>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo01-arch')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flowchart20Regular />
                    <Text className={styles.educationalCardHeader}>Architecture Diagram</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo01-arch' && (
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={architectureDiagrams['demo01']}
                  alt="Demo 01 Architecture"
                  style={{ maxWidth: '100%', width: 'auto', height: 'auto', borderRadius: '8px' }}
                />
              </div>
            )}
          </Card>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo01-code')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Code20Regular />
                    <Text className={styles.educationalCardHeader}>Implementation Code</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo01-code' && (
              <div style={{ padding: '16px' }}>
                <Card style={{ marginBottom: '12px' }}>
                  <CardHeader
                    header={
                      <Button
                        appearance="transparent"
                        onClick={() => toggleSnippet('demo01-snippet1')}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        <Text weight="semibold">Frontend: Ticket Submission</Text>
                      </Button>
                    }
                  />
                  {expandedSnippets.has('demo01-snippet1') && (
                    <div style={{ padding: '12px' }}>
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: tokens.colorNeutralForeground3 }}>
                        Handles form submission, sends ticket text to the backend API, and updates UI with classification results.
                      </Text>
                      <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code className="language-typescript">{`const handleDemo01Submit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading01(true);
  const response = await fetch('/api/triage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketText })
  });
  const data = await response.json();
  setResult01(data);
  setLoading01(false);
};`}</code>
                      </pre>
                    </div>
                  )}
                </Card>

                <Card style={{ marginBottom: '12px' }}>
                  <CardHeader
                    header={
                      <Button
                        appearance="transparent"
                        onClick={() => toggleSnippet('demo01-snippet2')}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        <Text weight="semibold">Backend: AI Classification Logic</Text>
                      </Button>
                    }
                  />
                  {expandedSnippets.has('demo01-snippet2') && (
                    <div style={{ padding: '12px' }}>
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: tokens.colorNeutralForeground3 }}>
                        Uses GPT-5.1-chat with a system prompt to classify support tickets into categories and priority levels, returning structured JSON.
                      </Text>
                      <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code className="language-typescript">{`const response = await openai.chat.completions.create({
  model: "gpt-5-1-chat",
  messages: [
    {
      role: "system",
      content: \`You are a support ticket classification system.
Categories: Access, Network, Billing, Software, Other
Priorities: Low, Medium, High
Return JSON: {"category": "...", "priority": "...", "reasoning": "..."}\`
    },
    { role: "user", content: ticketText }
  ],
  response_format: { type: "json_object" }
});`}</code>
                      </pre>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </Card>
        </>
      )}

      {selectedTab === 'demo02' && (
        <>
          <Card className={styles.demoSection}>
            <CardHeader
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target20Regular />
                  <Text weight="semibold">Try the Demo</Text>
                </div>
              }
            />

            {/* Image Upload Section */}
            <div style={{ marginBottom: '16px' }}>
              <input
                id="demo02-image-upload-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleDemo02ImageUpload}
                style={{ display: 'none' }}
              />

              {!imagePreview02 && (
                <div
                  className={`${styles.dropZone} ${isDragging02 ? styles.dropZoneActive : ''}`}
                  onDragOver={handleDemo02DragOver}
                  onDragLeave={handleDemo02DragLeave}
                  onDrop={handleDemo02Drop}
                  onClick={handleDemo02DropZoneClick}
                >
                  <ArrowUpload24Regular style={{ fontSize: '48px', color: tokens.colorBrandForeground1 }} />
                  <Text className={styles.dropZoneText}>
                    Drag and drop an image here (optional)
                  </Text>
                  <Text className={styles.dropZoneSubtext}>
                    or click to browse • PNG, JPG, JPEG • Max 20MB
                  </Text>
                </div>
              )}

              {imagePreview02 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <Text weight="semibold">Image Preview:</Text>
                    <Button
                      size="small"
                      appearance="subtle"
                      onClick={() => {
                        setSelectedImage02(null);
                        setImagePreview02('');
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                  <img
                    src={imagePreview02}
                    alt="Upload preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '400px',
                      borderRadius: '8px',
                      border: `1px solid ${tokens.colorNeutralStroke1}`,
                    }}
                  />
                </div>
              )}
            </div>

            <form onSubmit={handleDemo02Submit} className={styles.searchForm}>
              <Input
                className={styles.searchInput}
                value={question02}
                onChange={(e) => setQuestion02(e.target.value)}
                placeholder="Ask a support question..."
                size="large"
              />
              <Button type="submit" appearance="primary" size="large" disabled={loading02}>
                {loading02 ? <Spinner size="tiny" /> : 'Search'}
              </Button>
            </form>

            <div style={{ marginBottom: '12px' }}>
              <Checkbox
                checked={streamingEnabled}
                onChange={(_, data) => setStreamingEnabled(data.checked as boolean)}
                label="Enable Streaming (real-time response)"
              />
            </div>

            <div className={styles.exampleButtons}>
              <Button size="small" onClick={() => fillQuestion('demo02', 'How do I reset my password?')}>
                Password Reset
              </Button>
              <Button size="small" onClick={() => fillQuestion('demo02', 'My VPN keeps disconnecting')}>
                VPN Issues
              </Button>
              <Button size="small" onClick={() => fillQuestion('demo02', 'I was charged twice')}>
                Billing Problem
              </Button>
            </div>

            {loading02 && <Spinner label={streamingEnabled ? "Streaming response in real-time..." : "Searching knowledge base..."} />}

            {result02.answer && (
              <div className={styles.section}>
                <Text weight="semibold">
                  Answer {result02.isStreaming && <span style={{ color: '#0078D4' }}>● Streaming...</span>}
                </Text>
                {result02.confidence !== undefined && !result02.isStreaming && (
                  <Text size={200}> (Confidence: {result02.confidence.toFixed(2)})</Text>
                )}
                <div className={styles.passage}>
                  <div dangerouslySetInnerHTML={{ __html: formatMarkdown(result02.answer) }} />
                  {result02.isStreaming && (
                    <span
                      className="cursor-blink"
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '16px',
                        backgroundColor: '#0078D4',
                        marginLeft: '2px'
                      }}
                    >
                      ▌
                    </span>
                  )}
                </div>
              </div>
            )}

            {result02.visualInsights && (
              <div className={styles.section}>
                <Text weight="semibold">Visual Analysis:</Text>
                <div className={styles.passage}>
                  <div dangerouslySetInnerHTML={{ __html: formatMarkdown(result02.visualInsights) }} />
                </div>
              </div>
            )}

            {result02.usage && (() => {
              const inputCostPer1M = 2.50;
              const outputCostPer1M = 10.00;
              const usdToEur = 0.92;
              
              const inputCostUSD = (result02.usage.prompt / 1_000_000) * inputCostPer1M;
              const outputCostUSD = (result02.usage.completion / 1_000_000) * outputCostPer1M;
              const totalCostUSD = inputCostUSD + outputCostUSD;
              const totalCostEUR = totalCostUSD * usdToEur;
              
              return (
                <div className={styles.section} style={{ 
                  backgroundColor: '#F3F2F1', 
                  border: '1px solid #EDEBE9',
                  borderRadius: '4px',
                  padding: '12px'
                }}>
                  <Text weight="semibold" size={300}>Token Usage & Cost</Text>
                  <div style={{ display: 'flex', gap: '24px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <Text size={200}>
                        <span style={{ fontWeight: 600 }}>Prompt:</span> {result02.usage.prompt.toLocaleString()}
                      </Text>
                      <Text size={200}>
                        <span style={{ fontWeight: 600 }}>Completion:</span> {result02.usage.completion.toLocaleString()}
                      </Text>
                      <Text size={200} style={{ fontWeight: 600, color: tokens.colorBrandForeground1 }}>
                        Total: {result02.usage.total.toLocaleString()}
                      </Text>
                    </div>
                    <div style={{ borderLeft: '1px solid #EDEBE9', paddingLeft: '24px' }}>
                      <Text size={200} style={{ fontWeight: 600, color: tokens.colorPaletteDarkOrangeForeground2 }}>
                        ~€{totalCostEUR.toFixed(4)} EUR
                      </Text>
                      <Text size={100} block style={{ color: tokens.colorNeutralForeground3, marginTop: '2px' }}>
                        (${totalCostUSD.toFixed(4)} USD)
                      </Text>
                    </div>
                  </div>
                </div>
              );
            })()}

            {result02.passages && result02.passages.length > 0 && !result02.isStreaming && (
              <div className={styles.section}>
                <Text weight="semibold">Source Passages:</Text>
                {result02.passages.map((p, i) => (
                  <div key={i} className={styles.passage}>
                    <Text size={200}>Passage {i + 1} | Score: {p.score?.toFixed(2)}</Text>
                    <div dangerouslySetInnerHTML={{ __html: formatMarkdown(p.content) }} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className={styles.learnMoreDivider}>
            <div className={styles.learnMoreLabel}>
              <Library20Regular />
              <span>Learn More</span>
            </div>
          </div>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo02-how')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookInformation20Regular />
                    <Text className={styles.educationalCardHeader}>How It Works</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo02-how' && (
              <div style={{ padding: '16px' }}>
                <Text weight="semibold" block style={{ marginBottom: '8px' }}>Flow:</Text>
                <div className={styles.flowStep}>
                  <Text>Question {selectedImage02 && '+ Image'}</Text>
                  <ChevronRight20Regular />
                  {selectedImage02 && (
                    <>
                      <Text>GPT-4 Vision</Text>
                      <ChevronRight20Regular />
                    </>
                  )}
                  <Text>3072-dim Embedding</Text>
                  <ChevronRight20Regular />
                  <Text>Azure AI Search</Text>
                  <ChevronRight20Regular />
                  <Text>Top Passage</Text>
                  <ChevronRight20Regular />
                  <Text>GPT Answer</Text>
                </div>

                <Text weight="semibold" block style={{ marginTop: '16px', marginBottom: '8px' }}>Technology:</Text>
                {selectedImage02 && (
                  <div className={styles.techItem}>
                    <Text>• GPT-4 Vision analyzes error screenshots, diagrams, or UI issues</Text>
                  </div>
                )}
                <div className={styles.techItem}>
                  <Text>• text-embedding-3-large converts question to 3072-dimensional vector</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• Azure AI Search: Hybrid search (vector similarity + semantic ranking)</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• Top result scored (0-4 scale) → Confidence mapped to 0-1</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• GPT-5.1-chat generates natural language answer from best passage{selectedImage02 ? ' + visual insights' : ''}</Text>
                </div>
              </div>
            )}
          </Card>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo02-arch')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flowchart20Regular />
                    <Text className={styles.educationalCardHeader}>Architecture Diagram</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo02-arch' && (
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={architectureDiagrams['demo02']}
                  alt="Demo 02 Architecture"
                  style={{ maxWidth: '100%', width: 'auto', height: 'auto', borderRadius: '8px' }}
                />
              </div>
            )}
          </Card>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo02-code')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Code20Regular />
                    <Text className={styles.educationalCardHeader}>Implementation Code</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo02-code' && (
              <div style={{ padding: '16px' }}>
                <Card style={{ marginBottom: '12px' }}>
                  <CardHeader
                    header={
                      <Button
                        appearance="transparent"
                        onClick={() => toggleSnippet('demo02-snippet1')}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        <Text weight="semibold">Create Embedding from Query</Text>
                      </Button>
                    }
                  />
                  {expandedSnippets.has('demo02-snippet1') && (
                    <div style={{ padding: '12px' }}>
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: tokens.colorNeutralForeground3 }}>
                        Converts the user's question into a 3072-dimensional vector representation using Azure OpenAI's text-embedding-3-large model for semantic search.
                      </Text>
                      <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code className="language-typescript">{`const embeddingResponse = await openai.embeddings.create({
  model: "text-embedding-3-large",
  input: question,
  dimensions: 3072
});
const queryVector = embeddingResponse.data[0].embedding;`}</code>
                      </pre>
                    </div>
                  )}
                </Card>

                <Card style={{ marginBottom: '12px' }}>
                  <CardHeader
                    header={
                      <Button
                        appearance="transparent"
                        onClick={() => toggleSnippet('demo02-snippet2')}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        <Text weight="semibold">Azure AI Search: Hybrid Query</Text>
                      </Button>
                    }
                  />
                  {expandedSnippets.has('demo02-snippet2') && (
                    <div style={{ padding: '12px' }}>
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: tokens.colorNeutralForeground3 }}>
                        Performs hybrid search combining vector similarity with semantic ranking to find the top 5 most relevant knowledge base passages.
                      </Text>
                      <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code className="language-typescript">{`const searchResults = await searchClient.search(question, {
  vectorQueries: [{
    kind: "vector",
    vector: queryVector,
    kNearestNeighborsCount: 50,
    fields: ["contentVector"]
  }],
  queryType: "semantic",
  semanticConfiguration: "default",
  top: 5
});`}</code>
                      </pre>
                    </div>
                  )}
                </Card>

                <Card style={{ marginBottom: '12px' }}>
                  <CardHeader
                    header={
                      <Button
                        appearance="transparent"
                        onClick={() => toggleSnippet('demo02-snippet3')}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        <Text weight="semibold">Generate Answer from Top Result</Text>
                      </Button>
                    }
                  />
                  {expandedSnippets.has('demo02-snippet3') && (
                    <div style={{ padding: '12px' }}>
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: tokens.colorNeutralForeground3 }}>
                        Uses GPT-5.1-chat to synthesize a natural language answer based on the retrieved passage context, with optional streaming support.
                      </Text>
                      <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code className="language-typescript">{`const completion = await openai.chat.completions.create({
  model: "gpt-5-1-chat",
  messages: [
    {
      role: "system",
      content: "You are a helpful support assistant. Answer based on the context provided."
    },
    {
      role: "user",
      content: \`Context: \${topPassage}\\n\\nQuestion: \${question}\`
    }
  ],
  stream: streamingEnabled
});`}</code>
                      </pre>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </Card>
        </>
      )}

      {selectedTab === 'demo03' && (
        <>
          <Card className={styles.demoSection}>
            <CardHeader
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target20Regular />
                  <Text weight="semibold">Try the Demo</Text>
                </div>
              }
            />

            <form onSubmit={handleDemo03Submit} className={styles.searchForm}>
              <Input
                className={styles.searchInput}
                value={question03}
                onChange={(e) => setQuestion03(e.target.value)}
                placeholder="Ask a question that requires tool use..."
                size="large"
              />
              <Button type="submit" appearance="primary" size="large" disabled={loading03}>
                {loading03 ? <Spinner size="tiny" /> : 'Ask Agent'}
              </Button>
            </form>

            <div className={styles.exampleButtons}>
              <Button size="small" onClick={() => fillQuestion('demo03', 'Where is order 12345?')}>
                Check Order Status
              </Button>
              <Button size="small" onClick={() => fillQuestion('demo03', 'Create a ticket for damaged package')}>
                Create Support Ticket
              </Button>
              <Button size="small" onClick={() => fillQuestion('demo03', 'What is the status of order ABC789?')}>
                Another Order
              </Button>
            </div>

            {loading03 && <Spinner label="Agent is thinking and executing tools..." />}

            {result03.answer && (
              <div className={styles.section}>
                <Text weight="semibold">Agent Response:</Text>
                <div className={styles.passage} dangerouslySetInnerHTML={{ __html: formatMarkdown(result03.answer) }} />
              </div>
            )}

            {result03.toolCalls && result03.toolCalls.length > 0 && (
              <div className={styles.section}>
                <Text weight="semibold">Tools Executed:</Text>
                {result03.toolCalls.map((tool, i) => (
                  <div key={i} className={styles.passage}>
                    <Text weight="semibold">{tool.name}</Text>
                    <Text size={200} block>Arguments: {tool.arguments}</Text>
                    <Text size={200} block>Result: {tool.result}</Text>
                  </div>
                ))}
              </div>
            )}

            {result03.usage && (() => {
              const inputCostPer1M = 2.50;
              const outputCostPer1M = 10.00;
              const usdToEur = 0.92;
              
              const inputCostUSD = (result03.usage.prompt / 1_000_000) * inputCostPer1M;
              const outputCostUSD = (result03.usage.completion / 1_000_000) * outputCostPer1M;
              const totalCostUSD = inputCostUSD + outputCostUSD;
              const totalCostEUR = totalCostUSD * usdToEur;
              
              return (
                <div className={styles.section} style={{ 
                  backgroundColor: '#F3F2F1', 
                  border: '1px solid #EDEBE9',
                  borderRadius: '4px',
                  padding: '12px'
                }}>
                  <Text weight="semibold" size={300}>Token Usage & Cost</Text>
                  <div style={{ display: 'flex', gap: '24px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <Text size={200}>
                        <span style={{ fontWeight: 600 }}>Prompt:</span> {result03.usage.prompt.toLocaleString()}
                      </Text>
                      <Text size={200}>
                        <span style={{ fontWeight: 600 }}>Completion:</span> {result03.usage.completion.toLocaleString()}
                      </Text>
                      <Text size={200} style={{ fontWeight: 600, color: tokens.colorBrandForeground1 }}>
                        Total: {result03.usage.total.toLocaleString()}
                      </Text>
                    </div>
                    <div style={{ borderLeft: '1px solid #EDEBE9', paddingLeft: '24px' }}>
                      <Text size={200} style={{ fontWeight: 600, color: tokens.colorPaletteDarkOrangeForeground2 }}>
                        ~€{totalCostEUR.toFixed(4)} EUR
                      </Text>
                      <Text size={100} block style={{ color: tokens.colorNeutralForeground3, marginTop: '2px' }}>
                        (${totalCostUSD.toFixed(4)} USD)
                      </Text>
                    </div>
                  </div>
                </div>
              );
            })()}

            {result03.conversationFlow && result03.conversationFlow.length > 0 && (
              <div className={styles.section}>
                <Accordion collapsible>
                  <AccordionItem value="conversation-flow">
                    <AccordionHeader>
                      <Text weight="semibold">Conversation Flow ({result03.conversationFlow.length} messages)</Text>
                    </AccordionHeader>
                    <AccordionPanel>
                      {result03.conversationFlow.map((msg, i) => (
                        <div key={i} className={styles.passage}>
                          <Text weight="semibold">{msg.role}:</Text> {msg.content}
                        </div>
                      ))}
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </Card>

          <div className={styles.learnMoreDivider}>
            <div className={styles.learnMoreLabel}>
              <Library20Regular />
              <span>Learn More</span>
            </div>
          </div>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo03-how')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookInformation20Regular />
                    <Text className={styles.educationalCardHeader}>How It Works</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo03-how' && (
              <div style={{ padding: '16px' }}>
                <Text weight="semibold" block style={{ marginBottom: '8px' }}>Flow:</Text>
                <div className={styles.flowStep}>
                  <Text>Question</Text>
                  <ChevronRight20Regular />
                  <Text>GPT decides tool</Text>
                  <ChevronRight20Regular />
                  <Text>Execute Function</Text>
                  <ChevronRight20Regular />
                  <Text>GPT final answer</Text>
                </div>

                <Text weight="semibold" block style={{ marginTop: '16px', marginBottom: '8px' }}>Technology:</Text>
                <div className={styles.techItem}>
                  <Text>• GPT-5.1-chat with Function Calling API</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• AI decides which Azure Function to call (GetOrderStatus/CreateTicket)</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• Azure Functions execute business logic and return real data</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• GPT synthesizes natural language response from function results</Text>
                </div>
              </div>
            )}
          </Card>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo03-arch')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flowchart20Regular />
                    <Text className={styles.educationalCardHeader}>Architecture Diagram</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo03-arch' && (
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={architectureDiagrams['demo03']}
                  alt="Demo 03 Architecture"
                  style={{ maxWidth: '100%', width: 'auto', height: 'auto', borderRadius: '8px' }}
                />
              </div>
            )}
          </Card>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo03-code')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Code20Regular />
                    <Text className={styles.educationalCardHeader}>Implementation Code</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo03-code' && (
              <div style={{ padding: '16px' }}>
                <Card style={{ marginBottom: '12px' }}>
                  <CardHeader
                    header={
                      <Button
                        appearance="transparent"
                        onClick={() => toggleSnippet('demo03-snippet1')}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        <Text weight="semibold">Define Tools Schema</Text>
                      </Button>
                    }
                  />
                  {expandedSnippets.has('demo03-snippet1') && (
                    <div style={{ padding: '12px' }}>
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: tokens.colorNeutralForeground3 }}>
                        Declares available functions with their parameters that the AI can call, enabling GPT to understand what tools it can use.
                      </Text>
                      <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code className="language-typescript">{`const tools = [
  {
    type: "function",
    function: {
      name: "GetOrderStatus",
      description: "Retrieve order status by order ID",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "Order ID" }
        },
        required: ["orderId"]
      }
    }
  }
];`}</code>
                      </pre>
                    </div>
                  )}
                </Card>

                <Card style={{ marginBottom: '12px' }}>
                  <CardHeader
                    header={
                      <Button
                        appearance="transparent"
                        onClick={() => toggleSnippet('demo03-snippet2')}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        <Text weight="semibold">GPT Function Calling</Text>
                      </Button>
                    }
                  />
                  {expandedSnippets.has('demo03-snippet2') && (
                    <div style={{ padding: '12px' }}>
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: tokens.colorNeutralForeground3 }}>
                        AI decides which tool to execute based on user intent, calls the function, and adds results back to the conversation for final response generation.
                      </Text>
                      <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code className="language-typescript">{`const response = await openai.chat.completions.create({
  model: "gpt-5-1-chat",
  messages,
  tools,
  tool_choice: "auto"
});

if (response.choices[0].message.tool_calls) {
  // Execute the tool Azure Function called
  for (const toolCall of response.choices[0].message.tool_calls) {
    const functionResult = await executeTool(toolCall);
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(functionResult)
    });
  }
}`}</code>
                      </pre>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </Card>
        </>
      )}

      {selectedTab === 'demo06' && (
        <>
          <Card className={styles.demoSection}>
            <CardHeader
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target20Regular />
                  <Text weight="semibold">Try the Demo</Text>
                </div>
              }
            />

            <form onSubmit={handleDemo06Submit} className={styles.searchForm}>
              <Input
                className={styles.searchInput}
                value={question06}
                onChange={(e) => setQuestion06(e.target.value)}
                placeholder="Ask a complex question..."
                size="large"
              />
              <Button type="submit" appearance="primary" size="large" disabled={loading06}>
                {loading06 ? <Spinner size="tiny" /> : 'Search'}
              </Button>
            </form>

            <div className={styles.exampleButtons}>
              <Button size="small" onClick={() => fillQuestion('demo06', 'How do I reset my password and set up MFA?')}>
                Password + MFA
              </Button>
              <Button size="small" onClick={() => fillQuestion('demo06', 'VPN issues and network troubleshooting')}>
                VPN + Network
              </Button>
              <Button size="small" onClick={() => fillQuestion('demo06', 'Billing charges and refund policy')}>
                Billing
              </Button>
            </div>

            {loading06 && <Spinner label="Searching..." />}

            {result06.error && (
              <div className={styles.section} style={{ 
                backgroundColor: '#FFF4CE', 
                border: '1px solid #F7C540',
                borderRadius: '4px',
                padding: '12px'
              }}>
                <Text weight="semibold" style={{ color: '#8A5700' }}>⚠️ {result06.error}</Text>
                {result06.hint && (
                  <Text size={200} block style={{ marginTop: '8px', color: '#8A5700' }}>
                    {result06.hint}
                  </Text>
                )}
              </div>
            )}

            {result06.queries && (
              <div className={styles.section}>
                <Text weight="semibold">Sub-Queries</Text>
                {result06.queries.map((q, i) => (
                  <div key={i} className={styles.passage}>
                    {q}
                  </div>
                ))}
              </div>
            )}

            {result06.answer && (
              <div className={styles.section}>
                <Text weight="semibold">Answer</Text>
                <div className={styles.passage} dangerouslySetInnerHTML={{ __html: formatMarkdown(result06.answer) }} />
              </div>
            )}

            {result06.usage && (() => {
              // GPT-5.1-chat pricing (November 2025)
              const inputCostPer1M = 2.50;  // USD
              const outputCostPer1M = 10.00; // USD
              const usdToEur = 0.92; // Approximate conversion rate
              
              const inputCostUSD = (result06.usage.prompt / 1_000_000) * inputCostPer1M;
              const outputCostUSD = (result06.usage.completion / 1_000_000) * outputCostPer1M;
              const totalCostUSD = inputCostUSD + outputCostUSD;
              const totalCostEUR = totalCostUSD * usdToEur;
              
              return (
                <div className={styles.section} style={{ 
                  backgroundColor: '#F3F2F1', 
                  border: '1px solid #EDEBE9',
                  borderRadius: '4px',
                  padding: '12px'
                }}>
                  <Text weight="semibold" size={300}>Token Usage & Cost</Text>
                  <div style={{ display: 'flex', gap: '24px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <Text size={200}>
                        <span style={{ fontWeight: 600 }}>Prompt:</span> {result06.usage.prompt.toLocaleString()}
                      </Text>
                      <Text size={200}>
                        <span style={{ fontWeight: 600 }}>Completion:</span> {result06.usage.completion.toLocaleString()}
                      </Text>
                      <Text size={200} style={{ fontWeight: 600, color: tokens.colorBrandForeground1 }}>
                        Total: {result06.usage.total.toLocaleString()}
                      </Text>
                    </div>
                    <div style={{ borderLeft: '1px solid #EDEBE9', paddingLeft: '24px' }}>
                      <Text size={200} style={{ fontWeight: 600, color: tokens.colorPaletteDarkOrangeForeground2 }}>
                        ~€{totalCostEUR.toFixed(4)} EUR
                      </Text>
                      <Text size={100} block style={{ color: tokens.colorNeutralForeground3, marginTop: '2px' }}>
                        (${totalCostUSD.toFixed(4)} USD)
                      </Text>
                    </div>
                  </div>
                </div>
              );
            })()}

            {result06.passages && (
              <div className={styles.section}>
                <Accordion collapsible>
                  <AccordionItem value="source-passages">
                    <AccordionHeader>
                      <Text weight="semibold">Source Passages ({result06.passages.length})</Text>
                    </AccordionHeader>
                    <AccordionPanel>
                      {result06.passages.map((p, i) => (
                        <div key={i} className={styles.passage} id={`passage-${i + 1}`}>
                          <Text size={200}>Passage {i + 1} | Score: {p.score?.toFixed(2)}</Text>
                          <div dangerouslySetInnerHTML={{ __html: formatMarkdown(p.content) }} />
                        </div>
                      ))}
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </Card>

          <div className={styles.learnMoreDivider}>
            <div className={styles.learnMoreLabel}>
              <Library20Regular />
              <span>Learn More</span>
            </div>
          </div>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo06-how')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookInformation20Regular />
                    <Text className={styles.educationalCardHeader}>How It Works</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo06-how' && (
              <div style={{ padding: '16px' }}>
                <Text weight="semibold" block style={{ marginBottom: '8px' }}>Flow:</Text>
                <div className={styles.flowStep}>
                  <Text>Question</Text>
                  <ChevronRight20Regular />
                  <Text>Query Planning (2-4 sub-queries)</Text>
                  <ChevronRight20Regular />
                  <Text>Parallel Search</Text>
                  <ChevronRight20Regular />
                  <Text>Merge + Citations</Text>
                  <ChevronRight20Regular />
                  <Text>Final Answer</Text>
                </div>

                <Text weight="semibold" block style={{ marginTop: '16px', marginBottom: '8px' }}>Technology:</Text>
                <div className={styles.techItem}>
                  <Text>• GPT-5.1-chat decomposes complex question into focused sub-queries</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• All sub-queries run simultaneously against Azure AI Search</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• Results merged with automatic citation tracking</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• GPT synthesizes comprehensive answer from multiple sources</Text>
                </div>
              </div>
            )}
          </Card>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo06-arch')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flowchart20Regular />
                    <Text className={styles.educationalCardHeader}>Architecture Diagram</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo06-arch' && (
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={architectureDiagrams['demo06']}
                  alt="Demo 06 Architecture"
                  style={{ maxWidth: '100%', width: 'auto', height: 'auto', borderRadius: '8px' }}
                />
              </div>
            )}
          </Card>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo06-code')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Code20Regular />
                    <Text className={styles.educationalCardHeader}>Implementation Code</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo06-code' && (
              <div style={{ padding: '16px' }}>
                <Card style={{ marginBottom: '12px' }}>
                  <CardHeader
                    header={
                      <Button
                        appearance="transparent"
                        onClick={() => toggleSnippet('demo06-snippet1')}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        <Text weight="semibold">Query Planning with GPT</Text>
                      </Button>
                    }
                  />
                  {expandedSnippets.has('demo06-snippet1') && (
                    <div style={{ padding: '12px' }}>
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: tokens.colorNeutralForeground3 }}>
                        Decomposes complex questions into 2-4 focused sub-queries using GPT, enabling more targeted and comprehensive knowledge base searches.
                      </Text>
                      <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code className="language-typescript">{`const planResponse = await openai.chat.completions.create({
  model: "gpt-5-1-chat",
  messages: [{
    role: "system",
    content: "Break complex question into 2-4 focused sub-queries"
  }, {
    role: "user",
    content: question
  }],
  response_format: { type: "json_object" }
});
const subQueries = JSON.parse(planResponse.choices[0].message.content).queries;`}</code>
                      </pre>
                    </div>
                  )}
                </Card>

                <Card style={{ marginBottom: '12px' }}>
                  <CardHeader
                    header={
                      <Button
                        appearance="transparent"
                        onClick={() => toggleSnippet('demo06-snippet2')}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        <Text weight="semibold">Parallel Search Execution</Text>
                      </Button>
                    }
                  />
                  {expandedSnippets.has('demo06-snippet2') && (
                    <div style={{ padding: '12px' }}>
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: tokens.colorNeutralForeground3 }}>
                        Executes all sub-queries simultaneously using Promise.all for maximum speed, retrieving top results from each search in parallel.
                      </Text>
                      <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code className="language-typescript">{`const searchPromises = subQueries.map(async (q) => {
  const embedding = await createEmbedding(q);
  return await searchClient.search(q, {
    vectorQueries: [{ vector: embedding, ... }],
    queryType: "semantic",
    top: 3
  });
});

const allResults = await Promise.all(searchPromises);`}</code>
                      </pre>
                    </div>
                  )}
                </Card>

                <Card style={{ marginBottom: '12px' }}>
                  <CardHeader
                    header={
                      <Button
                        appearance="transparent"
                        onClick={() => toggleSnippet('demo06-snippet3')}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        <Text weight="semibold">Merge Results with Citations</Text>
                      </Button>
                    }
                  />
                  {expandedSnippets.has('demo06-snippet3') && (
                    <div style={{ padding: '12px' }}>
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: tokens.colorNeutralForeground3 }}>
                        Combines all search results into a single context with automatic citation numbering, enabling GPT to reference sources in its answer.
                      </Text>
                      <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code className="language-typescript">{`const mergedContext = allResults
  .flatMap((result, index) => 
    result.results.map((doc, docIndex) => ({
      content: doc.content,
      citation: \`[\${index * 3 + docIndex + 1}]\`
    }))
  )
  .map(item => \`\${item.citation} \${item.content}\`)
  .join('\\n\\n');`}</code>
                      </pre>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </Card>
        </>
      )}

      {selectedTab === 'demo07' && (
        <>
          <Card className={styles.demoSection}>
            <CardHeader
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target20Regular />
                  <Text weight="semibold">Try the Demo</Text>
                </div>
              }
            />

            <form onSubmit={handleDemo07Submit} className={styles.searchForm}>
              <Input
                className={styles.searchInput}
                value={question07}
                onChange={(e) => setQuestion07(e.target.value)}
                placeholder="Ask a support question..."
                size="large"
              />
              <Button type="submit" appearance="primary" size="large" disabled={loading07}>
                {loading07 ? <Spinner size="tiny" /> : 'Submit'}
              </Button>
            </form>

            <div className={styles.exampleButtons}>
              <Button size="small" onClick={() => fillQuestion('demo07', 'I need help resetting my password')}>
                Password Help
              </Button>
              <Button size="small" onClick={() => fillQuestion('demo07', 'I was double-charged, need refund')}>
                Billing Issue
              </Button>
              <Button size="small" onClick={() => fillQuestion('demo07', 'VPN keeps disconnecting')}>
                VPN Problem
              </Button>
            </div>

            {loading07 && <Spinner label="Processing..." />}

            {result07.triage && (
              <div className={styles.section}>
                <Text weight="semibold">Triage:</Text>
                <div className={styles.passage}>
                  <strong>Type:</strong> {result07.triage.type}<br />
                  {result07.triage.category && <><strong>Category:</strong> {result07.triage.category}<br /></>}
                  <strong>Reason:</strong> {result07.triage.reason}
                </div>
              </div>
            )}

            {result07.ticketId && (
              <div className={styles.section}>
                <Text weight="semibold">Ticket Created:</Text>
                <div className={styles.passage}>{result07.ticketId}</div>
              </div>
            )}

            {result07.finalResponse && (
              <div className={styles.section}>
                <Text weight="semibold">Response:</Text>
                <div className={styles.passage} dangerouslySetInnerHTML={{ __html: formatMarkdown(result07.finalResponse) }} />
              </div>
            )}

            {result07.usage && (() => {
              const inputCostPer1M = 2.50;
              const outputCostPer1M = 10.00;
              const usdToEur = 0.92;
              
              const inputCostUSD = (result07.usage.prompt / 1_000_000) * inputCostPer1M;
              const outputCostUSD = (result07.usage.completion / 1_000_000) * outputCostPer1M;
              const totalCostUSD = inputCostUSD + outputCostUSD;
              const totalCostEUR = totalCostUSD * usdToEur;
              
              return (
                <div className={styles.section} style={{ 
                  backgroundColor: '#F3F2F1', 
                  border: '1px solid #EDEBE9',
                  borderRadius: '4px',
                  padding: '12px'
                }}>
                  <Text weight="semibold" size={300}>Token Usage & Cost</Text>
                  <div style={{ display: 'flex', gap: '24px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <Text size={200}>
                        <span style={{ fontWeight: 600 }}>Prompt:</span> {result07.usage.prompt.toLocaleString()}
                      </Text>
                      <Text size={200}>
                        <span style={{ fontWeight: 600 }}>Completion:</span> {result07.usage.completion.toLocaleString()}
                      </Text>
                      <Text size={200} style={{ fontWeight: 600, color: tokens.colorBrandForeground1 }}>
                        Total: {result07.usage.total.toLocaleString()}
                      </Text>
                    </div>
                    <div style={{ borderLeft: '1px solid #EDEBE9', paddingLeft: '24px' }}>
                      <Text size={200} style={{ fontWeight: 600, color: tokens.colorPaletteDarkOrangeForeground2 }}>
                        ~€{totalCostEUR.toFixed(4)} EUR
                      </Text>
                      <Text size={100} block style={{ color: tokens.colorNeutralForeground3, marginTop: '2px' }}>
                        (${totalCostUSD.toFixed(4)} USD)
                      </Text>
                    </div>
                  </div>
                </div>
              );
            })()}

            {result07.agents && (
              <div className={styles.section}>
                <Text weight="semibold">Agent Flow:</Text>
                <div>
                  {result07.agents.map((agent, i) => (
                    <span key={i}>
                      {i > 0 && ' → '}
                      <span className={styles.agentBadge}>{agent}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <div className={styles.learnMoreDivider}>
            <div className={styles.learnMoreLabel}>
              <Library20Regular />
              <span>Learn More</span>
            </div>
          </div>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo07-how')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookInformation20Regular />
                    <Text className={styles.educationalCardHeader}>How It Works</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo07-how' && (
              <div style={{ padding: '16px' }}>
                <Text weight="semibold" block style={{ marginBottom: '8px' }}>Flow:</Text>
                <div className={styles.flowStep}>
                  <Text>Question</Text>
                  <ChevronRight20Regular />
                  <Text>Triage Agent</Text>
                  <ChevronRight20Regular />
                  <Text>Route to Specialist</Text>
                  <ChevronRight20Regular />
                  <Text>Execute</Text>
                  <ChevronRight20Regular />
                  <Text>Result</Text>
                </div>

                <Text weight="semibold" block style={{ marginTop: '16px', marginBottom: '8px' }}>Technology:</Text>
                <div className={styles.techItem}>
                  <Text>• Triage agent classifies intent (FAQ/Search/Ticket creation)</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• Routes to specialist agents: FAQ agent, RAG agent, or Ticket agent</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• Each agent has narrow expertise and specific tools</Text>
                </div>
                <div className={styles.techItem}>
                  <Text>• Local orchestrator coordinates agent handoffs</Text>
                </div>
              </div>
            )}
          </Card>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo07-arch')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flowchart20Regular />
                    <Text className={styles.educationalCardHeader}>Architecture Diagram</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo07-arch' && (
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={architectureDiagrams['demo07']}
                  alt="Demo 07 Architecture"
                  style={{ maxWidth: '100%', width: 'auto', height: 'auto', borderRadius: '8px' }}
                />
              </div>
            )}
          </Card>

          <Card className={styles.educationalSection}>
            <CardHeader
              header={
                <Button
                  appearance="transparent"
                  onClick={() => toggleArchitecture('demo07-code')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Code20Regular />
                    <Text className={styles.educationalCardHeader}>Implementation Code</Text>
                  </div>
                </Button>
              }
            />
            {expandedArchitecture === 'demo07-code' && (
              <div style={{ padding: '16px' }}>
                <Card style={{ marginBottom: '12px' }}>
                  <CardHeader
                    header={
                      <Button
                        appearance="transparent"
                        onClick={() => toggleSnippet('demo07-snippet1')}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        <Text weight="semibold">Triage Agent Classification</Text>
                      </Button>
                    }
                  />
                  {expandedSnippets.has('demo07-snippet1') && (
                    <div style={{ padding: '12px' }}>
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: tokens.colorNeutralForeground3 }}>
                        Analyzes user question to determine intent (FAQ, search, or ticket creation) and routes to the appropriate specialist agent.
                      </Text>
                      <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code className="language-typescript">{`async function triageAgent(question: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-5-1-chat",
    messages: [{
      role: "system",
      content: "Classify intent: FAQ, SEARCH, or CREATE_TICKET"
    }, {
      role: "user",
      content: question
    }],
    response_format: { type: "json_object" }
  });
  return JSON.parse(response.choices[0].message.content);
}`}</code>
                      </pre>
                    </div>
                  )}
                </Card>

                <Card style={{ marginBottom: '12px' }}>
                  <CardHeader
                    header={
                      <Button
                        appearance="transparent"
                        onClick={() => toggleSnippet('demo07-snippet2')}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        <Text weight="semibold">Orchestrator Routing Logic</Text>
                      </Button>
                    }
                  />
                  {expandedSnippets.has('demo07-snippet2') && (
                    <div style={{ padding: '12px' }}>
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: tokens.colorNeutralForeground3 }}>
                        Routes requests to specialized agents (FAQ, RAG, or Ticket) based on triage results, coordinating multi-agent collaboration.
                      </Text>
                      <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code className="language-typescript">{`const triage = await triageAgent(question);

switch (triage.type) {
  case 'FAQ':
    result = await faqAgent(question);
    agents = ['Triage', 'FAQ'];
    break;
  case 'SEARCH':
    result = await ragAgent(question);
    agents = ['Triage', 'RAG'];
    break;
  case 'CREATE_TICKET':
    result = await ticketAgent(question, triage.category);
    agents = ['Triage', 'Ticket'];
    break;
}`}</code>
                      </pre>
                    </div>
                  )}
                </Card>

                <Card style={{ marginBottom: '12px' }}>
                  <CardHeader
                    header={
                      <Button
                        appearance="transparent"
                        onClick={() => toggleSnippet('demo07-snippet3')}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        <Text weight="semibold">Specialist Agent Example (FAQ)</Text>
                      </Button>
                    }
                  />
                  {expandedSnippets.has('demo07-snippet3') && (
                    <div style={{ padding: '12px' }}>
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: tokens.colorNeutralForeground3 }}>
                        Demonstrates a simple FAQ agent that matches questions against a predefined knowledge base for quick, consistent answers.
                      </Text>
                      <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code className="language-typescript">{`const FAQ_DATABASE = {
  'reset password': 'Go to login page, click Forgot Password...',
  'vpn setup': 'Download VPN client from portal...',
  'billing cycle': 'Billing occurs on first of month...'
};

async function faqAgent(question: string): Promise<string> {
  const normalized = question.toLowerCase();
  for (const [key, answer] of Object.entries(FAQ_DATABASE)) {
    if (normalized.includes(key)) return answer;
  }
  return 'No FAQ match found';
}`}</code>
                      </pre>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </Card>
        </>
      )}

      <div className={styles.footer}>
        Made with ❤️ by Luise Freese
      </div>
    </div>
  );
}

function formatMarkdown(text: string): string {
  // First handle lists
  let formatted = text.replace(/(?:^|\n)((?:[-*]\s+.+(?:\n|$))+)/g, (match) => {
    const items = match
      .trim()
      .split('\n')
      .map(line => line.replace(/^[-*]\s+/, '').trim())
      .filter(item => item.length > 0)
      .map(item => `<li>${item}</li>`)
      .join('');
    return `<ul>${items}</ul>`;
  });

  // Then handle other markdown
  return formatted
    .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
    .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
    .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\[(\d+)\]/g, '<a href="#passage-$1" class="citation" onclick="document.getElementById(\'passage-$1\')?.scrollIntoView({behavior: \'smooth\', block: \'center\'})">[$1]</a>')
    .replace(/\n/g, '<br>');
}
