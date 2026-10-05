// Scan step 1: register the document and get a presigned upload link (Test 008B).
const FILE_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export default defineEventHandler(async (event) => {
  const { filename, content_type, size } = await readBody(event);
  if (!filename) throw createError({ statusCode: 400, statusMessage: "filename is required" });
  const { workspaceId } = useGptConfig();
  const client = useGptClient();
  const required = {
    workspace_id: workspaceId,
    filename,
    file_type: FILE_TYPES[content_type] ?? (String(content_type).startsWith("image/") ? "image" : "pdf"),
  };
  const optional = { ...(content_type ? { content_type } : {}), ...(size ? { file_size_bytes: Number(size) } : {}) };

  let doc: any;
  try {
    doc = await sdk(() => client.extraction.documents.beginUpload({ ...required, ...optional }));
  } catch (err: any) {
    // Staging has rejected optional attributes with 400 InvalidAttribute — retry with the required ones only.
    if (err?.statusCode !== 400 || !Object.keys(optional).length) throw err;
    console.warn(`[dukabooks] beginUpload rejected optional attributes (${err?.data?.detail || err?.message}); retrying with filename/file_type/workspace_id only`);
    doc = await sdk(() => client.extraction.documents.beginUpload(required));
  }

  // The SDK docs read the URL from doc.attributes.upload_url; flattened responses have doc.upload_url.
  const uploadUrl = doc.upload_url ?? doc.attributes?.upload_url;
  if (!uploadUrl) {
    throw createError({ statusCode: 502, statusMessage: "The platform did not return an upload link", data: { keys: Object.keys(doc ?? {}) } });
  }
  rememberUploadUrl(doc.id, uploadUrl);
  return { id: doc.id, status: doc.status ?? doc.attributes?.status };
});
