from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import os
import os
from backend.react_engine import stream_webthink
from backend.prompt_templates import instruction, webthink_examples

app = FastAPI()

class ChatRequest(BaseModel):
    question: str
    system_prompt: Optional[str] = None
    example_prompt: Optional[str] = None

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint that streams the steps of the ReAct reasoning loop.
    Returns Server-Sent Events (SSE) content format.
    """
    return StreamingResponse(
        stream_webthink(request.question, request.system_prompt, request.example_prompt), 
        media_type="text/event-stream"
    )

@app.get("/api/defaults")
async def defaults_endpoint():
    """
    Returns the default instruction and webthink_examples.
    """
    from backend import prompt_templates
    return {
        "system_prompt": prompt_templates.instruction,
        "example_prompt": prompt_templates.webthink_examples
    }

@app.get("/api/templates")
async def templates_get_endpoint():
    from backend import prompt_templates
    return prompt_templates.ui_templates

@app.post("/api/templates")
async def templates_post_endpoint(templates: list[dict]):
    from backend import prompt_templates
    prompt_templates.save_ui_templates(templates)
    return {"status": "success"}

import json

@app.get("/api/history")
async def history_get_endpoint():
    history_path = os.path.join(os.path.dirname(__file__), "prompts/chat_history.json")
    if os.path.exists(history_path):
        with open(history_path, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

@app.post("/api/history")
async def history_post_endpoint(history: list[dict]):
    history_path = os.path.join(os.path.dirname(__file__), "prompts/chat_history.json")
    with open(history_path, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=4)
    return {"status": "success"}

@app.get("/api/questions")
async def questions_get_endpoint():
    questions_path = os.path.join(os.path.dirname(__file__), "prompts/question_set.json")
    if os.path.exists(questions_path):
        with open(questions_path, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

@app.post("/api/questions")
async def questions_post_endpoint(questions: list[dict]):
    questions_path = os.path.join(os.path.dirname(__file__), "prompts/question_set.json")
    with open(questions_path, "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=4)
    return {"status": "success"}

class NoCacheStaticFiles(StaticFiles):
    def is_not_modified(self, response_headers, request_headers) -> bool:
        return False

# Mount frontend
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend")
# Create folder if it doesn't exist so mounting won't error out prematurely
os.makedirs(frontend_path, exist_ok=True)
app.mount("/", NoCacheStaticFiles(directory=frontend_path, html=True), name="frontend")
