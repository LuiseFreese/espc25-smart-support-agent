import { useState } from 'react';
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
  ArrowUpload24Regular
} from '@fluentui/react-icons';const useStyles = makeStyles({
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
});

interface Demo01Result {
  category?: string;
  priority?: string;
  reasoning?: string;
}

interface Demo02Result {
  answer?: string;
  confidence?: number;
  passages?: Array<{ content: string; score: number }>;
  isStreaming?: boolean;
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
}

interface Demo06Result {
  queries?: string[];
  passages?: Array<{ content: string; score?: number }>;
  answer?: string;
}

interface Demo07Result {
  triage?: { type: string; category?: string; reason: string };
  agents?: string[];
  finalResponse?: string;
  ticketId?: string;
}

export default function App() {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<'demo01' | 'demo02' | 'demo03' | 'demo06' | 'demo07'>('demo01');
  const [streamingEnabled, setStreamingEnabled] = useState(false);
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
      const response = await fetch('/api/triage', {
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

        const response = await fetch('/api/simple-rag', {
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
        const response = await fetch('/api/streaming-rag', {
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
        const response = await fetch('/api/simple-rag', {
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
      const response = await fetch('/api/agent-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question03 }),
      });

      const data = await response.json();
      setResult03(data);
    } catch (error) {
      console.error('Error:', error);
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
      const response = await fetch('/api/agentic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question06 }),
      });

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
            if (data.type === 'queries') {
              setResult06((prev) => ({ ...prev, queries: data.data }));
            } else if (data.type === 'passages') {
              setResult06((prev) => ({ ...prev, passages: data.data }));
            } else if (data.type === 'answer') {
              setResult06((prev) => ({ ...prev, answer: data.data }));
            }
          } catch (err) {
            console.error('Parse error:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
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
      const response = await fetch('/api/multi-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question07 }),
      });

      const data = await response.json();
      setResult07(data);
    } catch (error) {
      console.error('Error:', error);
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
          <div className={styles.headerTitle}>Azure AI Foundry Smart Support Agent</div>
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
        <Card className={styles.resultCard}>
          <CardHeader
            header={<Text weight="semibold">AI Classification: Ticket Text → Category + Priority</Text>}
          />

          <Accordion className={styles.infoAccordion} collapsible>
            <AccordionItem value="1">
              <AccordionHeader icon={<Info20Regular />}>How it works</AccordionHeader>
              <AccordionPanel>
                <div>
                  <Text weight="semibold" block style={{ marginBottom: '8px' }}>Flow:</Text>
                  <div className={styles.flowStep}>
                    <Text>Ticket Text</Text>
                    <ChevronRight20Regular />
                    <Text>System Prompt + GPT-4o-mini</Text>
                    <ChevronRight20Regular />
                    <Text>JSON Classification</Text>
                  </div>

                  <Text weight="semibold" block style={{ marginTop: '16px', marginBottom: '8px' }}>Technology:</Text>
                  <div className={styles.techItem}>
                    <Text>• Azure OpenAI Chat Completion API</Text>
                  </div>
                  <div className={styles.techItem}>
                    <Text>• GPT-4o-mini reads ticket and classifies based on system prompt</Text>
                  </div>
                  <div className={styles.techItem}>
                    <Text>• No embeddings - pure text reasoning</Text>
                  </div>
                  <div className={styles.techItem}>
                    <Text>• System prompt defines categories (Access/Network/Billing/Software) and priorities</Text>
                  </div>
                </div>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>

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
        </Card>
      )}

      {selectedTab === 'demo02' && (
        <Card className={styles.resultCard}>
          <CardHeader
            header={<Text weight="semibold">Basic RAG: Single Query → Search → Answer (Optional: + Image)</Text>}
          />

          <Accordion className={styles.infoAccordion} collapsible>
            <AccordionItem value="1">
              <AccordionHeader icon={<Info20Regular />}>How it works</AccordionHeader>
              <AccordionPanel>
                <div>
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
                    <Text>• GPT-4o-mini generates natural language answer from best passage{selectedImage02 ? ' + visual insights' : ''}</Text>
                  </div>
                </div>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>

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

          {result02.visualInsights && (
            <div className={styles.section}>
              <Text weight="semibold">Visual Analysis:</Text>
              <div className={styles.passage}>
                <div dangerouslySetInnerHTML={{ __html: formatMarkdown(result02.visualInsights) }} />
              </div>
            </div>
          )}

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
      )}

      {selectedTab === 'demo03' && (
        <Card className={styles.resultCard}>
          <CardHeader
            header={<Text weight="semibold">Function Calling: AI Decides Which Tools to Execute</Text>}
          />

          <Accordion className={styles.infoAccordion} collapsible>
            <AccordionItem value="1">
              <AccordionHeader icon={<Info20Regular />}>How it works</AccordionHeader>
              <AccordionPanel>
                <div>
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
                    <Text>• GPT-4o-mini with Function Calling API</Text>
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
              </AccordionPanel>
            </AccordionItem>
          </Accordion>

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
      )}

      {selectedTab === 'demo06' && (
        <Card className={styles.resultCard}>
          <CardHeader
            header={<Text weight="semibold">Query Planning → Parallel Search → Citation Merging</Text>}
          />

          <Accordion className={styles.infoAccordion} collapsible>
            <AccordionItem value="1">
              <AccordionHeader icon={<Info20Regular />}>How it works</AccordionHeader>
              <AccordionPanel>
                <div>
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
                    <Text>• GPT-4o-mini decomposes complex question into focused sub-queries</Text>
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
              </AccordionPanel>
            </AccordionItem>
          </Accordion>

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
      )}

      {selectedTab === 'demo07' && (
        <Card className={styles.resultCard}>
          <CardHeader
            header={<Text weight="semibold">Multi-Agent Orchestration: Triage → FAQ/RAG/Ticket</Text>}
          />

          <Accordion className={styles.infoAccordion} collapsible>
            <AccordionItem value="1">
              <AccordionHeader icon={<Info20Regular />}>How it works</AccordionHeader>
              <AccordionPanel>
                <div>
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
              </AccordionPanel>
            </AccordionItem>
          </Accordion>

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
