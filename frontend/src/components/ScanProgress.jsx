import React, { useState, useEffect, useRef } from "react";
import { getScanStatus, stopScan } from "../api";

export default function ScanProgress({ scanId, onComplete, onStop }) {
  const [scanned, setScanned] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("scanning");
  const [error, setError] = useState(null);
  const [stopping, setStopping] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      const { data, error: err } = await getScanStatus(scanId);
      if (err) {
        setError(err);
        clearInterval(intervalRef.current);
        return;
      }
      if (data) {
        setScanned(data.progress.scanned);
        setTotal(data.progress.total);
        setStatus(data.status);

        if (data.status === "complete") {
          clearInterval(intervalRef.current);
          onComplete(scanId);
        }
        if (data.status === "stopped") {
          clearInterval(intervalRef.current);
          onStop();
        }
        if (data.status === "error") {
          clearInterval(intervalRef.current);
          setError(data.error || "Scan failed");
        }
      }
    }, 1500);

    return () => clearInterval(intervalRef.current);
  }, [scanId, onComplete, onStop]);

  async function handleStop() {
    setStopping(true);
    await stopScan(scanId);
  }

  const pct = total > 0 ? Math.round((scanned / total) * 100) : 0;

  return (
    <div className="scan-progress">
      <div className="progress-label">
        Scanning... <strong>{scanned.toLocaleString()}</strong> / {total.toLocaleString()} files
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-status">
        {status === "scanning" && !stopping && `${pct}% — hashing files`}
        {status === "scanning" && stopping && "Stopping..."}
        {status === "complete" && "Complete — loading results"}
      </div>
      {error && <div className="progress-error">{error}</div>}
      {status === "scanning" && (
        <button className="btn-secondary stop-btn" onClick={handleStop} disabled={stopping}>
          Stop scan
        </button>
      )}
    </div>
  );
}
