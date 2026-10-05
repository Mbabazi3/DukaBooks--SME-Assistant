// Scan step 4 (polled by the page): processing status, plus the extracted
// fields once the document is done (Test 008C).
const DONE = ["completed", "partial"];
const FAILED = ["failed", "cancelled", "pending_credits"];

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;
  const client = useGptClient();
  const doc: any = await sdk(() => client.extraction.documents.status(id));
  const status = doc.status ?? doc.attributes?.status;

  if (FAILED.includes(status)) return { id, status, done: true, failed: true };
  if (!DONE.includes(status)) return { id, status, done: false, progress: doc.progress ?? null };

  const [result]: any[] = await sdk(() => client.extraction.results.byDocument(id));
  return {
    id,
    status,
    done: true,
    result_id: result?.id,
    extracted_fields: result?.extracted_fields ?? {},
    avg_confidence: result?.avg_confidence ?? null,
  };
});
