# MAHIP — Multi-Agent Healthcare Intelligence Platform

A backend-first B.Tech capstone prototype for healthcare workflow support. The system combines:
- FastAPI backend
- Supabase Auth, Postgres and private Storage
- Patient Interaction Agent
- Medical Report Agent
- Medical Knowledge/RAG Agent
- Chest X-ray ML Agent
- Diagnosis Support Agent
- Healthcare Management Agent
- LangGraph-style orchestration
- React/Vite frontend starter
- Evaluation and model-training scaffolding

## Important scope
This repository is a development/research prototype. It is **not a medical device and does not provide definitive diagnosis or treatment**. Use synthetic/de-identified data during development and require professional review of clinical-support outputs.

## Architecture

```text
React/Vite
    |
    v
FastAPI
    |
    +--> Supabase Auth
    +--> Supabase Database
    +--> Supabase Storage
    |
    +--> Agent Orchestrator
           |
           +--> Patient Agent
           +--> Report Agent
           +--> RAG Agent
           +--> Image Agent
           +--> Diagnosis Support Agent
           +--> Management Agent
```

## 1. Supabase
Run `supabase/schema.sql` in the Supabase SQL Editor.

Create private Storage buckets:
- `medical-reports`
- `medical-images`

Enable Email/Password Auth.

For a backend-only trusted service, place the Supabase server secret/service key only in the backend `.env`. Never expose it to React/browser code.

## 2. Backend

Python 3.10+ recommended.

```bash
cd backend
python -m venv venv
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

Edit `.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVER_KEY=YOUR_SERVER_SECRET_OR_SERVICE_ROLE_KEY
LLM_PROVIDER=mock
OPENAI_API_KEY=
OPENAI_MODEL=
```

`LLM_PROVIDER=mock` lets the backend run without an LLM key. For real LLM output, set `LLM_PROVIDER=openai` and provide an API key/model.

Run:

```bash
uvicorn app.main:app --reload
```

Open:
- http://127.0.0.1:8000
- http://127.0.0.1:8000/docs

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL=http://127.0.0.1:8000` in `frontend/.env`.

## 4. RAG

Put approved, non-identifying medical reference documents in:

```text
data/knowledge/
```

Then run:

```bash
python scripts/ingest_knowledge.py
```

The prototype retriever uses TF-IDF + cosine similarity so it can run locally without a vector database. The interface is deliberately isolated so it can later be replaced with Qdrant/Chroma/pgvector.

## 5. Chest X-ray model

The training script uses an ImageFolder-compatible layout:

```text
datasets/chest_xray/
    train/
        class_a/
        class_b/
    val/
        class_a/
        class_b/
    test/
        class_a/
        class_b/
```

Run:

```bash
python scripts/train_xray.py
```

The trained checkpoint is saved under `models/checkpoints/`.

Do not claim clinical diagnostic performance from a small student dataset. Report sensitivity, specificity, precision, recall, F1 and ROC-AUC where appropriate and clearly describe the dataset and split.

## 6. Main API endpoints

- `GET /health`
- `POST /auth/signup`
- `POST /auth/login`
- `GET /patients/{patient_id}`
- `POST /patients`
- `POST /reports/upload`
- `POST /reports/{report_id}/analyze`
- `POST /images/upload`
- `POST /images/{image_id}/analyze`
- `POST /cases`
- `POST /orchestrator/analyze`
- `POST /appointments`
- `GET /agents/logs/{case_id}`

## 7. Development order

1. Supabase schema/auth/storage
2. FastAPI + Supabase connection
3. Patient/doctor CRUD
4. Report upload/extraction
5. Patient agent
6. RAG
7. X-ray model training/evaluation
8. Image agent
9. Diagnosis-support agent
10. Management agent
11. Orchestrator
12. Frontend
13. Testing and evaluation
14. Deployment/documentation

## 8. Security
- Never commit `.env`.
- Never expose the Supabase server secret/service key to the browser.
- Keep medical Storage buckets private.
- Use synthetic/de-identified data for development.
- Add/verify authorization checks before production use.
- Log agent activity without unnecessarily storing sensitive raw content.
