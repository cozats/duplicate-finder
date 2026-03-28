import os
import hashlib
import threading
from pathlib import Path
from typing import Optional

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".heic", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".m4v"}
ALL_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS

CHUNK_SIZE = 8 * 1024 * 1024  # 8MB


def hash_file(path: str) -> Optional[str]:
    sha = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            while True:
                chunk = f.read(CHUNK_SIZE)
                if not chunk:
                    break
                sha.update(chunk)
        return sha.hexdigest()
    except (OSError, PermissionError):
        return None


def collect_files(paths: list[str]) -> list[str]:
    files = []
    for base in paths:
        base_path = Path(base)
        if not base_path.is_dir():
            continue
        for root, _dirs, filenames in os.walk(base_path):
            for name in filenames:
                ext = Path(name).suffix.lower()
                if ext in ALL_EXTENSIONS:
                    files.append(os.path.join(root, name))
    return files


def file_info(path: str) -> dict:
    stat = os.stat(path)
    return {
        "path": path,
        "size": stat.st_size,
        "modified": stat.st_mtime,
        "extension": Path(path).suffix.lower(),
    }


class ScanJob:
    def __init__(self, scan_id: str, paths: list[str]):
        self.scan_id = scan_id
        self.paths = paths
        self.status = "scanning"
        self.scanned = 0
        self.total = 0
        self.results: list[list[dict]] = []
        self.error: Optional[str] = None
        self._cancelled = threading.Event()

    def stop(self):
        self._cancelled.set()

    def run(self):
        try:
            files = collect_files(self.paths)
            self.total = len(files)

            hash_groups: dict[str, list[str]] = {}
            for filepath in files:
                if self._cancelled.is_set():
                    self.status = "stopped"
                    return
                h = hash_file(filepath)
                if h is not None:
                    hash_groups.setdefault(h, []).append(filepath)
                self.scanned += 1

            duplicates = []
            for h, group_paths in hash_groups.items():
                if len(group_paths) >= 2:
                    group = [file_info(p) for p in group_paths]
                    duplicates.append(group)

            self.results = duplicates
            self.status = "complete"
        except Exception as e:
            self.error = str(e)
            self.status = "error"

    def start(self):
        thread = threading.Thread(target=self.run, daemon=True)
        thread.start()
