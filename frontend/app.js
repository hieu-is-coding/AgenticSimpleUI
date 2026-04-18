document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('question-input');
    const submitBtn = document.getElementById('submit-btn');
    const chatHistory = document.getElementById('chat-history');
    const processContainer = document.getElementById('current-agent-process');
    const processSteps = document.getElementById('process-steps');
    const loadingIndicator = document.getElementById('loading-indicator');
    const loadingText = document.getElementById('loading-text');
    const mainContainer = document.getElementById('chat-container');
    const refreshBtn = document.getElementById('refresh-chat-btn');
    const systemPromptInput = document.getElementById('system-prompt');
    const examplePromptInput = document.getElementById('example-prompt');
    const templatesList = document.querySelectorAll('.template-card');
    const historyList = document.getElementById('history-list');
    let stepCounters = { thought: 0, action: 0, observation: 0 };
    let activityHistory = [];
    
    // Fetch default prompts and set placeholders
    fetch('/api/defaults')
        .then(res => res.json())
        .then(data => {
            if (data.system_prompt) systemPromptInput.placeholder = data.system_prompt;
            if (data.example_prompt) examplePromptInput.placeholder = data.example_prompt;
        })
        .catch(err => console.error("Error loading defaults:", err));
    
    // Prompt templates clicking
    templatesList.forEach(card => {
        card.addEventListener('click', () => {
            systemPromptInput.value = card.getAttribute('data-system');
            examplePromptInput.value = card.getAttribute('data-example');
        });
    });

    refreshBtn.addEventListener('click', () => {
        chatHistory.innerHTML = `
            <div class="message system-message">
                <p>Welcome! Ask a complicated question that requires searching Wikipedia and connecting facts (HotPotQA style).</p>
                <p>Example: "What year was the director of the movie 'Inception' born?"</p>
            </div>
        `;
        processContainer.classList.add('hidden');
        processSteps.innerHTML = '';
        stepCounters = { thought: 0, action: 0, observation: 0 };
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const question = input.value.trim();
        if (!question) return;

        // Reset UI
        input.value = '';
        input.disabled = true;
        submitBtn.disabled = true;
        stepCounters = { thought: 0, action: 0, observation: 0 };
        
        // Add user message
        const userMsgDiv = document.createElement('div');
        userMsgDiv.className = 'message user-message';
        userMsgDiv.textContent = question;
        chatHistory.appendChild(userMsgDiv);
        
        // Add to left sidebar history tracking
        let currentTrace = { question: question, steps: [], answer: null, error: null };
        activityHistory.unshift(currentTrace);

        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.textContent = question;
        historyItem.style.cursor = 'pointer';
        historyItem.addEventListener('click', () => loadHistoryIntoView(currentTrace));
        historyList.prepend(historyItem);

        // Prep reasoning panel
        // Hide it briefly then reset and show
        processContainer.classList.add('hidden');
        setTimeout(() => {
            processSteps.innerHTML = '';
            processContainer.classList.remove('hidden');
            loadingIndicator.classList.remove('hidden');
            loadingText.textContent = "Initializing Agent Environment...";
            scrollToBottom();
        }, 100);

        try {
            const system_prompt = systemPromptInput.value.trim() || null;
            const example_prompt = examplePromptInput.value.trim() || null;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, system_prompt, example_prompt })
            });

            if (!response.body) throw new Error('ReadableStream not yet supported in this browser.');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let done = false;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    // SSE events are separated by \n\n
                    const lines = chunk.split('\n\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const dataStr = line.substring(6);
                                const json = JSON.parse(dataStr);
                                handleServerEvent(json, currentTrace);
                            } catch (e) {
                                console.error('Error parsing SSE json', line, e);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
            handleServerEvent({type: 'error', content: error.message}, currentTrace);
        } finally {
            input.disabled = false;
            submitBtn.disabled = false;
            input.focus();
            scrollToBottom();
        }
    });

    function handleServerEvent(event, currentTrace) {
        const { type, content } = event;
        
        if (type === 'done' || type === 'error') {
            loadingIndicator.classList.add('hidden');
            if (currentTrace) {
                if (type === 'done') currentTrace.answer = content;
                if (type === 'error') currentTrace.error = content;
            }
            
            const agentMsgDiv = document.createElement('div');
            agentMsgDiv.className = 'message agent-message';
            if (type === 'error') {
                agentMsgDiv.innerHTML = `<strong>Error:</strong> ${content}`;
            } else if (!content || content.trim() === "" || content === "No specific answer returned") {
                agentMsgDiv.innerHTML = `<strong>No Answer</strong>`;
            } else {
                agentMsgDiv.innerHTML = `<strong>Final Answer:</strong> ${content}`;
            }
            
            // Append right above the process card but keep process card visible
            chatHistory.appendChild(agentMsgDiv);
            
            // Small stylistic adjustment
            processContainer.style.opacity = '0.7';
            
        } else if (type === 'thought' || type === 'action' || type === 'observation') {
            stepCounters[type]++;
            if (currentTrace) currentTrace.steps.push({ type, content });

            const stepDiv = document.createElement('div');
            stepDiv.className = `step-item step-${type}`;
            
            const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
            stepDiv.innerHTML = `<strong>${typeLabel} ${stepCounters[type]}:</strong> ${content}`;
            
            processSteps.appendChild(stepDiv);
            processContainer.style.opacity = '1';
            
        } else if (type === 'thinking' || type === 'info') {
            loadingText.textContent = content;
        }

        scrollToBottom();
    }

    function loadHistoryIntoView(trace) {
        chatHistory.innerHTML = '';
        const userMsgDiv = document.createElement('div');
        userMsgDiv.className = 'message user-message';
        userMsgDiv.textContent = trace.question;
        chatHistory.appendChild(userMsgDiv);

        processSteps.innerHTML = '';
        stepCounters = { thought: 0, action: 0, observation: 0 };
        
        trace.steps.forEach(step => {
            stepCounters[step.type]++;
            const stepDiv = document.createElement('div');
            stepDiv.className = `step-item step-${step.type}`;
            const typeLabel = step.type.charAt(0).toUpperCase() + step.type.slice(1);
            stepDiv.innerHTML = `<strong>${typeLabel} ${stepCounters[step.type]}:</strong> ${step.content}`;
            processSteps.appendChild(stepDiv);
        });

        if (trace.steps.length > 0) {
            processContainer.classList.remove('hidden');
        } else {
            processContainer.classList.add('hidden');
        }

        loadingIndicator.classList.add('hidden');

        if (trace.error || trace.answer !== null) {
            const agentMsgDiv = document.createElement('div');
            agentMsgDiv.className = 'message agent-message';
            if (trace.error) {
                agentMsgDiv.innerHTML = `<strong>Error:</strong> ${trace.error}`;
            } else if (!trace.answer || trace.answer.trim() === "" || trace.answer === "No specific answer returned") {
                agentMsgDiv.innerHTML = `<strong>No Answer</strong>`;
            } else {
                agentMsgDiv.innerHTML = `<strong>Final Answer:</strong> ${trace.answer}`;
            }
            chatHistory.appendChild(agentMsgDiv);
            processContainer.style.opacity = '0.7';
        }

        scrollToBottom();
    }

    function scrollToBottom() {
        mainContainer.scrollTop = mainContainer.scrollHeight;
    }
});
