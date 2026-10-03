// Scan step 1: get a presigned upload link (Test 008B).
export default defineEventHandler(async (event) => {
  const { filename, content_type } = await readBody(event);
  const { workspaceId } = useGptConfig(event);
  const client = useGptClient(event);
  return sdk(() =>
    client.extraction.documents.beginUpload({
      workspace_id: workspaceId,
      filename,
      file_type: content_type === "application/pdf" ? "pdf" : "image",
      content_type,
    } as any)
  );
});
