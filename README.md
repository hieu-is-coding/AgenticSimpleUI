# AgenticSimpleUI

A simple, local, web-based User Interface to test and visualize the reasoning process of the ReAct (Reasoning and Acting) framework (from the original `hotpotqa.ipynb`).

## Architecture
- **Backend (`backend/`)**: Built with FastAPI. It encapsulates the simulated Wikipedia environment (`WikiEnv`), integrates with OpenAI's API, and streams the real-time Thoughts, Actions, and Observations to the client using Server-Sent Events (SSE).
- **Frontend (`frontend/`)**: Built with Vanilla HTML, CSS, and JS for a sleek, responsive design. It connects to the streaming endpoint to dynamically render the agent's step-by-step process.

## Prerequisites
1. Ensure your `OPENAI_API_KEY` is loaded securely (by default, it will source from `.env`).
2. Have Python installed.

## Installation

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt 
```

## Running the Application

To start the backend server, run the following command:

```bash
uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

Next, open your web browser and navigate to:
**[http://localhost:8000](http://localhost:8000)**

Type a complex question (like you would see in HotPotQA) and observe how the agent searches Wikipedia to figure out the answer!
