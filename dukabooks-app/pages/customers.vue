<script setup>
const api = useSmeApi();

const { data: customers, refresh } = await useAsyncData("customers", () => api.listCustomers());
const { data: activities, refresh: refreshActivities } = await useAsyncData("activities", () => api.listActivities());

const form = ref({ first_name: "", last_name: "", phone: "", email: "" });
const saving = ref(false);
const showForm = ref(false);
const promoting = ref(null); // id of contact being promoted
const noteForm = ref({ subject: "", body: "" });
const savingNote = ref(false);
const showNoteForm = ref(false);

async function addCustomer() {
  if (!form.value.first_name || !form.value.phone) return;
  saving.value = true;
  // SDK (server side): client.crm.contacts.create(...) → POST /crm/contacts (Test 008A)
  await api.createCustomer({ ...form.value });
  form.value = { first_name: "", last_name: "", phone: "", email: "" };
  await refresh();
  saving.value = false;
  showForm.value = false;
}

async function promote(c) {
  promoting.value = c.id;
  // SDK (server side): client.crm.contacts.update(c.id, { lifecycle_stage: "customer" })
  //   → PATCH /crm/contacts/:id (Test 016A)
  await api.updateCustomerStage(c.id, "customer");
  await refresh();
  promoting.value = null;
}

async function addNote() {
  if (!noteForm.value.subject) return;
  savingNote.value = true;
  // SDK (server side): client.crm.activities.create({ type: "note", subject, body })
  //   → POST /crm/activities (Test 016B)
  await api.createActivity({ type: "note", ...noteForm.value });
  noteForm.value = { subject: "", body: "" };
  await refreshActivities();
  savingNote.value = false;
  showNoteForm.value = false;
}

const stageLabel = {
  lead: "Lead",
  customer: "Customer",
  evangelist: "Fan",
  churned: "Lost"
};

const typeIcon = { note: "📝", call: "📞", meeting: "🤝", email: "✉️" };
</script>

<template>
  <div>
    <div style="display:flex; align-items:baseline; gap:12px">
      <h1 class="page-title">Customers</h1>
      <NuxtLink to="/deals"><span class="chip btn-chip">Deals board →</span></NuxtLink>
    </div>
    <p class="page-sub">
      Everyone you do business with — kept in the platform CRM
      <span class="mono">(crm.contacts, verified Tests 008/013)</span>.
    </p>

    <div class="card">
      <h2>Your people <span class="muted">({{ customers?.length ?? 0 }})</span></h2>
      <p class="sub">New sign-ups start as "Lead" — promote them as the relationship grows.</p>
      <table>
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Email</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="c in customers ?? []" :key="c.id">
            <td>{{ c.first_name }} {{ c.last_name }}</td>
            <td class="mono">{{ c.phone }}</td>
            <td class="muted">{{ c.email }}</td>
            <td><span class="chip">{{ stageLabel[c.lifecycle_stage] ?? c.lifecycle_stage }}</span></td>
            <td style="text-align:right">
              <button
                v-if="c.lifecycle_stage === 'lead'"
                class="btn ghost move-btn"
                :disabled="promoting === c.id"
                @click="promote(c)"
              >
                {{ promoting === c.id ? "Promoting…" : "Promote ★" }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="chips">
        <button class="chip btn-chip" @click="showForm = !showForm">
          {{ showForm ? "× Cancel" : "＋ Add customer" }}
        </button>
      </div>
    </div>

    <div v-if="showForm" class="card">
      <h2>New customer</h2>
      <p class="sub">Saved via <span class="mono">POST /crm/contacts</span>.</p>
      <div class="chat-input" style="margin-bottom:8px">
        <input type="text" v-model="form.first_name" placeholder="First name *" />
        <input type="text" v-model="form.last_name" placeholder="Last name" />
      </div>
      <div class="chat-input" style="margin-bottom:8px">
        <input type="text" v-model="form.phone" placeholder="Phone (e.g. +2567…) *" />
        <input type="text" v-model="form.email" placeholder="Email (optional)" />
      </div>
      <button class="btn" :disabled="saving || !form.first_name || !form.phone" @click="addCustomer">
        {{ saving ? "Saving…" : "Save customer" }}
      </button>
    </div>

    <div class="card">
      <h2>Follow-ups</h2>
      <p class="sub">
        Calls and notes about your customers
        <span class="mono">(crm.activities, verified Test 016)</span>.
      </p>
      <div v-for="a in activities ?? []" :key="a.id" class="activity">
        <div class="act-head">
          <span>{{ typeIcon[a.type] ?? "📝" }} {{ a.subject }}</span>
          <span class="muted" style="font-size:.78rem">{{ new Date(a.occurred_at).toLocaleDateString() }}</span>
        </div>
        <div class="muted" style="font-size:.88rem">{{ a.body }}</div>
      </div>
      <div class="chips">
        <button class="chip btn-chip" @click="showNoteForm = !showNoteForm">
          {{ showNoteForm ? "× Cancel" : "＋ Log a follow-up" }}
        </button>
      </div>
      <div v-if="showNoteForm" style="margin-top:10px">
        <div class="chat-input" style="margin-bottom:8px">
          <input type="text" v-model="noteForm.subject" placeholder="What happened? (e.g. Called about quote) *" />
        </div>
        <div class="chat-input" style="margin-bottom:8px">
          <input type="text" v-model="noteForm.body" placeholder="Details (optional)" />
        </div>
        <button class="btn" :disabled="savingNote || !noteForm.subject" @click="addNote">
          {{ savingNote ? "Saving…" : "Save follow-up" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.move-btn { padding: 5px 10px; font-size: 0.78rem; border-radius: 8px; }
.activity {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.act-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 2px;
}
</style>
