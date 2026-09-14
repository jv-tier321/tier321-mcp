export const MAX_REQUEST_BYTES = 16 * 1024
const MAX_JSON_DEPTH = 32
const BODY_TIMEOUT_MS = 5_000

export class RequestError extends Error {
  constructor(readonly status: number, readonly code: number, message: string) {
    super(message)
  }
}

/** Bound actual bytes, including bodies with no or misleading Content-Length. */
export async function readMessage(request: Request): Promise<unknown> {
  if (Number(request.headers.get('Content-Length')) > MAX_REQUEST_BYTES) {
    throw new RequestError(413, -32600, 'Request body exceeds 16 KiB')
  }
  if (!request.body) throw new RequestError(400, -32700, 'Invalid JSON')
  const reader = request.body.getReader()
  const bytes = new Uint8Array(MAX_REQUEST_BYTES)
  let size = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RequestError(408, -32600, 'Request body timed out')), BODY_TIMEOUT_MS)
  })
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout])
      if (done) break
      size += value.byteLength
      if (size > MAX_REQUEST_BYTES) throw new RequestError(413, -32600, 'Request body exceeds 16 KiB')
      bytes.set(value, size - value.byteLength)
    }
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  let message: unknown
  try {
    message = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes.subarray(0, size)))
  } catch {
    throw new RequestError(400, -32700, 'Invalid JSON')
  }
  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    throw new RequestError(400, -32600, 'Expected one JSON-RPC message; batches are not supported')
  }
  const pending: Array<{ value: unknown; depth: number }> = [{ value: message, depth: 1 }]
  while (pending.length) {
    const item = pending.pop()!
    if (item.depth > MAX_JSON_DEPTH) throw new RequestError(400, -32600, 'JSON nesting exceeds 32 levels')
    if (item.value && typeof item.value === 'object') {
      for (const value of Object.values(item.value)) pending.push({ value, depth: item.depth + 1 })
    }
  }
  return message
}
