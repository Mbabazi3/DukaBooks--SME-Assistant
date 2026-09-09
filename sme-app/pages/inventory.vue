<script setup>
const api = useSmeApi();

// REAL: client.catalog.products.list("ws_...") → GET /catalog/products/workspace/:ws (Test 017B)
const { data: products, refresh } = await useAsyncData("products", () => api.listProducts());

const form = ref({ name: "", sku: "", base_price: null });
const saving = ref(false);
const showForm = ref(false);

async function addProduct() {
  if (!form.value.name || !form.value.base_price) return;
  saving.value = true;
  // REAL: client.catalog.products.create(...) → POST /catalog/products (Test 017A)
  // NOTE: base_price is a STRING on the platform.
  await api.createProduct({
    name: form.value.name,
    sku: form.value.sku || form.value.name.slice(0, 3).toUpperCase() + "-1",
    base_price: String(form.value.base_price)
  });
  form.value = { name: "", sku: "", base_price: null };
  await refresh();
  saving.value = false;
  showForm.value = false;
}
</script>

<template>
  <div>
    <h1 class="page-title">Inventory</h1>
    <p class="page-sub">
      What you sell, from the platform catalog
      <span class="mono">(catalog.products, verified Test 017)</span>.
    </p>

    <div class="card">
      <h2>Products <span class="muted">({{ products?.length ?? 0 }})</span></h2>
      <p class="sub">Stock lives on the product record — items at 0 are highlighted.</p>
      <table>
        <thead>
          <tr><th>Product</th><th>SKU</th><th style="text-align:right">Price</th><th style="text-align:right">Stock</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in products ?? []" :key="p.id">
            <td>{{ p.name }}</td>
            <td class="mono">{{ p.sku }}</td>
            <td class="num">{{ api.formatUGX(Number(p.base_price)) }}</td>
            <td class="num">
              <span class="chip" :style="p.stock === 0 ? 'background:#fef2f2;color:#b91c1c;border-color:#fecaca' : ''">
                {{ p.stock === 0 ? "Out of stock" : p.stock }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="chips">
        <button class="chip btn-chip" @click="showForm = !showForm">
          {{ showForm ? "× Cancel" : "＋ Add product" }}
        </button>
      </div>
    </div>

    <div v-if="showForm" class="card">
      <h2>New product</h2>
      <p class="sub">Saved via <span class="mono">POST /catalog/products</span> (base_price sent as a string).</p>
      <div class="chat-input" style="margin-bottom:8px">
        <input type="text" v-model="form.name" placeholder="Product name *" />
        <input type="text" v-model="form.sku" placeholder="SKU (optional)" />
      </div>
      <div class="chat-input" style="margin-bottom:8px">
        <input type="number" v-model.number="form.base_price" placeholder="Price in UGX *" />
      </div>
      <button class="btn" :disabled="saving || !form.name || !form.base_price" @click="addProduct">
        {{ saving ? "Saving…" : "Save product" }}
      </button>
    </div>
  </div>
</template>
