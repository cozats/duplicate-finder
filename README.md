# Duplicate Image Finder

A local, browser-based tool for finding and consolidating duplicate photos and videos. Works on macOS, Linux, and Windows.

No cloud. No database. No tracking. Everything runs on localhost.

Point it at one or more folders and it will hash every image and video file with SHA-256. Files with identical hashes are grouped as duplicates. You pick which copy to keep — the rest get moved to a `_duplicates_trash/` folder for manual review.

**Nothing is ever permanently deleted.**

---

## Quick Start

```bash
./start.sh
```

That's it. The script sets up a Python virtual environment, installs dependencies, starts both servers, and opens the app in your browser.

## Requirements

- Python 3.11+
- Node.js 18+
- ffmpeg (optional, for video thumbnails)

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
winget install ffmpeg
```

---

## How It Works

1. Enter one or more absolute folder paths
2. The backend recursively walks each folder for image and video files
3. Each file is hashed with SHA-256 using chunked reads (never loads full files into memory)
4. Files with matching hashes are grouped as duplicates
5. For each group, the oldest file is auto-selected as the keeper
6. You can change the keeper by clicking any other file in the group
7. **Skip** groups you want to leave untouched
8. **Consolidate** moves all non-keeper files to `_duplicates_trash/`

## Features

- **Full-resolution preview** — click any thumbnail to view the full image. Use left/right arrow keys to compare files within a group
- **Skip groups** — leave duplicates untouched when you're not sure
- **Stop scan** — cancel a running scan at any time without side effects
- **Auto-resolve** — one click to keep the oldest file in every group
- **Safe moves** — files are moved to a trash folder, never deleted. Original timestamps (creation/modification dates) are preserved
- **Memory efficient** — files are hashed in 8MB chunks, never fully loaded into memory
- **Non-blocking** — scans run in a background thread, large folders won't freeze the app
- **Reveal file** — open any file's location in Finder, Explorer, or your file manager with one click
- **Cross-platform** — works on macOS, Linux, and Windows

## Supported Formats

**Images:** `.jpg` `.jpeg` `.png` `.gif` `.heic` `.webp`

**Videos:** `.mp4` `.mov` `.avi` `.mkv` `.m4v`

---

## Architecture

```
Frontend (React + Vite)          Backend (Python + FastAPI)
http://localhost:5173      <-->  http://localhost:8000

POST /scan                       Start background scan job
GET  /scan/{id}/status           Poll scan progress
POST /scan/{id}/stop             Cancel a running scan
GET  /scan/{id}/results          Retrieve duplicate groups
GET  /thumbnail/{id}?path=...    Image/video thumbnails
POST /consolidate                Move duplicate files
POST /reveal                     Open file in file manager
```

## Manual Setup

If you prefer to run things separately:

**Backend:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

---

## License

MIT
