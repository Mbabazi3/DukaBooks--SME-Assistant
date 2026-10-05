// Scan step 2: the browser sends the file here; the server PUTs it to the
// presigned storage URL. Keeps the URL server-side and avoids storage CORS.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;
  const body = await readRawBody(event, false);
  if (!body?.length) throw createError({ statusCode: 400, statusMessage: "Empty file" });

  const url = await uploadUrlFor(id);
  const res = await fetch(url, {
    method: "PUT",
    body,
    headers: { "Content-Type": getRequestHeader(event, "content-type") || "application/octet-stream" },
  });
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `Storage rejected the upload (${res.status})`, data: { body: (await res.text()).slice(0, 300) } });
  }
  return { id, uploaded: true, bytes: body.length };
});
