// Presigned upload URLs from beginUpload, kept server-side so the browser never
// needs them (and storage CORS doesn't matter). Short-lived, so memory is fine.
const urls = new Map<string, { url: string; at: number }>();
const TTL_MS = 30 * 60 * 1000;

export function rememberUploadUrl(docId: string, url?: string) {
  if (url) urls.set(docId, { url, at: Date.now() });
}

export async function uploadUrlFor(docId: string): Promise<string> {
  const hit = urls.get(docId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.url;
  // Fallback (e.g. after a server restart): the document record carries it too.
  const doc: any = await sdk(() => useGptClient().extraction.documents.get(docId));
  const url = doc?.upload_url ?? doc?.attributes?.upload_url;
  if (!url) throw createError({ statusCode: 410, statusMessage: "Upload link expired — scan the file again" });
  return url;
}

export function forgetUploadUrl(docId: string) {
  urls.delete(docId);
}
