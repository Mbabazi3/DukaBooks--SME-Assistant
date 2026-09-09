<script setup>
const api = useSmeApi();

const file = ref(null);
const running = ref(false);
const step = ref(-1); // index of the active step, -1 = idle
const extracted = ref(null);

// Each step maps 1-to-1 to a verified SDK call (see useSmeApi.js comments).
const steps = [
  { name: "Request a secure upload link", sdk: "client.extraction.documents.beginUpload(attrs) → POST /extraction/documents/begin-upload" },
  { name: "Upload the file to storage", sdk: "fetch(upload_url, { method: 'PUT', body: file }) — presigned URL" },
  { name: "Hand the document to the AI", sdk: "client.extraction.documents.finishUpload(id) → PATCH .../finish-upload" },
  { name: "AI is reading the invoice…", sdk: "poll client.extraction.documents.status(id) until 'processed'" }
];

function onFile(e) {
  file.value = e.target.files?.[0]?.name ?? null;
  extracted.value = null;
  step.value = -1;
}

async function scan() {
  if (!file.value) return;
  running.value = true;
  extracted.value = null;

  for (step.value = 0; step.value < steps.length; step.value++) {
    if (step.value === 0) await api.beginUpload(file.value);
    if (step.value === 1) await api.putToPresignedUrl();
    if (step.value === 2) await api.finishUpload("doc_new_001");
    if (step.value === 3) {
      const result = await api.waitForProcessed("doc_new_001");
      extracted.value = result;
    }
  }
  step.value = steps.length; // all done
  running.value = false;
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
      <p v-if="file" class="muted">Selected: {{ file }}</p>
      <div class="chips">
        <button class="btn" :disabled="!file || running" @click="scan">
          {{ running ? "Working…" : "Scan invoice" }}
        </button>
      </div>
    </div>

    <div v-if="step >= 0" class="card">
      <h2>2 · What happens behind the scenes</h2>
      <p class="sub">Each step is a real GPT Platform call — this demo simulates them locally.</p>
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
        AI confidence: {{ Math.round(extracted.avg_confidence * 100) }}% — in the real app, low
        confidence sends this to a human review queue first.
      </p>
      <table>
        <tbody>
          <tr><th>Supplier</th><td>{{ extracted.extracted_fields.supplier }}</td></tr>
          <tr><th>Invoice number</th><td class="mono">{{ extracted.extracted_fields.invoice_number }}</td></tr>
          <tr><th>Date</th><td>{{ extracted.extracted_fields.invoice_date }}</td></tr>
          <tr><th>Total</th><td class="num">{{ api.formatUGX(extracted.extracted_fields.total) }}</td></tr>
        </tbody>
      </table>
      <div class="chips">
        <NuxtLink to="/invoices"><span class="chip btn-chip">See it in my invoice list →</span></NuxtLink>
      </div>
    </div>
  </div>
</template>
