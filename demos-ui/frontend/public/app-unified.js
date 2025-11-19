// AI Support Agent Demos - Unified UI
// Demo 06: Agentic Retrieval | Demo 07: Multi-Agent Orchestration

// Tab Switching
function switchTab(tabName) {
    // Hide all panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // Remove active from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected panel
    document.getElementById(tabName + '-panel').classList.add('active');

    // Activate button
    event.target.closest('.tab-button').classList.add('active');
}

// Fill Question Helper
function fillQuestion(demo, question) {
    const input = document.getElementById(`question-input-${demo}`);
    input.value = question;
    input.focus();
}

// ======================
// DEMO 02: RAG Search
// ======================

document.getElementById('search-form-02')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const question = document.getElementById('question-input-02').value.trim();
    if (!question) return;

    // Show loading
    document.getElementById('loading-02').style.display = 'block';
    document.getElementById('results-02').style.display = 'none';
    hideAllSections('02');

    try {
        const response = await fetch('/api/simple-rag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });

        if (!response.ok) throw new Error('RAG search failed');

        const data = await response.json();

        document.getElementById('loading-02').style.display = 'none';
        document.getElementById('results-02').style.display = 'block';

        // Show answer
        if (data.answer) {
            showRAGAnswer(data.answer);
        }

        // Show confidence score
        if (data.confidence !== undefined) {
            showConfidence(data.confidence);
        }

        // Show source document
        if (data.source || data.documents) {
            showSource(data.source || data.documents?.[0]);
        }

    } catch (error) {
        document.getElementById('loading-02').style.display = 'none';
        showError('02', error.message);
    }
});

function showRAGAnswer(answer) {
    const section = document.getElementById('answer-section-02');
    const content = document.getElementById('answer-content-02');

    content.innerHTML = formatMarkdown(answer);
    section.style.display = 'block';
}

function showConfidence(confidence) {
    const section = document.getElementById('confidence-section-02');
    const content = document.getElementById('confidence-content-02');

    const percentage = (confidence * 100).toFixed(0);
    const level = confidence >= 0.7 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';
    const decision = confidence >= 0.7 ? '✅ Auto-reply' : '⚠️ Escalate to human';

    content.innerHTML = `
        <div class="confidence-bar">
            <div class="confidence-fill confidence-${level}" style="width: ${percentage}%; background: ${level === 'high' ? '#107c10' : level === 'medium' ? '#ffb900' : '#d13438'}; height: 30px; border-radius: 4px; transition: width 0.3s;"></div>
        </div>
        <div class="confidence-text" style="margin-top: 10px; font-size: 18px; font-weight: bold;">
            ${percentage}% confidence - ${decision}
        </div>
        <div style="margin-top: 8px; color: #666; font-size: 14px;">
            ${confidence >= 0.7 ? 'High confidence - system will auto-reply to customer' : 'Low confidence - will forward to support team'}
        </div>
    `;

    section.style.display = 'block';
}

function showSource(source) {
    const section = document.getElementById('source-section-02');
    const content = document.getElementById('source-content-02');

    if (!source) {
        section.style.display = 'none';
        return;
    }

    const title = source.title || source.metadata?.title || 'Knowledge Base Article';
    const excerpt = source.content || source.chunk || source.text || '';

    content.innerHTML = `
        <div class="source-title" style="font-weight: bold; margin-bottom: 10px; color: #0078d4;">
            ${title}
        </div>
        <div class="source-excerpt" style="padding: 15px; background: #f5f5f5; border-radius: 4px;">
            ${formatMarkdown(excerpt)}
        </div>
    `;

    section.style.display = 'block';
}

// ======================
// DEMO 06: Agentic Retrieval
// ======================

document.getElementById('search-form-06')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const question = document.getElementById('question-input-06').value.trim();
    if (!question) return;

    // Show loading, hide previous results
    document.getElementById('loading-06').style.display = 'block';
    document.getElementById('results-06').style.display = 'none';
    hideAllSections('06');

    try {
        const response = await fetch('/api/agentic-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });

        if (!response.ok) throw new Error('Search failed');

        // Read streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        document.getElementById('results-06').style.display = 'block';
        document.getElementById('loading-06').style.display = 'none';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);

                    if (data.type === 'queries') {
                        showQueries(data.data);
                    } else if (data.type === 'passages') {
                        showPassages(data.data);
                    } else if (data.type === 'answer') {
                        showAnswer(data.data);
                    }
                } catch (err) {
                    console.error('Parse error:', err);
                }
            }
        }

    } catch (error) {
        document.getElementById('loading-06').style.display = 'none';
        showError('06', error.message);
    }
});

function showQueries(queries) {
    const section = document.getElementById('queries-section-06');
    const content = document.getElementById('queries-content-06');

    content.innerHTML = queries.map(q =>
        `<div class="query-item">${q}</div>`
    ).join('');

    section.style.display = 'block';
}

function showPassages(passages) {
    const section = document.getElementById('passages-section-06');
    const content = document.getElementById('passages-content-06');

    content.innerHTML = passages.map((p, i) => `
        <div class="passage" id="passage-${i + 1}">
            <div class="passage-header">
                <span class="passage-number">Passage ${i + 1}</span>
                <span class="passage-score">Score: ${p.score?.toFixed(2) || 'N/A'}</span>
            </div>
            <div class="passage-content">${formatMarkdown(p.content)}</div>
        </div>
    `).join('');

    section.style.display = 'block';
}

function showAnswer(answer) {
    const section = document.getElementById('answer-section-06');
    const content = document.getElementById('answer-content-06');

    // Convert citations to clickable links
    const formattedAnswer = formatMarkdown(answer).replace(
        /\[(\d+)\]/g,
        '<a href="#passage-$1" class="citation">[$1]</a>'
    );

    content.innerHTML = formattedAnswer;
    section.style.display = 'block';
}

// ======================
// DEMO 07: Multi-Agent
// ======================

document.getElementById('search-form-07')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const question = document.getElementById('question-input-07').value.trim();
    if (!question) return;

    // Show loading
    document.getElementById('loading-07').style.display = 'block';
    document.getElementById('results-07').style.display = 'none';
    hideAllSections('07');

    try {
        const response = await fetch('/api/multi-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });

        if (!response.ok) throw new Error('Multi-agent processing failed');

        const data = await response.json();

        document.getElementById('loading-07').style.display = 'none';
        document.getElementById('results-07').style.display = 'block';

        // Show triage
        if (data.triage) {
            showTriage(data.triage);
        }

        // Show agent flow
        if (data.agents && data.agents.length > 0) {
            showAgents(data.agents);
        }

        // Show response
        if (data.finalResponse) {
            showResponse(data.finalResponse);
        }

        // Show ticket if created
        if (data.ticketId) {
            showTicket(data.ticketId);
        }

    } catch (error) {
        document.getElementById('loading-07').style.display = 'none';
        showError('07', error.message);
    }
});

function showTriage(triage) {
    const section = document.getElementById('triage-section-07');
    const content = document.getElementById('triage-content-07');

    content.innerHTML = `
        <div class="triage-item">
            <div class="triage-label">Type</div>
            <div class="triage-value">${triage.type}</div>
        </div>
        ${triage.category ? `
        <div class="triage-item">
            <div class="triage-label">Category</div>
            <div class="triage-value">${triage.category}</div>
        </div>
        ` : ''}
        <div class="triage-item">
            <div class="triage-label">Reason</div>
            <div class="triage-value">${triage.reason}</div>
        </div>
    `;

    section.style.display = 'block';
}

function showAgents(agents) {
    const section = document.getElementById('agents-section-07');
    const content = document.getElementById('agents-content-07');

    content.innerHTML = agents.map((agent, i) => `
        ${i > 0 ? '<span class="agent-arrow">→</span>' : ''}
        <div class="agent-badge">${agent}</div>
    `).join('');

    section.style.display = 'block';
}

function showResponse(response) {
    const section = document.getElementById('response-section-07');
    const content = document.getElementById('response-content-07');

    content.innerHTML = formatMarkdown(response);
    section.style.display = 'block';
}

function showTicket(ticketId) {
    const section = document.getElementById('ticket-section-07');
    const content = document.getElementById('ticket-content-07');

    content.innerHTML = ticketId;
    section.style.display = 'block';
}

// ======================
// Shared Utilities
// ======================

function hideAllSections(demo) {
    const sections = document.querySelectorAll(`#results-${demo} .section`);
    sections.forEach(s => s.style.display = 'none');
}

function showError(demo, message) {
    const section = document.getElementById(`error-section-${demo}`);
    const content = document.getElementById(`error-content-${demo}`);

    content.textContent = message;
    section.style.display = 'block';
    document.getElementById(`results-${demo}`).style.display = 'block';
}

function formatMarkdown(text) {
    if (!text) return '';

    return text
        // Headings
        .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
        .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
        .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
        .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>');
}
