import os
import shutil
from pathlib import Path


def consolidate(keep: list[str], trash: list[str], base_path: str) -> dict:
    trash_dir = os.path.join(base_path, "_duplicates_trash")
    os.makedirs(trash_dir, exist_ok=True)

    moved = 0
    errors = []

    for filepath in trash:
        if filepath in keep:
            errors.append({"path": filepath, "error": "File is marked as keeper, skipping"})
            continue

        try:
            filename = os.path.basename(filepath)
            dest = os.path.join(trash_dir, filename)

            if os.path.exists(dest):
                stem = Path(filename).stem
                ext = Path(filename).suffix
                counter = 1
                while os.path.exists(dest):
                    dest = os.path.join(trash_dir, f"{stem}_{counter}{ext}")
                    counter += 1

            stat = os.stat(filepath)
            shutil.move(filepath, dest)
            os.utime(dest, (stat.st_atime, stat.st_mtime))
            moved += 1
        except Exception as e:
            errors.append({"path": filepath, "error": str(e)})

    return {"moved": moved, "errors": errors}
