# Testing & Running the AI Code Analyzer

This document contains all the necessary commands to run both the Next.js frontend and the FastAPI backend for the AI Code Analyzer locally.

## 1. Environment Setup

Before starting the applications, make sure you have your `.env` variables configured. 
In the `/backend` directory, ensure your `.env` file exists with the following:

```env
GROQ_API_KEY=your_groq_api_key_here
DATABASE_URL=your_neon_postgres_url_here
```

## 2. Start the Backend API (FastAPI)

We use FastAPI and `uvicorn` to serve the backend. It uses FAISS for local vector storage and Groq for LLM responses.

1. Open a terminal.
2. Navigate to the `backend/` folder.
3. Activate the virtual environment and start the server:
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
*Note: The backend will be running at `http://localhost:8000`.*

## 3. Start the Frontend (Next.js)

The frontend is a Next.js application that polls the backend API.

1. Open a new terminal.
2. Navigate to the `frontend/` folder.
3. Start the development server:
```bash
cd frontend
npm run dev
```
*Note: The frontend will be accessible at `http://localhost:3000`.*

## 4. End-to-End Testing

1. Open your browser and navigate to `http://localhost:3000`.
2. Input a public GitHub repository URL (e.g., `https://github.com/fastapi/full-stack-fastapi-template`) into the search bar.
3. Click "Analyze".
4. You should see a progress bar indicating:
   - Repository Cloning
   - Parsing and Vector Embedding via FAISS
   - AI Analysis via Groq
5. Once complete, the dashboard will populate with the real Codebase Health, Architecture Summary, Bugs, and Improvements.

## 5. Testing the API Directly (cURL)

If you wish to test the API directly without the frontend, you can use the following `curl` command:

**Submit a Repository:**
```bash
curl -X POST http://localhost:8000/api/analyze \
     -H "Content-Type: application/json" \
     -d '{"url": "https://github.com/fastapi/full-stack-fastapi-template"}'
```

**Check Job Status:**
(Replace `<job_id>` with the ID returned by the POST command)
```bash
curl http://localhost:8000/api/jobs/<job_id>/status
```
