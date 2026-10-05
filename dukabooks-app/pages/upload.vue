<script setup>
const api = useSmeApi();

const file = ref(null);
const running = ref(false);
const step = ref(-1); // index of the active step, -1 = idle
const extracted = ref(null);
const error = ref(null);
const progress = ref(null); // latest status while the AI reads the document
const MAX_MB = 20;

// Each step maps 1-to-1 to a verified SDK call, run by the server routes in server/api/uploads/.
const steps = [
  { name: "Request a secure upload link", sdk: "client.extraction.documents.beginUpload(attrs) → POST /extraction/documents/begin-upload" },
  { name: "Upload the file to storage", sdk: "PUT /api/uploads/:id/file → server PUTs it to the presigned upload_url" },
  { name: "Hand the document to the AI", sdk: "client.extraction.documents.finishUpload(id) → PATCH .../finish-upload" },
  { name: "AI is reading the invoice…", sdk: "poll client.extraction.documents.status(id) → results.byDocument(id)" }
];

function onFile(e) {
  const f = e.target.files?.[0] ?? null;
  extracted.value = null;
  error.value = null;
  if (f && f.size > MAX_MB * 1024 * 1024) {
    file.value = null;
    error.value = `That file is over ${MAX_MB} MB — please pick a smaller scan.`;
    return;
  }
  file.value = f;
  step.value = -1;
}

async function scan() {
  if (!file.value) return;
  running.value = true;
  extracted.value = null;
  error.value = null;

  try {
    step.value = 0;
    const doc = await api.beginUpload(file.value);
    step.value = 1;
    await api.putToPresignedUrl(doc.id, file.value);
    step.value = 2;
    await api.finishUpload(doc.id);
    step.value = 3;
    extracted.value = await api.waitForProcessed(doc.id, { onStatus: (s) => (progress.value = s) });
    step.value = steps.length; // all done
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    running.value = false;
    progress.value = null;
  }
}

const stateOf = (i) =>
  step.value > i || step.value === steps.length ? "done" : step.value === i ? "active" : "";
</script>

<template>
  <div>
    <h1 class="page-title">Scan an invoice</h1>
    <p class="page-sub">Take a photo or pick a PDF — the AI turns it into numbers you can use.</p>

    <div class="card">
      <h2>1 · Choose a document</h2>
      <p class="sub">PDF or photo of the invoice.</p>
      <input type="file" accept=".pdf,image/*" @change="onFile" />
      <p v-if="file" class="muted">Selected: {{ file.name }}</p>
      <p v-if="error" class="muted" style="color:#b91c1c">Failed: {{ error }}</p>
      <div class="chips">
        <button class="btn" :disabled="!file || running" @click="scan">
          {{ running ? "Working…" : "Scan invoice" }}
        </button>
      </div>
    </div>

    <div v-if="step >= 0" class="card">
      <h2>2 · What happens behind the scenes</h2>
      <p class="sub">Each step is a real GPT Platform call, made by the app's server with the SDK.</p>
      <p v-if="progress && step === 3" class="muted">Status: {{ progress.status }}<span v-if="progress.progress != null"> · {{ progress.progress }}%</span></p>
      <div v-for="(s, i) in steps" :key="s.name" class="step" :class="stateOf(i)">
        <div class="dot">✓</div>
        <div>
          <div class="name">{{ s.name }}</div>
          <div class="sdk mono">{{ s.sdk }}</div>
        </div>
      </div>
    </div>

    <div v-if="extracted" class="card">
      <h2>3 · Extracted details</h2>
      <p class="sub">
        <template v-if="extracted.avg_confidence != null">AI confidence: {{ Math.round(extracted.avg_confidence * 100) }}%. </template>
        Low-confidence fields go to a human review queue on the platform.
      </p>
      <table>
        <tbody>
          <tr><th>Supplier</th><td>{{ extracted.invoice?.supplier ?? "—" }}</td></tr>
          <tr><th>Invoice number</th><td class="mono">{{ extracted.invoice?.invoice_number ?? "—" }}</td></tr>
          <tr><th>Date</th><td>{{ extracted.invoice?.invoice_date ?? "—" }}</td></tr>
          <tr><th>Total</th><td class="num">{{ extracted.invoice?.total ? api.formatUGX(extracted.invoice.total) : "—" }}</td></tr>
        </tbody>
      </table>
      <details v-if="Object.keys(extracted.extracted_fields ?? {}).length" style="margin-top:10px">
        <summary class="muted">All extracted fields ({{ Object.keys(extracted.extracted_fields).length }})</summary>
        <pre class="mono" style="white-space:pre-wrap;font-size:.8rem">{{ JSON.stringify(extracted.extracted_fields, null, 2) }}</pre>
      </details>
      <div class="chips">
        <NuxtLink to="/invoices"><span class="chip btn-chip">See it in my invoice list →</span></NuxtLink>
      </div>
    </div>
  </div>
</template>
