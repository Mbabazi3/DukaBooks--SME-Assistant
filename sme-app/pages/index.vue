<script setup>
const api = useSmeApi();

// REAL: client.extraction.results.query("result_test_001", { filters: [], limit: 100, offset: 0 })
const { data: all } = await useAsyncData("all-invoices", () => api.resultsQuery({}));

// REAL: client.crm.contacts.listByWorkspace("ws_...") + client.crm.deals.listByWorkspace("ws_...")
const { data: customers } = await useAsyncData("dash-customers", () => api.listCustomers());
const { data: deals } = await useAsyncData("dash-deals", () => api.listDeals());

const stats = computed(() => {
  const rows = all.value?.rows ?? [];
  const total = rows.reduce((s, r) => s + r.total, 0);
  const activeDeals = (deals.value ?? []).filter(
    (d) => !["stage_closed_won", "stage_closed_lost"].includes(d.pipeline_stage_id)
  );
  const pipelineValue = activeDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  return {
    count: rows.length,
    total,
    suppliers: new Set(rows.map((r) => r.supplier)).size,
    above2M: rows.filter((r) => r.total > 2_000_000).length,
    customers: customers.value?.length ?? 0,
    activeDeals: activeDeals.length,
    pipelineValue
  };
});
</script>

<template>
  <div>
    <h1 class="page-title">Good morning 👋</h1>
    <p class="page-sub">Here is where your business money stands today.</p>

    <div class="stat-grid">
      <div class="stat">
        <div class="label">Invoices on file</div>
        <div class="value">{{ stats.count }}</div>
      </div>
      <div class="stat">
        <div class="label">Total invoiced</div>
        <div class="value">{{ api.formatUGX(stats.total) }}</div>
      </div>
      <div class="stat">
        <div class="label">Customers</div>
        <div class="value">{{ stats.customers }}</div>
      </div>
      <div class="stat">
        <div class="label">Open deals</div>
        <div class="value">{{ stats.activeDeals }} <span class="muted" style="font-size:.8rem;font-weight:400">worth {{ api.formatUGX(stats.pipelineValue) }}</span></div>
      </div>
    </div>

    <div class="card">
      <h2>Latest invoices</h2>
      <p class="sub">Extracted automatically from your scanned documents.</p>
      <table>
        <thead>
          <tr><th>Invoice</th><th>Supplier</th><th>Date</th><th style="text-align:right">Total</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in (all?.rows ?? []).slice(-5).reverse()" :key="r.invoice_number">
            <td class="mono">{{ r.invoice_number }}</td>
            <td>{{ r.supplier }}</td>
            <td>{{ r.invoice_date }}</td>
            <td class="num">{{ api.formatUGX(r.total) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="chips">
        <NuxtLink to="/upload"><span class="chip btn-chip">＋ Scan a new invoice</span></NuxtLink>
        <NuxtLink to="/customers"><span class="chip btn-chip">👥 Customers</span></NuxtLink>
        <NuxtLink to="/deals"><span class="chip btn-chip">📈 Deals board</span></NuxtLink>
        <NuxtLink to="/ask"><span class="chip btn-chip">💬 Ask the AI about your money</span></NuxtLink>
      </div>
    </div>
  </div>
</template>
