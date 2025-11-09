import * as fs from 'fs';
import * as path from 'path';
import { SearchClient, SearchIndexClient, AzureKeyCredential } from '@azure/search-documents';
import * as dotenv from 'dotenv';
import { encoding_for_model } from 'tiktoken';

dotenv.config({ path: '../../../.env' });

// Configuration
const SEARCH_ENDPOINT = process.env.AZURE_AI_SEARCH_ENDPOINT!;
const SEARCH_API_KEY = process.env.AZURE_AI_SEARCH_API_KEY!;
const SEARCH_INDEX = process.env.AZURE_AI_SEARCH_INDEX || 'kb-support';
const OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
const OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY!;
const OPENAI_EMBEDDING_DEPLOYMENT = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large';
const OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';

const MAX_TOKENS_PER_CHUNK = 1000;
const CHUNK_OVERLAP = 100;

interface Document {
  id: string;
  title: string;
  content: string;
  url: string;
  vector?: number[];
}

// Create or update search index
async function createSearchIndex(): Promise<void> {
  const indexClient = new SearchIndexClient(SEARCH_ENDPOINT, new AzureKeyCredential(SEARCH_API_KEY));

  const indexDefinition = {
    name: SEARCH_INDEX,
    fields: [
      { name: 'id', type: 'Edm.String', key: true, searchable: false },
      { name: 'title', type: 'Edm.String', searchable: true, filterable: true },
      { name: 'content', type: 'Edm.String', searchable: true },
      { name: 'url', type: 'Edm.String', searchable: false, filterable: true },
      {
        name: 'vector',
        type: 'Collection(Edm.Single)',
        searchable: true,
        vectorSearchDimensions: 3072,
        vectorSearchProfileName: 'vector-profile',
      },
    ],
    vectorSearch: {
      algorithms: [
        {
          name: 'vector-algorithm',
          kind: 'hnsw',
          hnswParameters: {
            metric: 'cosine',
            m: 4,
            efConstruction: 400,
            efSearch: 500,
          },
        },
      ],
      profiles: [
        {
          name: 'vector-profile',
          algorithmConfigurationName: 'vector-algorithm',
        },
      ],
    },
    semanticSearch: {
      defaultConfigurationName: 'semantic-config',
      configurations: [
        {
          name: 'semantic-config',
          prioritizedFields: {
            titleField: { fieldName: 'title' },
            contentFields: [{ fieldName: 'content' }],
          },
        },
      ],
    },
  };

  try {
    await indexClient.createOrUpdateIndex(indexDefinition as any);
    console.log(`✅ Index '${SEARCH_INDEX}' created or updated successfully`);
  } catch (error: any) {
    console.error(`❌ Failed to create index:`, error.message);
    throw error;
  }
}

// Get embeddings from Azure OpenAI
async function getEmbedding(text: string): Promise<number[]> {
  const url = `${OPENAI_ENDPOINT}/openai/deployments/${OPENAI_EMBEDDING_DEPLOYMENT}/embeddings?api-version=${OPENAI_API_VERSION}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': OPENAI_API_KEY,
    },
    body: JSON.stringify({
      input: text,
      model: OPENAI_EMBEDDING_DEPLOYMENT,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Chunk text into smaller pieces
function chunkText(text: string, maxTokens: number = MAX_TOKENS_PER_CHUNK): string[] {
  const enc = encoding_for_model('gpt-4');
  const tokens = enc.encode(text);

  const chunks: string[] = [];
  let start = 0;

  while (start < tokens.length) {
    const end = Math.min(start + maxTokens, tokens.length);
    const chunkTokens = tokens.slice(start, end);
    const chunkText = new TextDecoder().decode(enc.decode(chunkTokens));
    chunks.push(chunkText);
    start += maxTokens - CHUNK_OVERLAP;
  }

  enc.free();
  return chunks;
}

// Read markdown files from directory
function readMarkdownFiles(dirPath: string): Document[] {
  const documents: Document[] = [];
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      documents.push(...readMarkdownFiles(filePath));
    } else if (file.endsWith('.md')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const title = file.replace('.md', '');
      const chunks = chunkText(content);

      chunks.forEach((chunk, idx) => {
        documents.push({
          id: `${title}-${idx}`,
          title,
          content: chunk,
          url: `kb/${file}`,
        });
      });
    }
  }

  return documents;
}

// Upload documents to search index
async function uploadDocuments(documents: Document[]): Promise<void> {
  const searchClient = new SearchClient(SEARCH_ENDPOINT, SEARCH_INDEX, new AzureKeyCredential(SEARCH_API_KEY));

  console.log(`📄 Processing ${documents.length} document chunks...`);

  // Add embeddings to documents
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    console.log(`  [${i + 1}/${documents.length}] Generating embedding for: ${doc.id}`);
    doc.vector = await getEmbedding(doc.content);
  }

  // Upload in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    console.log(`📤 Uploading batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

    const result = await searchClient.uploadDocuments(batch);
    const succeeded = result.results.filter((r) => r.succeeded).length;
    console.log(`   ✅ ${succeeded}/${batch.length} documents uploaded`);
  }

  console.log(`🎉 All documents uploaded successfully!`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--create-index')) {
    console.log('🔨 Creating search index...');
    await createSearchIndex();
    return;
  }

  const contentDir = args[0] || '../content';

  if (!fs.existsSync(contentDir)) {
    console.error(`❌ Directory not found: ${contentDir}`);
    process.exit(1);
  }

  console.log(`📂 Reading documents from: ${contentDir}`);
  const documents = readMarkdownFiles(contentDir);

  if (documents.length === 0) {
    console.error('❌ No markdown files found');
    process.exit(1);
  }

  await uploadDocuments(documents);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
