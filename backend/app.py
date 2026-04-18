from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
from backend.react_engine import stream_webthink

app = FastAPI()

class ChatRequest(BaseModel):
    question: str

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint that streams the steps of the ReAct reasoning loop.
    Returns Server-Sent Events (SSE) content format.
    """
    return StreamingResponse(
        stream_webthink(request.question), 
        media_type="text/event-stream"
    )

class NoCacheStaticFiles(StaticFiles):
    def is_not_modified(self, response_headers, request_headers) -> bool:
        return False

# Mount frontend
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend")
# Create folder if it doesn't exist so mounting won't error out prematurely
os.makedirs(frontend_path, exist_ok=True)
app.mount("/", NoCacheStaticFiles(directory=frontend_path, html=True), name="frontend")
