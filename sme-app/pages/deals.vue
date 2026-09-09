<script setup>
const api = useSmeApi();

const { data: deals, refresh } = await useAsyncData("deals", () => api.listDeals());

// Board columns come from the platform pipeline, not hard-coded.
// REAL: pipelines.listByWorkspace → pipelineStages.listByPipeline (Test 015)
const { data: stages } = await useAsyncData("stages", () => api.listPipelineStages());
const stageList = computed(() => stages.value ?? []);
const showForm = ref(false);
const form = ref({ name: "", amount: null, company: "" });
const saving = ref(false);
const moving = ref(null); // id of deal currently being moved

const byStage = (stageId) => (deals.value ?? []).filter((d) => d.pipeline_stage_id === stageId);

function nextStage(currentId) {
  const i = stageList.value.findIndex((s) => s.id === currentId);
  if (i < 0 || i >= stageList.value.length - 2) return null; // Won/Lost are terminal
  return stageList.value[i + 1].id;
}

async function move(dealId, stageId) {
  moving.value = dealId;
  // REAL: client.crm.deals.moveStage(dealId, { stage_id: stageId })
  //   → PATCH /crm/deals/:id/move-stage (Test 014B)
  await api.moveDealStage(dealId, stageId);
  await refresh();
  moving.value = null;
}

async function addDeal() {
  if (!form.value.name || !form.value.amount) return;
  saving.value = true;
  // REAL: client.crm.deals.create(...) → POST /crm/deals (Test 014A)
  await api.createDeal({
    name: form.value.company ? `${form.value.company} — ${form.value.name}` : form.value.name,
    amount: Number(form.value.amount),
    company: form.value.company || null
  });
  form.value = { name: "", amount: null, company: "" };
  await refresh();
  saving.value = false;
  showForm.value = false;
}
</script>

<template>
  <div>
    <div style="display:flex; align-items:baseline; gap:12px">
      <h1 class="page-title">Deals</h1>
      <NuxtLink to="/customers"><span class="chip btn-chip">← Customers</span></NuxtLink>
    </div>
    <p class="page-sub">
      Money you are chasing, moved through stages with
      <span class="mono">deals.moveStage</span> (verified Test 014).
    </p>

    <div class="chips" style="margin-top:12px">
      <button class="chip btn-chip" @click="showForm = !showForm">
        {{ showForm ? "× Cancel" : "＋ New deal" }}
      </button>
    </div>

    <div v-if="showForm" class="card">
      <h2>New deal</h2>
      <div class="chat-input" style="margin-bottom:8px">
        <input type="text" v-model="form.company" placeholder="Customer / company" />
      </div>
      <div class="chat-input" style="margin-bottom:8px">
        <input type="text" v-model="form.name" placeholder="What are you selling? *" />
        <input type="number" v-model.number="form.amount" placeholder="Value in UGX *" />
      </div>
      <button class="btn" :disabled="saving || !form.name || !form.amount" @click="addDeal">
        {{ saving ? "Saving…" : "Create deal" }}
      </button>
    </div>

    <div class="board">
      <div v-for="s in stageList" :key="s.id" class="column">
        <div class="col-head">
          {{ s.name }}
          <span class="count">{{ byStage(s.id).length }}</span>
        </div>
        <div v-for="d in byStage(s.id)" :key="d.id" class="deal">
          <div class="deal-name">{{ d.name }}</div>
          <div class="deal-meta">
            <span class="muted">{{ d.company }}</span>
            <strong>{{ api.formatUGX(d.amount) }}</strong>
          </div>
          <button
            v-if="nextStage(d.pipeline_stage_id)"
            class="btn ghost move-btn"
            :disabled="moving === d.id"
            @click="move(d.id, nextStage(d.pipeline_stage_id))"
          >
            {{ moving === d.id ? "Moving…" : `Move to ${stageList[stageList.findIndex(x => x.id === d.pipeline_stage_id) + 1]?.name} →` }}
          </button>
        </div>
        <div v-if="!byStage(s.id).length" class="muted empty">—</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 12px;
}
.column {
  flex: 0 0 230px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
}
.col-head {
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.col-head .count {
  background: var(--bg);
  border-radius: 999px;
  padding: 1px 9px;
  font-size: 0.78rem;
  color: var(--muted);
}
.deal {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;
}
.deal-name { font-size: 0.88rem; font-weight: 600; }
.deal-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.8rem;
  margin: 4px 0 8px;
}
.move-btn { padding: 5px 10px; font-size: 0.78rem; border-radius: 8px; }
.empty { text-align: center; padding: 10px 0; }
</style>
