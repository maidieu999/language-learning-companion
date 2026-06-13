import io
import os
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from markitdown import MarkItDown
from pydantic import BaseModel

DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024

app = FastAPI(title="MarkItDown converter", version="1.0.0")
_converter = MarkItDown(enable_plugins=False)


class ConvertResponse(BaseModel):
    markdown: str


def get_max_upload_bytes() -> int:
    raw = os.environ.get("MAX_UPLOAD_BYTES", "").strip()
    if not raw:
        return DEFAULT_MAX_UPLOAD_BYTES
    try:
        parsed = int(raw)
    except ValueError:
        return DEFAULT_MAX_UPLOAD_BYTES
    return parsed if parsed > 0 else DEFAULT_MAX_UPLOAD_BYTES


def extension_from_filename(filename: str | None) -> str | None:
    if not filename:
        return None
    dot = filename.rfind(".")
    if dot <= 0:
        return None
    return filename[dot:].lower()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/convert", response_model=ConvertResponse)
async def convert(file: UploadFile = File(...)) -> dict[str, Any]:
    max_bytes = get_max_upload_bytes()
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="File is empty")

    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {max_bytes} bytes",
        )

    extension = extension_from_filename(file.filename)
    stream = io.BytesIO(content)

    try:
        result = _converter.convert_stream(
            stream,
            file_extension=extension,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Conversion failed: {exc}",
        ) from exc

    markdown = (result.text_content or "").strip()
    if not markdown:
        raise HTTPException(
            status_code=422,
            detail="File contains no extractable text",
        )

    return {"markdown": markdown}
