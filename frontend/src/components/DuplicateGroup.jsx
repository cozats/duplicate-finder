import React, { useState } from "react";
import { revealFile, thumbnailUrl, fullImageUrl } from "../api";

const VIDEO_EXTS = new Set([".mp4", ".mov", ".avi", ".mkv", ".m4v"]);

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function formatDate(ts) {
  const d = new Date(ts * 1000);
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function Thumbnail({ file, scanId, onClick }) {
  const [failed, setFailed] = useState(false);
  const isVideo = VIDEO_EXTS.has(file.extension);
  const src = thumbnailUrl(scanId, file.path);

  if (failed) {
    return (
      <div className="thumb-placeholder">
        {file.extension.replace(".", "")}
      </div>
    );
  }

  return (
    <div className="dup-thumb-wrap" onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
      {isVideo && <div className="play-icon" />}
    </div>
  );
}

export default function DuplicateGroup({ group, groupIndex, keeperPath, scanId, onSetKeeper, onSkip, onOpenLightbox }) {
  const [revealedPath, setRevealedPath] = useState(null);
  const isSkipped = keeperPath === null;

  async function handleReveal(e, path) {
    e.stopPropagation();
    const { data } = await revealFile(path);
    if (data && data.ok) {
      setRevealedPath(path);
      setTimeout(() => setRevealedPath(null), 1500);
    }
  }

  return (
    <div className={`dup-group ${isSkipped ? "is-skipped" : ""}`}>
      <div className="dup-group-header">
        <span>{group.length} files &middot; {formatSize(group[0].size)} each</span>
        {isSkipped ? (
          <button className="btn-small undo-skip-btn" onClick={() => onSetKeeper(group.reduce((a, b) => a.modified < b.modified ? a : b).path)}>
            Undo skip
          </button>
        ) : (
          <button className="btn-small skip-btn" onClick={onSkip}>
            Skip
          </button>
        )}
      </div>
      {isSkipped ? (
        <div className="skipped-notice">Skipped — all files will be kept as-is</div>
      ) : (
        group.map((file, fileIndex) => {
          const isKeeper = file.path === keeperPath;
          const groupUrls = group.map((f) => fullImageUrl(scanId, f.path));
          return (
            <div
              key={file.path}
              className={`dup-file ${isKeeper ? "is-keeper" : ""}`}
              onClick={() => onSetKeeper(file.path)}
            >
              <Thumbnail file={file} scanId={scanId} onClick={() => onOpenLightbox(groupUrls, fileIndex)} />

              <div className="dup-info">
                <div className="dup-path" title={file.path}>
                  {file.path}
                </div>
                <div className="dup-meta">
                  <span>{formatSize(file.size)}</span>
                  <span>{formatDate(file.modified)}</span>
                </div>
              </div>

              <div className="dup-actions">
                {isKeeper ? (
                  <span className="keeper-badge">&#10003; Keeper</span>
                ) : (
                  <span className="trash-label">will be moved</span>
                )}
                {revealedPath === file.path ? (
                  <span className="revealed-flash">Revealed</span>
                ) : (
                  <button className="btn-small" onClick={(e) => handleReveal(e, file.path)}>
                    Show in Finder
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
