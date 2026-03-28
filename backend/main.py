import io
import os
import platform
import subprocess
import uuid
from pathlib import Path
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image
from pydantic import BaseModel

from scanner import ScanJob, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS
from consolidator import consolidate

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

scans: dict[str, ScanJob] = {}


class ScanRequest(BaseModel):
    paths: list[str]


class ConsolidateRequest(BaseModel):
    keep: list[str]
    trash: list[str]


class RevealRequest(BaseModel):
    path: str


@app.post("/scan")
def start_scan(req: ScanRequest):
    scan_id = str(uuid.uuid4())
    job = ScanJob(scan_id, req.paths)
    scans[scan_id] = job
    job.start()
    return {"scan_id": scan_id}


@app.get("/scan/{scan_id}/status")
def scan_status(scan_id: str):
    job = scans.get(scan_id)
    if not job:
        raise HTTPException(404, "Scan not found")
    return {
        "status": job.status,
        "progress": {"scanned": job.scanned, "total": job.total},
        "error": job.error,
    }


@app.post("/scan/{scan_id}/stop")
def stop_scan(scan_id: str):
    job = scans.get(scan_id)
    if not job:
        raise HTTPException(404, "Scan not found")
    job.stop()
    return {"ok": True}


@app.get("/scan/{scan_id}/results")
def scan_results(scan_id: str):
    job = scans.get(scan_id)
    if not job:
        raise HTTPException(404, "Scan not found")
    if job.status != "complete":
        raise HTTPException(400, "Scan not complete")
    return {"groups": job.results}


@app.post("/consolidate")
def do_consolidate(req: ConsolidateRequest):
    all_paths = req.keep + req.trash
    if not all_paths:
        raise HTTPException(400, "No files provided")

    base_path = str(Path(all_paths[0]).parent)
    if len(all_paths) > 1:
        common = os.path.commonpath(all_paths)
        if os.path.isdir(common):
            base_path = common
        else:
            base_path = str(Path(common).parent)

    result = consolidate(req.keep, req.trash, base_path)
    return result


@app.get("/thumbnail/{scan_id}")
def get_thumbnail(scan_id: str, path: str = Query(...), full: bool = Query(False)):
    job = scans.get(scan_id)
    if not job:
        raise HTTPException(404, "Scan not found")

    filepath = unquote(path)
    if not os.path.isfile(filepath):
        raise HTTPException(404, "File not found")

    ext = Path(filepath).suffix.lower()

    try:
        if ext in IMAGE_EXTENSIONS:
            return _image_thumbnail(filepath, full=full)
        elif ext in VIDEO_EXTENSIONS:
            return _video_thumbnail(filepath)
        else:
            raise HTTPException(404, "Unsupported file type")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(404, "Thumbnail generation failed")


def _image_thumbnail(filepath: str, full: bool = False) -> Response:
    img = Image.open(filepath)
    img = img.convert("RGB")
    if not full:
        img.thumbnail((200, 200), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90 if full else 80)
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="image/jpeg")


def _video_thumbnail(filepath: str) -> Response:
    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-ss", "1",
                "-i", filepath,
                "-frames:v", "1",
                "-vf", "scale=200:200:force_original_aspect_ratio=decrease",
                "-f", "image2",
                "-vcodec", "mjpeg",
                "-q:v", "5",
                "pipe:1",
            ],
            capture_output=True,
            timeout=10,
        )
        if result.returncode != 0 or not result.stdout:
            raise HTTPException(404, "ffmpeg failed")
        return Response(content=result.stdout, media_type="image/jpeg")
    except FileNotFoundError:
        raise HTTPException(404, "ffmpeg not installed")
    except subprocess.TimeoutExpired:
        raise HTTPException(404, "ffmpeg timed out")


@app.post("/reveal")
def reveal_file(req: RevealRequest):
    try:
        system = platform.system()
        if system == "Darwin":
            subprocess.run(["open", "-R", req.path], check=True, timeout=5)
        elif system == "Windows":
            subprocess.run(["explorer", "/select,", req.path], check=True, timeout=5)
        else:
            folder = str(Path(req.path).parent)
            subprocess.run(["xdg-open", folder], check=True, timeout=5)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}
