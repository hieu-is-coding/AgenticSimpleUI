import os
import sys
import json
import openai
import requests
from dotenv import load_dotenv

from backend import wikienv
from backend import wrappers

load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), '../.env')))
openai.api_key = os.environ.get("OPENAI_API_KEY")

prompt_file = os.path.abspath(os.path.join(os.path.dirname(__file__), 'prompts_naive.json'))
with open(prompt_file, 'r') as f:
    prompt_dict = json.load(f)

webthink_examples = prompt_dict['webthink_simple6']
instruction = """Solve a question answering task with interleaving Thought, Action, Observation steps. Thought can reason about the current situation, and Action can be three types: 
(1) Search[entity], which searches the exact entity on Wikipedia and returns the first paragraph if it exists. If not, it will return some similar entities to search.
(2) Lookup[keyword], which returns the next sentence containing keyword in the current passage.
(3) Finish[answer], which returns the answer and finishes the task.
Here are some examples.
"""
webthink_prompt = instruction + webthink_examples

def llm(prompt, stop=["\n"]):
    response = openai.ChatCompletion.create(
      model="gpt-4o-mini",
      messages=[{"role": "user", "content": prompt}],
      temperature=0,
      max_tokens=100,
      top_p=1,
      frequency_penalty=0.0,
      presence_penalty=0.0,
      stop=stop
    )
    return response["choices"][0]["message"]["content"]

def step(env, action):
    attempts = 0
    while attempts < 10:
        try:
            return env.step(action)
        except requests.exceptions.Timeout:
            attempts += 1
    return "Timeout", 0, True, {}

def stream_webthink(question, system_prompt=None, example_prompt=None):
    def format_sse(msg_type, content):
        return f"data: {json.dumps({'type': msg_type, 'content': content})}\n\n"

    try:
        env = wikienv.WikiEnv()
        env.reset()
        
        inst = system_prompt if system_prompt and system_prompt.strip() else instruction
        ex = example_prompt if example_prompt and example_prompt.strip() else webthink_examples
        prompt = inst + "\n" + ex + f"\nQuestion: {question}\n"
        
        yield format_sse("info", f"Question: {question}")
        
        n_calls, n_badcalls = 0, 0
        done = False
        info = {}
        
        for i in range(1, 8):
            n_calls += 1
            yield format_sse("thinking", f"Agent is thinking (Step {i})...")
            
            thought_action = llm(prompt + f"Thought {i}:", stop=[f"\nObservation {i}:"])
            
            try:
                thought, action = thought_action.strip().split(f"\nAction {i}: ")
            except Exception:
                n_badcalls += 1
                n_calls += 1
                thought_parts = thought_action.strip().split('\n')
                thought = thought_parts[0] if len(thought_parts) > 0 else ""
                action = llm(prompt + f"Thought {i}: {thought}\nAction {i}:", stop=["\n"]).strip()
            
            yield format_sse("thought", thought)
            yield format_sse("action", action)
            
            yield format_sse("thinking", "Waiting for Wikipedia environment...")
            obs, r, done, info = step(env, action[0].lower() + action[1:])
            obs = obs.replace('\\n', '')
            
            yield format_sse("observation", obs)
            
            step_str = f"Thought {i}: {thought}\nAction {i}: {action}\nObservation {i}: {obs}\n"
            prompt += step_str
            
            if done:
                break
                
        if not done:
            obs, r, done, info = step(env, "finish[]")
            yield format_sse("info", "Reached max steps. Finishing task.")
            
        final_answer = info.get("answer", action.replace("Finish[", "").replace("finish[", "").replace("]", "") if "finish[" in action.lower() else "No specific answer returned")
        yield format_sse("done", final_answer)
    except Exception as e:
        yield format_sse("error", str(e))
