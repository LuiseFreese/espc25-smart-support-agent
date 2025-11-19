// Implement a function
//   `runSearchFanout(subQueries: string[]): Promise<SearchHit[]>`
// where SearchHit has:
//   { id: string; content: string; title?: string; url?: string; queryIndex: number }
// Use `@azure/search-documents` with env vars:
//   AZURE_AI_SEARCH_ENDPOINT, AZURE_AI_SEARCH_API_KEY, AZURE_AI_SEARCH_INDEX.
// For each sub-query:
//   - run a search with top = 5
//   - include semantic fields if available
//   - map hits into SearchHit objects with queryIndex set to the index of the sub-query.
// Run all searches in parallel with Promise.all.

import { SearchClient, AzureKeyCredential, SearchDocumentsResult } from '@azure/search-documents';

export interface SearchHit {
    id: string;
    content: string;
    title?: string;
    url?: string;
    queryIndex: number;
}

interface KBDocument {
    id: string;
    title: string;
    content: string;
}

let searchClient: SearchClient<KBDocument>;

function getSearchClient(): SearchClient<KBDocument> {
    if (!searchClient) {
        searchClient = new SearchClient<KBDocument>(
            process.env.AZURE_AI_SEARCH_ENDPOINT!,
            process.env.AZURE_AI_SEARCH_INDEX!,
            new AzureKeyCredential(process.env.AZURE_AI_SEARCH_API_KEY!)
        );
    }
    return searchClient;
}

export async function runSearchFanout(subQueries: string[]): Promise<SearchHit[]> {
    // Run all searches in parallel
    const searchPromises = subQueries.map((query, index) =>
        executeSearch(query, index)
    );

    const results = await Promise.all(searchPromises);

    // Flatten results from all queries
    const allHits = results.flat();

    // Deduplicate by ID, keeping first occurrence
    const seen = new Set<string>();
    const uniqueHits = allHits.filter(hit => {
        if (seen.has(hit.id)) {
            return false;
        }
        seen.add(hit.id);
        return true;
    });

    return uniqueHits;
}

async function executeSearch(query: string, queryIndex: number): Promise<SearchHit[]> {
    try {
        const client = getSearchClient();
        const searchResults = await client.search(query, {
            top: 5,
            queryType: 'semantic',
            semanticSearchOptions: {
                configurationName: 'semantic-config'
            },
            select: ['id', 'title', 'content']
        });

        const hits: SearchHit[] = [];
        for await (const result of searchResults.results) {
            hits.push({
                id: result.document.id || `doc-${queryIndex}-${hits.length}`,
                content: result.document.content || '',
                title: result.document.title,
                url: undefined, // Can be added if available in index
                queryIndex
            });
        }

        return hits;
    } catch (error) {
        console.warn(`Warning: Search failed for query "${query}":`, error);
        return [];
    }
}
