<script setup>
const api = useSmeApi();
const threshold = ref(0);
const applied = ref(0);
const loading = ref(false);

// SDK (server side): documents.listByWorkspace → results.byDocument, filtered on
// our server (GET /api/invoices?field=total&op=gt&value=…) — the browser only gets matches.
const { data, refresh, error } = await useAsyncData(
  "filtered-invoices",
  () => api.resultsQuery({ field: "total", op: "gt", value: applied.value }),
  { watch: [applied] }
);

async function apply() {
  loading.value = true;
  applied.value = threshold.value;
  await refresh();
  loading.value = false;
}
</script>

<template>
  <div>
    <h1 class="page-title">Invoices</h1>
    <p class="page-sub">Ask the server for exactly the rows you need.</p>

    <div class="card">
      <h2>Filter</h2>
      <p class="sub">
        "Show invoices with a total above…" — filtered on the server from your
        extracted documents.
      </p>
      <div class="chat-input">
        <input type="number" v-model.number="threshold" min="0" step="100000" />
        <button class="btn" :disabled="loading" @click="apply">Apply</button>
      </div>
    </div>

    <div class="card">
      <h2>Results</h2>
      <p class="sub">{{ data?.filtered }} of {{ data?.total }} invoices match</p>
      <table>
        <thead>
          <tr><th>Invoice</th><th>Supplier</th><th>Date</th><th style="text-align:right">Total</th></tr>
        </thead>
        <tbody>
          <tr v-if="error">
            <td colspan="4" class="muted">Couldn't load invoices: {{ errorMessage(error) }}</td>
          </tr>
          <tr v-for="r in data?.rows ?? []" :key="r.document_id">
            <td class="mono">{{ r.invoice_number || "—" }}</td>
            <td>{{ r.supplier || "—" }}</td>
            <td>{{ r.invoice_date || "—" }}</td>
            <td class="num">{{ api.formatUGX(r.total) }}</td>
          </tr>
          <tr v-if="!error && !(data?.rows ?? []).length">
            <td colspan="4" class="muted">
              <template v-if="data?.total">No invoices above that amount.</template>
              <template v-else>No invoices yet — <NuxtLink to="/upload">scan one</NuxtLink>.</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
