/**
 * useSmeApi — the adapter every page calls.
 *
 * Browser side only: it calls this app's own backend routes (`/api/*`, see
 * `server/api/`). Those routes are where the real GPT Platform SDK runs
 * (`server/utils/gpt.ts`), so the API key stays on the server.
 *
 *   page → useSmeApi() → $fetch('/api/...') → Nitro route → GptClient → GPT Platform
 *
 * Method names and return shapes are the same ones the pages used with the old
 * in-browser mock, so pages did not need rewriting.
 */

const formatUGX = (n) =>
  new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(Number(n) || 0);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// useRequestFetch forwards cookies/headers during SSR; plain $fetch in the browser.
const api = (path, opts) => useRequestFetch()(`/api${path}`, opts);

export const useSmeApi = () => ({
  formatUGX,

  // Invoices (extraction results)
  resultsQuery: ({ field = "total", op = "gt", value = 0 } = {}) =>
    api("/invoices", { query: { field, op, value } }),

  // Scan flow
  beginUpload: (file) =>
    api("/uploads", { method: "POST", body: { filename: file.name, content_type: file.type || "application/pdf" } }),
  // The file goes straight from the browser to storage via the presigned URL —
  // it never passes through our server.
  putToPresignedUrl: (uploadUrl, file) =>
    fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } })
      .then((r) => { if (!r.ok) throw new Error(`Upload failed (${r.status})`); return true; }),
  finishUpload: (docId) => api(`/uploads/${docId}/finish`, { method: "PATCH" }),
  async waitForProcessed(docId, { intervalMs = 2000, timeoutMs = 120000 } = {}) {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      const doc = await api(`/uploads/${docId}`);
      if (doc.failed) throw new Error(`Extraction ${doc.status}`);
      if (doc.done) return doc;
      await sleep(intervalMs);
    }
    throw new Error("Timed out waiting for the document to be processed");
  },

  // Ask AI (threads + streaming)
  threadsCreate: (title) => api("/assistant/threads", { method: "POST", body: { title } }),
  async messagesStream(threadId, content, onToken) {
    const res = await fetch(`/api/assistant/threads/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok || !res.body) throw new Error(`Assistant request failed (${res.status})`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let acc = "";
    let metadata = {};
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop();
      for (const evt of events) {
        const line = evt.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const chunk = JSON.parse(line.slice(6));
        if (chunk.type === "token" || chunk.type === "content") {
          acc += chunk.content ?? "";
          onToken?.(chunk.content ?? "");
        } else if (chunk.type === "done") {
          metadata = chunk.metadata ?? {};
          if (!acc && chunk.content) acc = chunk.content;
        } else if (chunk.type === "error") {
          throw new Error(chunk.error ?? "Assistant error");
        }
      }
    }
    return { content: acc, metadata };
  },

  // Customers (CRM contacts)
  listCustomers: (options = {}) => api("/customers", { query: options }),
  createCustomer: (attrs) => api("/customers", { method: "POST", body: attrs }),
  updateCustomerStage: (contactId, stage) =>
    api(`/customers/${contactId}/stage`, { method: "PATCH", body: { lifecycle_stage: stage } }),

  // Deals + pipeline
  listDeals: () => api("/deals"),
  createDeal: (attrs) => api("/deals", { method: "POST", body: attrs }),
  moveDealStage: (dealId, stageId) => api(`/deals/${dealId}/stage`, { method: "PATCH", body: { stage_id: stageId } }),
  listPipelineStages: () => api("/deals/stages"),

  // Follow-ups (CRM activities)
  createActivity: (attrs) => api("/activities", { method: "POST", body: attrs }),
  listActivities: () => api("/activities"),

  // Inventory (catalog)
  listProducts: () => api("/products"),
  createProduct: (attrs) => api("/products", { method: "POST", body: attrs }),

  // Reminders (email)
  composeReminder: ({ customer, intent, amount }) =>
    api("/reminders/compose", { method: "POST", body: { customer, intent, amount } }),
  sendReminder: (draft) => api(`/reminders/${draft.id}/send`, { method: "POST" }),
  listReminders: () => api("/reminders"),

  // Appointments (scheduling)
  listServices: () => api("/services"),
  listAppointmentsBetween: (startIso, endIso) => api("/appointments", { query: { start: startIso, end: endIso } }),
  createAppointment: ({ title, startIso, endIso, serviceId }) =>
    api("/appointments", { method: "POST", body: { title, startIso, endIso, serviceId } }),
  completeAppointment: (id) => api(`/appointments/${id}/complete`, { method: "PATCH" }),
  cancelAppointment: (id) => api(`/appointments/${id}/cancel`, { method: "PATCH" }),
});
