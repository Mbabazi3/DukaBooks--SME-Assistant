<script setup>
const api = useSmeApi();

const { data: customers } = await useAsyncData("rem-customers", () => api.listCustomers());
const { data: reminders, refresh: refreshReminders } = await useAsyncData("reminders", () => api.listReminders());

const customerId = ref(null);
const intent = ref("order_ready");
const amount = ref(null);
const draft = ref(null);
const composing = ref(false);
const sending = ref(false);

const intents = [
  { id: "order_ready", label: "📦 Order ready for pickup" },
  { id: "payment_due", label: "💰 Payment reminder" },
  { id: "custom", label: "✏️ General update" }
];

const selectedCustomer = computed(() =>
  (customers.value ?? []).find((c) => c.id === customerId.value)
);

async function compose() {
  if (!selectedCustomer.value) return;
  composing.value = true;
  draft.value = null;
  // REAL: client.email.outboundEmails.composeWithAi({ to, prompt, context, contact_ref_id })
  //   → POST /email/outbound-emails/compose-with-ai (Test 018A)
  draft.value = await api.composeReminder({
    customer: selectedCustomer.value,
    intent: intent.value,
    amount: amount.value
  });
  composing.value = false;
}

async function send() {
  if (!draft.value) return;
  sending.value = true;
  // REAL: client.email.outboundEmails.send(draft.id)
  //   → PATCH /email/outbound-emails/:id/send (Test 018B — a PATCH!)
  await api.sendReminder(draft.value);
  draft.value = null;
  amount.value = null;
  await refreshReminders();
  sending.value = false;
}
</script>

<template>
  <div>
    <h1 class="page-title">Reminders</h1>
    <p class="page-sub">
      Let the AI write it, you approve it, the platform delivers it
      <span class="mono">(email.outboundEmails, verified Test 018)</span>.
    </p>

    <div class="card">
      <h2>1 · Who and what</h2>
      <div class="chat-input" style="margin-bottom:8px">
        <select v-model="customerId" style="flex:1; padding:9px 12px; border:1px solid var(--line); border-radius:8px; font-size:.95rem">
          <option :value="null" disabled>Choose a customer…</option>
          <option v-for="c in customers ?? []" :key="c.id" :value="c.id">
            {{ c.first_name }} {{ c.last_name }} ({{ c.email }})
          </option>
        </select>
      </div>
      <div class="chips" style="margin-bottom:8px">
        <button
          v-for="i in intents" :key="i.id"
          class="chip" :class="{ 'btn-chip': intent !== i.id }"
          :style="intent === i.id ? '' : 'opacity:.85'"
          @click="intent = i.id"
        >
          {{ i.label }}
        </button>
      </div>
      <div class="chat-input">
        <input type="number" v-model.number="amount" placeholder="Amount in UGX (optional)" />
        <button class="btn" :disabled="!customerId || composing" @click="compose">
          {{ composing ? "AI is writing…" : "Draft with AI" }}
        </button>
      </div>
    </div>

    <div v-if="draft" class="card">
      <h2>2 · Review the draft</h2>
      <p class="sub">To: {{ draft.to }} · subject: <strong>{{ draft.subject }}</strong></p>
      <div class="draft-body">{{ draft.body }}</div>
      <div class="chips">
        <button class="btn" :disabled="sending" @click="send">
          {{ sending ? "Sending…" : "Send now" }}
        </button>
        <button class="chip btn-chip" @click="draft = null">× Discard</button>
      </div>
    </div>

    <div class="card">
      <h2>Sent reminders <span class="muted">({{ reminders?.length ?? 0 }})</span></h2>
      <p class="sub">
        <span class="mono">GET /email/outbound-emails/workspace/:ws</span> — delivery tracking comes free from the platform.
      </p>
      <table>
        <thead>
          <tr><th>Subject</th><th>To</th><th>Status</th><th>Sent</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in reminders ?? []" :key="r.id">
            <td>{{ r.subject }}</td>
            <td class="muted">{{ r.customer }}</td>
            <td><span class="chip">{{ r.status }}</span></td>
            <td class="muted">{{ new Date(r.sent_at).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.draft-body {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px;
  white-space: pre-wrap;
  font-size: 0.92rem;
}
</style>
