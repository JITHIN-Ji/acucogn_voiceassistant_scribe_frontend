# Frontend (React + Vite)

Minimal React app to connect to the FastAPI backend.

## Quick start

1. Install Node.js (LTS).
2. From `frontend/`:
   - `npm install`
   - Optionally create `.env` with `VITE_API_BASE_URL=http://localhost:5000`
   - `npm run dev`
3. Ensure backend is running. Default assumed: `http://localhost:5000`.

## Endpoints used
- `GET /` (status)
- `POST /process_audio` (multipart: `audio`, optional `session_id`)
- `POST /approve_plan` (JSON: `plan_section`, optional `user_email`, `send_email`, `session_id`)





