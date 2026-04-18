from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import os
import os
from backend.react_engine import stream_webthink, instruction, webthink_examples

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
    return {
        "system_prompt": instruction,
        "example_prompt": webthink_examples
    }

class NoCacheStaticFiles(StaticFiles):
    def is_not_modified(self, response_headers, request_headers) -> bool:
        return False

# Mount frontend
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend")
# Create folder if it doesn't exist so mounting won't error out prematurely
os.makedirs(frontend_path, exist_ok=True)
app.mount("/", NoCacheStaticFiles(directory=frontend_path, html=True), name="frontend")
