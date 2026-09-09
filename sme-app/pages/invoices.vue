<script setup>
const api = useSmeApi();
const threshold = ref(0);
const applied = ref(0);
const loading = ref(false);

// REAL: client.extraction.results.query("result_test_001", {
//   filters: [{ field: "total", op: "gt", value: applied }], limit: 100, offset: 0
// })
// The filtering runs on the SERVER — the app never downloads rows it won't show.
const { data, refresh } = await useAsyncData(
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
        "Show invoices with a total above…" — runs server-side via
        <span class="mono">results.query</span> (verified in Test 010).
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
          <tr v-for="r in data?.rows ?? []" :key="r.invoice_number">
            <td class="mono">{{ r.invoice_number }}</td>
            <td>{{ r.supplier }}</td>
            <td>{{ r.invoice_date }}</td>
            <td class="num">{{ api.formatUGX(r.total) }}</td>
          </tr>
          <tr v-if="!(data?.rows ?? []).length">
            <td colspan="4" class="muted">No invoices above that amount.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
