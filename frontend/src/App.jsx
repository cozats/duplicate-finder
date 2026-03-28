import React, { useState, useReducer } from "react";
import FolderInput from "./components/FolderInput";
import ScanProgress from "./components/ScanProgress";
import DuplicateGroup from "./components/DuplicateGroup";
import Lightbox from "./components/Lightbox";
import ConsolidatePanel from "./components/ConsolidatePanel";
import { getScanResults, consolidateFiles } from "./api";

const VIEWS = { INPUT: 0, SCANNING: 1, RESULTS: 2 };

function keepersReducer(state, action) {
  switch (action.type) {
    case "init": {
      const m = {};
      action.groups.forEach((group, i) => {
        const oldest = group.reduce((a, b) => (a.modified < b.modified ? a : b));
        m[i] = oldest.path;
      });
      return m;
    }
    case "set":
      return { ...state, [action.groupIndex]: action.path };
    case "skip":
      return { ...state, [action.groupIndex]: null };
    case "auto_oldest": {
      const m = {};
      action.groups.forEach((group, i) => {
        const oldest = group.reduce((a, b) => (a.modified < b.modified ? a : b));
        m[i] = oldest.path;
      });
      return m;
    }
    default:
      return state;
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

export default function App() {
  const [view, setView] = useState(VIEWS.INPUT);
  const [scanId, setScanId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [keepers, dispatch] = useReducer(keepersReducer, {});
  const [lightbox, setLightbox] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [consolidateResult, setConsolidateResult] = useState(null);
  const [consolidating, setConsolidating] = useState(false);

  function handleScanStart(id) {
    setScanId(id);
    setView(VIEWS.SCANNING);
  }

  async function handleScanComplete(id) {
    const { data, error } = await getScanResults(id);
    if (error || !data) return;
    setGroups(data.groups);
    dispatch({ type: "init", groups: data.groups });
    setView(VIEWS.RESULTS);
  }

  function trashFiles() {
    const trash = [];
    const keep = [];
    groups.forEach((group, i) => {
      const keeperPath = keepers[i];
      if (keeperPath === null) return;
      group.forEach((file) => {
        if (file.path === keeperPath) {
          keep.push(file.path);
        } else {
          trash.push(file.path);
        }
      });
    });
    return { keep, trash };
  }

  async function handleConsolidate() {
    setConsolidating(true);
    const { keep, trash } = trashFiles();
    const { data, error } = await consolidateFiles(keep, trash);
    setConsolidating(false);
    if (error) {
      setConsolidateResult({ moved: 0, errors: [{ path: "", error }] });
    } else {
      setConsolidateResult(data);
    }
  }

  const { trash } = trashFiles();
  const wastedBytes = groups.reduce((sum, group, i) => {
    const keeperPath = keepers[i];
    if (keeperPath === null) return sum;
    return sum + group.filter((f) => f.path !== keeperPath).reduce((s, f) => s + f.size, 0);
  }, 0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Duplicate Finder</h1>
        {view === VIEWS.RESULTS && (
          <button className="btn-text" onClick={() => { setView(VIEWS.INPUT); setGroups([]); setScanId(null); setConsolidateResult(null); }}>
            New scan
          </button>
        )}
      </header>

      {view === VIEWS.INPUT && (
        <FolderInput onScanStart={handleScanStart} />
      )}

      {view === VIEWS.SCANNING && scanId && (
        <ScanProgress scanId={scanId} onComplete={handleScanComplete} onStop={() => { setView(VIEWS.INPUT); setScanId(null); }} />
      )}

      {view === VIEWS.RESULTS && (
        <>
          <div className="results-summary">
            <span className="summary-stat">
              <strong>{groups.length}</strong> duplicate group{groups.length !== 1 ? "s" : ""}
            </span>
            <span className="summary-divider" />
            <span className="summary-stat">
              <strong>{formatSize(wastedBytes)}</strong> reclaimable
            </span>
          </div>

          {groups.length === 0 && (
            <div className="empty-state">No duplicates found. Your files are clean.</div>
          )}

          <div className="groups-list">
            {groups.map((group, i) => (
              <DuplicateGroup
                key={i}
                group={group}
                groupIndex={i}
                keeperPath={keepers[i]}
                scanId={scanId}
                onSetKeeper={(path) => dispatch({ type: "set", groupIndex: i, path })}
                onSkip={() => dispatch({ type: "skip", groupIndex: i })}
                onOpenLightbox={(urls, index) => setLightbox({ urls, index })}
              />
            ))}
          </div>

          {groups.length > 0 && (
            <div className="sticky-bar">
              <button
                className="btn-secondary"
                onClick={() => dispatch({ type: "auto_oldest", groups })}
              >
                Auto-resolve all — keep oldest
              </button>
              <button
                className="btn-primary"
                disabled={trash.length === 0}
                onClick={() => setShowConfirm(true)}
              >
                Consolidate {trash.length} file{trash.length !== 1 ? "s" : ""}
              </button>
            </div>
          )}

          {showConfirm && (
            <ConsolidatePanel
              trashCount={trash.length}
              result={consolidateResult}
              consolidating={consolidating}
              onConfirm={handleConsolidate}
              onClose={() => { setShowConfirm(false); setConsolidateResult(null); }}
            />
          )}
        </>
      )}

      {lightbox && (
        <Lightbox
          urls={lightbox.urls}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(newIndex) => setLightbox({ ...lightbox, index: newIndex })}
        />
      )}

      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --bg: #0c0c0c;
          --surface: #141414;
          --surface-2: #1a1a1a;
          --border: #222;
          --text: #d4d4d4;
          --text-secondary: #737373;
          --text-muted: #4a4a4a;
          --accent: #a3d5c9;
          --accent-dim: rgba(163, 213, 201, 0.08);
          --accent-border: rgba(163, 213, 201, 0.2);
          --danger: #e5484d;
          --danger-dim: rgba(229, 72, 77, 0.08);
          --mono: 'JetBrains Mono', monospace;
          --sans: 'DM Sans', system-ui, sans-serif;
          --radius: 6px;
        }

        body {
          font-family: var(--sans);
          background: var(--bg);
          color: var(--text);
          min-height: 100dvh;
          -webkit-font-smoothing: antialiased;
        }

        .app {
          max-width: 960px;
          margin: 0 auto;
          padding: 48px 24px 120px;
        }

        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 48px;
        }

        .app-header h1 {
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: -0.03em;
        }

        /* Buttons */
        .btn-primary {
          background: var(--text);
          color: var(--bg);
          border: none;
          border-radius: var(--radius);
          padding: 10px 20px;
          font-family: var(--sans);
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .btn-primary:hover { opacity: 0.85; }
        .btn-primary:disabled { opacity: 0.3; cursor: not-allowed; }

        .btn-secondary {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 20px;
          font-family: var(--sans);
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .btn-secondary:hover { border-color: var(--text-muted); color: var(--text); }

        .btn-text {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-family: var(--sans);
          font-size: 0.82rem;
          cursor: pointer;
          padding: 4px 0;
        }
        .btn-text:hover { color: var(--text); }

        .btn-small {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 4px 10px;
          font-family: var(--sans);
          font-size: 0.7rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .btn-small:hover { border-color: var(--text-muted); color: var(--text); }

        /* Results summary */
        .results-summary {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
          padding: 16px 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
        }
        .summary-stat { font-size: 0.85rem; color: var(--text-secondary); }
        .summary-stat strong { color: var(--text); font-weight: 600; }
        .summary-divider { width: 1px; height: 16px; background: var(--border); }

        .empty-state {
          text-align: center;
          color: var(--text-muted);
          padding: 80px 0;
          font-size: 0.9rem;
        }

        /* Groups */
        .groups-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Sticky bar */
        .sticky-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 12px;
          padding: 16px 24px;
          background: rgba(12, 12, 12, 0.9);
          backdrop-filter: blur(12px);
          border-top: 1px solid var(--border);
          z-index: 50;
        }

        /* Folder input */
        .folder-input {
          max-width: 560px;
          margin: 0 auto;
        }
        .folder-input label {
          display: block;
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 10px;
        }
        .folder-input textarea {
          width: 100%;
          min-height: 160px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          font-family: var(--mono);
          font-size: 0.82rem;
          padding: 14px;
          resize: vertical;
          outline: none;
          transition: border-color 0.15s;
        }
        .folder-input textarea:focus { border-color: var(--text-muted); }
        .folder-input textarea::placeholder { color: var(--text-muted); }
        .folder-input .input-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 14px;
        }
        .folder-input .input-error {
          font-size: 0.78rem;
          color: var(--danger);
        }

        /* Progress */
        .scan-progress {
          max-width: 480px;
          margin: 80px auto 0;
          text-align: center;
        }
        .progress-label {
          font-size: 0.82rem;
          color: var(--text-secondary);
          margin-bottom: 14px;
        }
        .progress-label strong { color: var(--text); }
        .progress-track {
          width: 100%;
          height: 4px;
          background: var(--surface-2);
          border-radius: 2px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 2px;
          transition: width 0.3s ease;
        }
        .progress-status {
          margin-top: 10px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .progress-error {
          margin-top: 16px;
          font-size: 0.82rem;
          color: var(--danger);
        }
        .stop-btn {
          margin-top: 24px;
        }

        /* Duplicate group card */
        .dup-group {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .dup-group-header {
          padding: 12px 16px;
          font-size: 0.72rem;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .dup-group.is-skipped {
          opacity: 0.5;
        }
        .skipped-notice {
          padding: 16px;
          font-size: 0.8rem;
          color: var(--text-muted);
          text-align: center;
        }
        .dup-file {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          transition: background 0.12s;
        }
        .dup-file:last-child { border-bottom: none; }
        .dup-file:hover { background: var(--surface-2); }
        .dup-file.is-keeper {
          background: var(--accent-dim);
          border-left: 2px solid var(--accent);
        }

        .dup-thumb {
          width: 56px;
          height: 56px;
          border-radius: 4px;
          object-fit: cover;
          background: var(--surface-2);
          flex-shrink: 0;
          cursor: zoom-in;
          position: relative;
        }
        .dup-thumb-wrap {
          position: relative;
          width: 56px;
          height: 56px;
          flex-shrink: 0;
        }
        .dup-thumb-wrap img {
          width: 100%;
          height: 100%;
          border-radius: 4px;
          object-fit: cover;
          background: var(--surface-2);
        }
        .dup-thumb-wrap .play-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          background: rgba(0,0,0,0.6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .dup-thumb-wrap .play-icon::after {
          content: '';
          display: block;
          width: 0;
          height: 0;
          border-left: 7px solid #fff;
          border-top: 4px solid transparent;
          border-bottom: 4px solid transparent;
          margin-left: 2px;
        }
        .thumb-placeholder {
          width: 56px;
          height: 56px;
          border-radius: 4px;
          background: var(--surface-2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--mono);
          font-size: 0.65rem;
          color: var(--text-muted);
          flex-shrink: 0;
          text-transform: uppercase;
        }

        .dup-info {
          flex: 1;
          min-width: 0;
        }
        .dup-path {
          font-family: var(--mono);
          font-size: 0.75rem;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
        }
        .dup-meta {
          display: flex;
          gap: 12px;
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .dup-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .keeper-badge {
          font-size: 0.68rem;
          font-weight: 500;
          color: var(--accent);
          white-space: nowrap;
        }
        .trash-label {
          font-size: 0.68rem;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .revealed-flash {
          font-size: 0.68rem;
          color: var(--accent);
          animation: flash 1.5s ease forwards;
        }
        @keyframes flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* Lightbox */
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          cursor: zoom-out;
          padding: 40px;
        }
        .lightbox-overlay img {
          max-width: calc(100vw - 160px);
          max-height: calc(100vh - 80px);
          object-fit: contain;
          border-radius: 4px;
        }
        .lightbox-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #fff;
          font-size: 2.5rem;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
          z-index: 210;
          line-height: 1;
        }
        .lightbox-arrow:hover { background: rgba(255, 255, 255, 0.25); }
        .lightbox-arrow-left { left: 16px; }
        .lightbox-arrow-right { right: 16px; }
        .lightbox-counter {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          font-family: var(--mono);
        }

        /* Consolidate modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 150;
          padding: 24px;
        }
        .modal {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 28px;
          max-width: 440px;
          width: 100%;
        }
        .modal h2 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .modal p {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 8px;
        }
        .modal .modal-dest {
          font-family: var(--mono);
          font-size: 0.75rem;
          color: var(--text-muted);
          background: var(--surface-2);
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 20px;
          word-break: break-all;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .modal-result {
          margin-top: 16px;
          padding: 12px;
          background: var(--surface-2);
          border-radius: 4px;
          font-size: 0.8rem;
        }
        .modal-result .success { color: var(--accent); }
        .modal-result .error-item {
          color: var(--danger);
          font-family: var(--mono);
          font-size: 0.72rem;
          margin-top: 6px;
          word-break: break-all;
        }
      `}</style>
    </div>
  );
}
