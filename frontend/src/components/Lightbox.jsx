import React, { useEffect, useCallback } from "react";

export default function Lightbox({ urls, index, onClose, onNavigate }) {
  const hasPrev = index > 0;
  const hasNext = index < urls.length - 1;

  const handleKey = useCallback((e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && hasPrev) onNavigate(index - 1);
    if (e.key === "ArrowRight" && hasNext) onNavigate(index + 1);
  }, [index, hasPrev, hasNext, onClose, onNavigate]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      {hasPrev && (
        <button className="lightbox-arrow lightbox-arrow-left" onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}>
          &#8249;
        </button>
      )}
      <img src={urls[index]} alt="" onClick={(e) => e.stopPropagation()} />
      {hasNext && (
        <button className="lightbox-arrow lightbox-arrow-right" onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}>
          &#8250;
        </button>
      )}
      <div className="lightbox-counter" onClick={(e) => e.stopPropagation()}>
        {index + 1} / {urls.length}
      </div>
    </div>
  );
}
