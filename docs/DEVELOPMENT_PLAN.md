# MAHIP Development Plan

## Phase 1 — Foundation
- Supabase database
- Email/password Auth
- Private Storage buckets
- FastAPI configuration
- Health endpoint
- Environment secrets

## Phase 2 — Core backend
- Patient CRUD
- Doctor listing
- Appointments
- Report uploads
- Image uploads
- Case records
- Agent logs

## Phase 3 — Agents
1. Patient Interaction Agent
2. Medical Report Agent
3. RAG/Knowledge Agent
4. Medical Image Agent
5. Diagnosis Support Agent
6. Healthcare Management Agent

## Phase 4 — Orchestration
Use a shared case state and explicit agent nodes/edges. Log each agent execution.

## Phase 5 — ML
- Prepare public/de-identified chest X-ray data.
- Define a limited set of classes.
- Split train/validation/test without patient leakage.
- Fine-tune a pretrained CNN.
- Evaluate sensitivity, specificity, precision, recall, F1 and ROC-AUC where applicable.
- Save model version and class mapping.

## Phase 6 — RAG
- Curate authoritative sources.
- Record source name, publisher, date and URL.
- Chunk documents.
- Build retrieval index.
- Evaluate retrieval relevance and groundedness.

## Phase 7 — Frontend
- Patient dashboard
- Doctor dashboard
- Case view
- Report/image upload
- Appointment workflow
- Agent trace view for demonstration

## Phase 8 — Evaluation
Compare a single-model baseline with the orchestrated workflow on a defined test set. Report task completion, groundedness, response time, routing behavior and errors.

## Phase 9 — Documentation
- SRS
- Architecture
- Database ER diagram
- Methodology
- Experiments
- Results
- Limitations
- Ethics/security
- Paper
- PPT
- Viva questions
