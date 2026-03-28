const BASE = "http://localhost:8000";

async function request(method, path, body) {
  try {
    const opts = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    if (!res.ok) {
      const text = await res.text();
      return { data: null, error: text || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

export function startScan(paths) {
  return request("POST", "/scan", { paths });
}

export function getScanStatus(scanId) {
  return request("GET", `/scan/${scanId}/status`);
}

export function stopScan(scanId) {
  return request("POST", `/scan/${scanId}/stop`);
}

export function getScanResults(scanId) {
  return request("GET", `/scan/${scanId}/results`);
}

export function consolidateFiles(keep, trash) {
  return request("POST", "/consolidate", { keep, trash });
}

export function revealFile(path) {
  return request("POST", "/reveal", { path });
}

export function thumbnailUrl(scanId, filePath) {
  return `${BASE}/thumbnail/${scanId}?path=${encodeURIComponent(filePath)}`;
}

export function fullImageUrl(scanId, filePath) {
  return `${BASE}/thumbnail/${scanId}?path=${encodeURIComponent(filePath)}&full=true`;
}
