// Scan step 3: queue AI processing once the file is in storage (Test 008B).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;
  const doc: any = await sdk(() => useGptClient().extraction.documents.finishUpload(id));
  forgetUploadUrl(id);
  return { id, status: doc.status };
});
