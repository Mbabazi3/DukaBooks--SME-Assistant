// Scan step 3: queue AI processing once the file is in storage (Test 008B).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;
  return sdk(() => useGptClient().extraction.documents.finishUpload(id));
});
