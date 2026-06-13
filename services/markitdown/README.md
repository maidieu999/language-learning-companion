# MarkItDown converter service

Internal HTTP service that converts uploaded PDF and DOCX files to Markdown for the NestJS API.

## Run locally

```bash
cd services/markitdown
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Docker

```bash
docker compose up -d markitdown
```

## API

- `GET /health` — liveness check
- `POST /convert` — `multipart/form-data` field `file`; returns `{ "markdown": "..." }`

Example:

```bash
curl -F "file=@lesson.pdf" http://localhost:8000/convert
```

## Config

- `MAX_UPLOAD_BYTES` — max upload size (default 10 MB)
