import React from "react";

export default function ConsolidatePanel({ trashCount, result, consolidating, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {!result ? (
          <>
            <h2>Consolidate duplicates</h2>
            <p>
              {trashCount} file{trashCount !== 1 ? "s" : ""} will be moved out of their
              current locations and into:
            </p>
            <div className="modal-dest">_duplicates_trash/</div>
            <p>
              Nothing is permanently deleted. You can review and restore files from
              that folder at any time.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary" onClick={onConfirm} disabled={consolidating}>
                {consolidating ? "Moving..." : "Confirm"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Done</h2>
            <div className="modal-result">
              <div className="success">
                {result.moved} file{result.moved !== 1 ? "s" : ""} moved to _duplicates_trash/
              </div>
              {result.errors && result.errors.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: "var(--danger)", fontSize: "0.78rem", marginBottom: 6 }}>
                    {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}:
                  </div>
                  {result.errors.map((err, i) => (
                    <div key={i} className="error-item">
                      {err.path}: {err.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
