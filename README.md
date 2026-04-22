# AgenticSimpleUI

A simple, local, web-based User Interface to test and visualize the reasoning process of the ReAct (Reasoning and Acting) framework (from the original `hotpotqa.ipynb`).

## Prerequisites
1. Ensure your `OPENAI_API_KEY` is loaded securely (by default, it will source from `.env`).
2. Have Python installed.

## Installation

```bash (for Windows)
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
