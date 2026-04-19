import os
import json

base_dir = os.path.dirname(__file__)
prompt_file = os.path.abspath(os.path.join(base_dir, 'prompts_naive.json'))
custom_prompt_file = os.path.abspath(os.path.join(base_dir, 'custom_prompts.json'))

with open(prompt_file, 'r') as f:
    prompt_dict = json.load(f)

webthink_examples = prompt_dict['webthink_simple6']
instruction = """Solve a question answering task with interleaving Thought, Action, Observation steps. Thought can reason about the current situation, and Action can be three types: 
(1) Search[entity], which searches the exact entity on Wikipedia and returns the first paragraph if it exists. If not, it will return some similar entities to search.
(2) Lookup[keyword], which returns the next sentence containing keyword in the current passage.
(3) Finish[answer], which returns the answer and finishes the task.
Here are some examples.
"""


default_ui_templates = [
    {
        "id": "direct-answer",
        "name": "Direct Answer",
        "description": "No tools, zero-shot answer.",
        "system_prompt": "Answer the question as concisely as possible directly without any reasoning steps. Do not use search or any tools. Just output the final answer.",
        "example_prompt": ""
    },
    {
        "id": "detailed-explainer",
        "name": "Detailed Explainer",
        "description": "Forces a very detailed reasoning trace before the final answer.",
        "system_prompt": "Solve a question answering task with interleaving Thought, Action, Observation steps. You must provide a highly detailed step-by-step explainer.",
        "example_prompt": ""
    }
]

ui_templates = default_ui_templates.copy()

if os.path.exists(custom_prompt_file):
    try:
        with open(custom_prompt_file, 'r') as f:
            ui_templates = json.load(f)
    except Exception:
        pass

def save_ui_templates(templates):
    global ui_templates
    ui_templates = templates
    with open(custom_prompt_file, 'w') as f:
        json.dump(ui_templates, f, indent=4)
