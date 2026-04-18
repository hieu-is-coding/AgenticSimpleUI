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
    let stepCounters = { thought: 0, action: 0, observation: 0 };

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
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
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
                                handleServerEvent(json);
                            } catch (e) {
                                console.error('Error parsing SSE json', list, e);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
            handleServerEvent({type: 'error', content: error.message});
        } finally {
            input.disabled = false;
            submitBtn.disabled = false;
            input.focus();
            scrollToBottom();
        }
    });

    function handleServerEvent(event) {
        const { type, content } = event;
        
        if (type === 'done' || type === 'error') {
            loadingIndicator.classList.add('hidden');
            
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

    function scrollToBottom() {
        mainContainer.scrollTop = mainContainer.scrollHeight;
    }
});
