// DOM Elements
const searchForm = document.getElementById('searchForm');
const questionInput = document.getElementById('questionInput');
const searchBtn = document.getElementById('searchBtn');
const results = document.getElementById('results');

// Section elements
const querySection = document.getElementById('querySection');
const passagesSection = document.getElementById('passagesSection');
const answerSection = document.getElementById('answerSection');
const errorSection = document.getElementById('errorSection');

// Loading elements
const loadingQueries = document.getElementById('loadingQueries');
const loadingPassages = document.getElementById('loadingPassages');
const loadingAnswer = document.getElementById('loadingAnswer');

// Content elements
const subQueries = document.getElementById('subQueries');
const passages = document.getElementById('passages');
const finalAnswer = document.getElementById('finalAnswer');
const errorMessage = document.getElementById('errorMessage');

// Example question buttons
const exampleBtns = document.querySelectorAll('.example-btn');

// Event Listeners
searchForm.addEventListener('submit', handleSearch);

exampleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const question = btn.getAttribute('data-question');
        questionInput.value = question;
        // Trigger form submission
        searchForm.requestSubmit();
    });
});

// Main search handler
async function handleSearch(e) {
    e.preventDefault();
    e.stopPropagation();

    const question = questionInput.value.trim();
    if (!question) {
        console.log('No question entered');
        return;
    }

    console.log('Searching for:', question);

    // Reset UI
    resetUI();
    results.classList.add('active');
    searchBtn.disabled = true;
    searchBtn.textContent = 'Processing...';

    try {
        const response = await fetch('http://localhost:3000/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // Process all complete lines
            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (line) {
                    try {
                        const data = JSON.parse(line);
                        handleStreamData(data);
                    } catch (err) {
                        console.error('Error parsing JSON:', err);
                    }
                }
            }

            // Keep the last incomplete line in buffer
            buffer = lines[lines.length - 1];
        }

    } catch (error) {
        showError(error.message);
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = 'Search';
    }
}

// Handle streamed data
function handleStreamData(data) {
    switch (data.type) {
        case 'queries':
            showSubQueries(data.data);
            break;
        case 'passages':
            showPassages(data.data);
            break;
        case 'answer':
            showAnswer(data.data);
            break;
        case 'error':
            showError(data.error);
            break;
    }
}

// Display sub-queries
function showSubQueries(queries) {
    querySection.style.display = 'block';
    loadingQueries.style.display = 'none';

    subQueries.innerHTML = '';
    queries.forEach((query, index) => {
        const div = document.createElement('div');
        div.className = 'sub-query';
        div.textContent = `${index + 1}. ${query}`;
        subQueries.appendChild(div);
    });
}

// Display passages
function showPassages(passageList) {
    passagesSection.style.display = 'block';
    loadingPassages.style.display = 'none';

    passages.innerHTML = '';
    passageList.forEach((passage, index) => {
        const div = document.createElement('div');
        div.className = 'passage';
        div.id = `passage-${index + 1}`; // Add ID for linking

        // Format content with markdown rendering
        const formattedContent = formatMarkdown(escapeHtml(passage.content));

        div.innerHTML = `
            <div class="passage-header">
                <span class="passage-id">[${index + 1}]</span>
                <span class="passage-title">${escapeHtml(passage.title)}</span>
            </div>
            <div class="passage-content">${formattedContent}</div>
        `;

        passages.appendChild(div);
    });

    // Show answer section with loading state
    answerSection.style.display = 'block';
    loadingAnswer.style.display = 'flex';
}

// Helper function to format markdown
function formatMarkdown(text) {
    return text
        // Headings: ### Heading
        .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
        .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
        .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
        .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
        // Bold text: **text** or __text__
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic text: *text* or _text_
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Line breaks: convert \n to <br>
        .replace(/\n/g, '<br>')
        // Numbered lists: 1. item
        .replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>')
        // Wrap lists in <ol> tags
        .replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>')
        // Bullet lists: - item or * item
        .replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
}

// Display final answer
function showAnswer(answer) {
    loadingAnswer.style.display = 'none';

    // Convert markdown to HTML
    let formattedAnswer = formatMarkdown(answer);

    // Replace citation markers [1], [2] with clickable links
    formattedAnswer = formattedAnswer.replace(/\[(\d+)\]/g, '<a href="#passage-$1" class="citation">[$1]</a>');

    finalAnswer.innerHTML = formattedAnswer;
}

// Show error
function showError(message) {
    errorSection.style.display = 'block';
    errorMessage.textContent = message;

    // Hide other sections
    querySection.style.display = 'none';
    passagesSection.style.display = 'none';
    answerSection.style.display = 'none';
}

// Reset UI
function resetUI() {
    results.classList.remove('active');

    // Hide all sections
    querySection.style.display = 'none';
    passagesSection.style.display = 'none';
    answerSection.style.display = 'none';
    errorSection.style.display = 'none';

    // Show loading states
    loadingQueries.style.display = 'flex';
    loadingPassages.style.display = 'flex';
    loadingAnswer.style.display = 'flex';

    // Clear content
    subQueries.innerHTML = '';
    passages.innerHTML = '';
    finalAnswer.innerHTML = '';
    errorMessage.textContent = '';
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
