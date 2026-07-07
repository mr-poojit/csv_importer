const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Upload a CSV file and get parsed raw records back.
 */
export async function parseCSV(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/parse`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || `Server error: ${res.status}`);
  }

  return res.json();
}

/**
 * Import records using the streaming SSE endpoint.
 * Calls onBatchStart, onBatchComplete, onComplete, and onError callbacks.
 */
export async function importRecordsStream(records, callbacks = {}) {
  const { onBatchStart, onBatchComplete, onComplete, onError } = callbacks;

  const res = await fetch(`${API_BASE}/api/import-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Import failed' }));
    throw new Error(err.error || `Server error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          switch (event.type) {
            case 'batch-start':
              onBatchStart?.(event);
              break;
            case 'batch-complete':
              onBatchComplete?.(event);
              break;
            case 'complete':
              onComplete?.(event);
              break;
            case 'error':
              onError?.(event);
              break;
          }
        } catch {
          // skip malformed SSE lines
        }
      }
    }
  }
}

/**
 * Import records using the standard (non-streaming) endpoint.
 */
export async function importRecords(records) {
  const res = await fetch(`${API_BASE}/api/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Import failed' }));
    throw new Error(err.error || `Server error: ${res.status}`);
  }

  return res.json();
}
