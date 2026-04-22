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
    const modalWrapper = document.getElementById('template-modal-wrapper');
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
    // Prompt split-panel elements
    const systemPreviewBtn = document.getElementById('system-prompt-preview-btn');
    const examplePreviewBtn = document.getElementById('example-prompt-preview-btn');
    const promptEditorPanel = document.getElementById('prompt-editor-panel');
    const promptPanelTitle = document.getElementById('prompt-panel-title');
    const promptPanelDone = document.getElementById('prompt-panel-done');
    const promptPanelTextarea = document.getElementById('prompt-panel-textarea');
    // ── Premium UI Configuration & State ──
    const UI_CONFIG = {
        modalWidth: 560,
        panelWidth: 420,
        animationDuration: 400,
        gap: 14
    };

    // ── Utilities ──
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Expose variables for debugging "deeply"
    window.AgenticUI = {
        getConfig: () => UI_CONFIG,
        getTemplates: () => currentTemplates,
        getHistory: () => activityHistory,
        getActiveField: () => activePromptField
    };

    let activePromptField = null; 
    let stepCounters = { thought: 0, action: 0, observation: 0 };
    let activityHistory = [];
    let currentTemplates = [];
    let currentQuestions = [];

    // Question Set Modal elements
    const questionSetBtn = document.getElementById('question-set-btn');
    const questionSetModal = document.getElementById('question-set-modal');
    const closeQuestionSetBtn = document.getElementById('close-question-set-btn');
    const questionsListContainer = document.getElementById('questions-list-container');
    const newQuestionTextInput = document.getElementById('new-question-text');
    const addQuestionBtn = document.getElementById('add-question-btn');

    // ── Question Set Functions ──
    function renderQuestionsList() {
        questionsListContainer.innerHTML = '';
        if (currentQuestions.length === 0) {
            questionsListContainer.innerHTML = '<p style="color: #64748b; text-align: center; margin-top: 1rem;">No questions in set yet.</p>';
            return;
        }

        currentQuestions.forEach((q, index) => {
            const item = document.createElement('div');
            item.style.background = 'rgba(30, 41, 59, 0.5)';
            item.style.border = '1px solid #334155';
            item.style.borderRadius = '8px';
            item.style.padding = '0.75rem';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.gap = '10px';
            item.style.cursor = 'pointer';
            item.className = 'question-item-card';

            const textSpan = document.createElement('span');
            textSpan.textContent = q.text;
            textSpan.style.flex = '1';
            textSpan.style.color = '#f8fafc';
            textSpan.style.fontSize = '0.9rem';

            const actionsDiv = document.createElement('div');
            actionsDiv.style.display = 'flex';
            actionsDiv.style.gap = '8px';

            const editBtn = document.createElement('button');
            editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
            editBtn.style.background = 'transparent';
            editBtn.style.border = 'none';
            editBtn.style.color = '#94a3b8';
            editBtn.style.cursor = 'pointer';
            editBtn.title = "Edit question";
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newText = prompt("Edit question:", q.text);
                if (newText !== null && newText.trim() !== "") {
                    currentQuestions[index].text = newText.trim();
                    renderQuestionsList();
                    saveQuestionsToServer();
                }
            });

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '&times;';
            delBtn.style.background = 'transparent';
            delBtn.style.border = 'none';
            delBtn.style.color = '#ef4444';
            delBtn.style.cursor = 'pointer';
            delBtn.style.fontSize = '1.2rem';
            delBtn.title = "Delete question";
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm("Delete this question from set?")) {
                    currentQuestions.splice(index, 1);
                    renderQuestionsList();
                    saveQuestionsToServer();
                }
            });

            item.appendChild(textSpan);
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(delBtn);
            item.appendChild(actionsDiv);

            item.addEventListener('click', () => {
                input.value = q.text;
                questionSetModal.classList.remove('active');
                input.focus();
            });

            questionsListContainer.appendChild(item);
        });
    }

    async function loadQuestions() {
        try {
            const res = await fetch('/api/questions');
            currentQuestions = await res.json();
            renderQuestionsList();
        } catch (err) {
            console.error("Error loading questions:", err);
        }
    }

    async function saveQuestionsToServer() {
        try {
            await fetch('/api/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentQuestions)
            });
        } catch (err) {
            console.error("Error saving questions:", err);
        }
    }

    questionSetBtn.addEventListener('click', () => {
        loadQuestions();
        questionSetModal.classList.add('active');
    });

    closeQuestionSetBtn.addEventListener('click', () => {
        questionSetModal.classList.remove('active');
    });

    addQuestionBtn.addEventListener('click', () => {
        const text = newQuestionTextInput.value.trim();
        if (text) {
            currentQuestions.push({ text });
            newQuestionTextInput.value = '';
            renderQuestionsList();
            saveQuestionsToServer();
        }
    });

    newQuestionTextInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addQuestionBtn.click();
        }
    });

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

    // ── Prompt preview helper ──────────────────────────────────
    function updatePreviewBtn(field) {
        const btn = field === 'system' ? systemPreviewBtn : examplePreviewBtn;
        const ta  = field === 'system' ? modalTemplateSystem : modalTemplateExample;
        const span = btn.querySelector('.preview-text');
        const val = ta.value.trim();
        if (val) {
            // Show first non-empty line as preview, truncated
            const firstLine = val.split('\n').find(l => l.trim()) || val;
            span.textContent = firstLine.length > 80 ? firstLine.slice(0, 80) + '…' : firstLine;
            span.classList.remove('preview-placeholder');
        } else {
            span.textContent = field === 'system'
                ? 'Click to edit system prompt…'
                : 'Click to edit example prompt…';
            span.classList.add('preview-placeholder');
        }
    }

    // ── Prompt split-panel open / close ───────────────────────
    function openPromptPanel(field) {
        // Sync panel textarea from the hidden backing textarea
        const ta = field === 'system' ? modalTemplateSystem : modalTemplateExample;
        promptPanelTitle.textContent = field === 'system' ? 'SYSTEM PROMPT' : 'EXAMPLE PROMPT';
        promptPanelTextarea.value = ta.value;
        activePromptField = field;

        // Highlight active button
        systemPreviewBtn.classList.toggle('active-prompt', field === 'system');
        examplePreviewBtn.classList.toggle('active-prompt', field === 'example');

        promptEditorPanel.classList.add('visible');
        modalWrapper.classList.add('panel-open');
        setTimeout(() => promptPanelTextarea.focus(), 50);
    }

    function closePromptPanel() {
        if (!activePromptField) return;
        // Write value back to hidden textarea and refresh preview
        const ta = activePromptField === 'system' ? modalTemplateSystem : modalTemplateExample;
        ta.value = promptPanelTextarea.value;
        updatePreviewBtn(activePromptField);

        systemPreviewBtn.classList.remove('active-prompt');
        examplePreviewBtn.classList.remove('active-prompt');
        promptEditorPanel.classList.remove('visible');
        modalWrapper.classList.remove('panel-open');
        activePromptField = null;
    }

    systemPreviewBtn.addEventListener('click', () => openPromptPanel('system'));
    examplePreviewBtn.addEventListener('click', () => openPromptPanel('example'));
    promptPanelDone.addEventListener('click', closePromptPanel);

    // Auto-save on prompt panel input
    promptPanelTextarea.addEventListener('input', () => {
        if (!activePromptField) return;
        // Sync to hidden textarea
        const ta = activePromptField === 'system' ? modalTemplateSystem : modalTemplateExample;
        ta.value = promptPanelTextarea.value;
        // Update preview button text
        updatePreviewBtn(activePromptField);
        // Trigger debounced save
        debouncedSaveTemplates();
    });

    // Auto-save on metadata input
    modalTemplateName.addEventListener('input', () => debouncedSaveTemplates());
    modalTemplateDesc.addEventListener('input', () => debouncedSaveTemplates());

    const templateSaveStatus = document.getElementById('template-save-status');

    const debouncedSaveTemplates = debounce(async () => {
        const id = modalTemplateId.value;
        if (!id) return;

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

        templateSaveStatus.textContent = 'Saving...';
        templateSaveStatus.style.opacity = '1';
        templateSaveStatus.style.color = '#64748b';
        
        await saveTemplatesToServer(newTemplates, false);
        
        setTimeout(() => {
            if (templateSaveStatus.textContent === 'Saved') return; // already updated?
            templateSaveStatus.textContent = 'Saved';
            setTimeout(() => {
                if (templateSaveStatus.textContent === 'Saved') {
                    templateSaveStatus.style.opacity = '0';
                }
            }, 2000);
        }, 200);
    }, 1000);

    // ── Template modal open ───────────────────────────────────
    function openTemplateModal(tpl = null) {
        // Always close the prompt panel first
        promptEditorPanel.classList.remove('visible');
        modalWrapper.classList.remove('panel-open');
        activePromptField = null;

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
        updatePreviewBtn('system');
        updatePreviewBtn('example');
        templateModal.classList.add('active');
    }

    addTemplateBtn.addEventListener('click', () => {
        openTemplateModal();
    });

    closeTemplateBtn.addEventListener('click', () => {
        closePromptPanel();
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

    async function saveTemplatesToServer(newTemplates, closeModal = true) {
        try {
            if (closeModal) {
                saveTemplateBtn.textContent = 'Saving...';
                saveTemplateBtn.disabled = true;
            }
            
            const response = await fetch('/api/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTemplates)
            });

            if (!response.ok) throw new Error('Failed to save');

            currentTemplates = newTemplates;
            renderTemplates();
            
            if (closeModal) {
                templateModal.classList.remove('active');
            } else {
                if (templateSaveStatus) {
                    templateSaveStatus.textContent = 'Saved';
                }
            }
        } catch(e) {
            console.error('Failed to save templates', e);
            if (closeModal) {
                alert('Failed to save templates');
            } else if (templateSaveStatus) {
                templateSaveStatus.textContent = 'Save failed';
                templateSaveStatus.style.color = '#ef4444';
            }
        } finally {
            if (closeModal) {
                saveTemplateBtn.textContent = 'Save';
                saveTemplateBtn.disabled = false;
            }
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
