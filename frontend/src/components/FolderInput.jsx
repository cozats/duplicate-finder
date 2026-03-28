import React, { useState } from "react";
import { startScan } from "../api";

export default function FolderInput({ onScanStart }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const paths = value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (paths.length === 0) {
      setError("Enter at least one folder path");
      return;
    }

    setError(null);
    setLoading(true);
    const { data, error: err } = await startScan(paths);
    setLoading(false);

    if (err || !data) {
      setError(err || "Failed to start scan");
      return;
    }

    onScanStart(data.scan_id);
  }

  return (
    <div className="folder-input">
      <label>Folder paths to scan (one per line)</label>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={"/Users/you/Photos\n/Volumes/External/Backup"}
        spellCheck={false}
        autoFocus
      />
      <div className="input-footer">
        <span className="input-error">{error || ""}</span>
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Starting..." : "Scan for duplicates"}
        </button>
      </div>
    </div>
  );
}
