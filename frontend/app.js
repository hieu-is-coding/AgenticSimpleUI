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
    const templatesListContainer = document.getElementById('templates-list');
    const historyList = document.getElementById('history-list');
    const deleteAllHistoryBtn = document.getElementById('delete-all-history-btn');


    // Template Modal elements
    const templateModal = document.getElementById('template-modal');
    const modalTitle = document.getElementById('template-modal-title');
    const modalTemplateId = document.getElementById('modal-template-id');
    const modalTemplateName = document.getElementById('modal-template-name');
    const modalTemplateDesc = document.getElementById('modal-template-desc');
    const modalTemplateSystem = document.getElementById('modal-template-system');
    const modalTemplateExample = document.getElementById('modal-template-example');
    const closeTemplateBtn = document.getElementById('close-template-btn');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    const deleteTemplateBtn = document.getElementById('delete-template-btn');
    const addTemplateBtn = document.getElementById('add-template-btn');

    let stepCounters = { thought: 0, action: 0, observation: 0 };
    let activityHistory = [];
    
    let currentTemplates = [];

    // Fetch default prompts placeholder
    function loadDefaults() {
        fetch('/api/defaults')
            .then(res => res.json())
            .then(data => {
                if (data.system_prompt) systemPromptInput.placeholder = data.system_prompt;
                if (data.example_prompt) examplePromptInput.placeholder = data.example_prompt;
            })
            .catch(err => console.error("Error loading defaults:", err));
    }
    loadDefaults();

    function renderTemplates() {
        templatesListContainer.innerHTML = '';
        currentTemplates.forEach((tpl) => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4>${tpl.name}</h4>
                        <p>${tpl.description}</p>
                    </div>
                    <button class="edit-tpl-btn" data-id="${tpl.id}" style="background: none; border: none; cursor: pointer; color: var(--text-secondary);">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                </div>
            `;
            // clicking the card applies it to the textarea
            card.addEventListener('click', (e) => {
                if(e.target.closest('.edit-tpl-btn')) return; // ignore edit button clicks
                systemPromptInput.value = tpl.system_prompt;
                examplePromptInput.value = tpl.example_prompt;
            });
            
            const editBtn = card.querySelector('.edit-tpl-btn');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openTemplateModal(tpl);
            });
            
            templatesListContainer.appendChild(card);
        });
    }

    function loadTemplates() {
        fetch('/api/templates')
            .then(res => res.json())
            .then(data => {
                currentTemplates = data;
                renderTemplates();
            })
            .catch(err => console.error("Error loading templates:", err));
    }
    loadTemplates();

    function openTemplateModal(tpl = null) {
        if (tpl) {
            modalTitle.textContent = "Edit Template";
            modalTemplateId.value = tpl.id;
            modalTemplateName.value = tpl.name;
            modalTemplateDesc.value = tpl.description;
            modalTemplateSystem.value = tpl.system_prompt;
            modalTemplateExample.value = tpl.example_prompt;
            deleteTemplateBtn.style.display = 'block';
        } else {
            modalTitle.textContent = "Add Template";
            modalTemplateId.value = "new_" + Date.now();
            modalTemplateName.value = "";
            modalTemplateDesc.value = "";
            modalTemplateSystem.value = "";
            modalTemplateExample.value = "";
            deleteTemplateBtn.style.display = 'none';
        }
        templateModal.classList.add('active');
    }

    addTemplateBtn.addEventListener('click', () => {
        openTemplateModal();
    });

    closeTemplateBtn.addEventListener('click', () => {
        templateModal.classList.remove('active');
    });

    saveTemplateBtn.addEventListener('click', async () => {
        const id = modalTemplateId.value;
        const index = currentTemplates.findIndex(t => t.id === id);
        const newTpl = {
            id: id,
            name: modalTemplateName.value,
            description: modalTemplateDesc.value,
            system_prompt: modalTemplateSystem.value,
            example_prompt: modalTemplateExample.value
        };

        let newTemplates = [...currentTemplates];
        if (index >= 0) {
            newTemplates[index] = newTpl;
        } else {
            newTemplates.push(newTpl);
        }

        await saveTemplatesToServer(newTemplates);
    });

    deleteTemplateBtn.addEventListener('click', async () => {
        if(!confirm("Are you sure you want to delete this template?")) return;
        const id = modalTemplateId.value;
        const newTemplates = currentTemplates.filter(t => t.id !== id);
        await saveTemplatesToServer(newTemplates);
    });

    async function saveTemplatesToServer(newTemplates) {
        try {
            saveTemplateBtn.textContent = 'Saving...';
            saveTemplateBtn.disabled = true;
            await fetch('/api/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTemplates)
            });
            currentTemplates = newTemplates;
            renderTemplates();
            templateModal.classList.remove('active');
        } catch(e) {
            console.error('Failed to save templates', e);
            alert('Failed to save templates');
        } finally {
            saveTemplateBtn.textContent = 'Save';
            saveTemplateBtn.disabled = false;
        }
    }

    function renderHistoryList() {
        historyList.innerHTML = '';
        activityHistory.forEach((trace) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.style.display = 'flex';
            historyItem.style.justifyContent = 'space-between';
            historyItem.style.alignItems = 'center';
            historyItem.style.cursor = 'pointer';
            
            const textSpan = document.createElement('span');
            textSpan.textContent = trace.question;
            textSpan.style.flex = "1";
            textSpan.style.overflow = "hidden";
            textSpan.style.textOverflow = "ellipsis";
            textSpan.style.whiteSpace = "nowrap";

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '&times;';
            delBtn.style.background = 'transparent';
            delBtn.style.border = 'none';
            delBtn.style.color = '#ef4444';
            delBtn.style.cursor = 'pointer';
            delBtn.style.fontSize = '1.2rem';
            delBtn.style.marginLeft = '8px';
            delBtn.style.display = 'flex';
            delBtn.style.alignItems = 'center';
            delBtn.title = "Delete chat";

            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if(confirm("Delete this history?")) {
                    activityHistory = activityHistory.filter(t => t.id !== trace.id);
                    renderHistoryList();
                    saveHistoryToServer();
                }
            });

            historyItem.appendChild(textSpan);
            historyItem.appendChild(delBtn);

            historyItem.addEventListener('click', () => loadHistoryIntoView(trace));
            historyList.appendChild(historyItem);
        });
    }

    async function saveHistoryToServer() {
        try {
            await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activityHistory)
            });
        } catch (error) {
            console.error('Failed to save history', error);
        }
    }

    function loadHistory() {
        fetch('/api/history')
            .then(res => res.json())
            .then(data => {
                activityHistory = data || [];
                renderHistoryList();
            })
            .catch(err => console.error("Error loading history:", err));
    }
    loadHistory();

    if (deleteAllHistoryBtn) {
        deleteAllHistoryBtn.addEventListener('click', () => {
            if (activityHistory.length === 0) return;
            if (confirm("Are you sure you want to delete all history? This cannot be undone.")) {
                activityHistory = [];
                renderHistoryList();
                saveHistoryToServer();
                
                // Reset the main view if it was displaying history
                chatHistory.innerHTML = `
                    <div class="message system-message">
                        <p>Welcome! Ask a complicated question that requires searching Wikipedia and connecting facts (HotPotQA style).</p>
                        <p>Example: "What year was the director of the movie 'Inception' born?"</p>
                    </div>
                `;
                processContainer.classList.add('hidden');
                processSteps.innerHTML = '';
                stepCounters = { thought: 0, action: 0, observation: 0 };
            }
        });
    }

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
        let currentTrace = { id: Date.now().toString(), question: question, steps: [], answer: null, error: null };
        activityHistory.unshift(currentTrace);
        renderHistoryList();

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
                saveHistoryToServer();
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
