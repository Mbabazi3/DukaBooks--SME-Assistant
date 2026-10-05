<script setup>
const api = useSmeApi();

// Customers come from CRM, which may not be enabled yet (403) — then the owner types them in.
const { data: customers, error: customersError } = await useAsyncData("rem-customers", () => api.listCustomers());
const { data: reminders, refresh: refreshReminders, error: remindersError } = await useAsyncData("reminders", () => api.listReminders());
const crmList = computed(() => (customersError.value ? [] : customers.value ?? []));

const customerId = ref(null);
const manual = ref({ name: "", email: "" });
const intent = ref("order_ready");
const amount = ref(null);
const draft = ref(null);
const composing = ref(false);
const sending = ref(false);
const error = ref(null);
const notice = ref(null);

const intents = [
  { id: "order_ready", label: "📦 Order ready for pickup" },
  { id: "payment_due", label: "💰 Payment reminder" },
  { id: "custom", label: "✏️ General update" }
];

const recipient = computed(() => {
  const c = crmList.value.find((c) => c.id === customerId.value);
  if (c) return { id: c.id, name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(), email: c.email };
  const email = manual.value.email.trim();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? { name: manual.value.name.trim(), email } : null;
});

async function compose() {
  if (!recipient.value) return;
  composing.value = true;
  draft.value = null;
  error.value = notice.value = null;
  try {
    // SDK (server side): email.outboundEmails.composeWithAi({ to, prompt, context }) (Test 018A)
    draft.value = await api.composeReminder({ customer: recipient.value, intent: intent.value, amount: amount.value });
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    composing.value = false;
  }
}

async function send() {
  if (!draft.value) return;
  sending.value = true;
  error.value = null;
  try {
    // SDK (server side): email.outboundEmails.send(draft.id) — a PATCH (Test 018B)
    await api.sendReminder(draft.value);
    notice.value = `Sent to ${draft.value.to}.`;
    draft.value = null;
    amount.value = null;
    await refreshReminders();
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    sending.value = false;
  }
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
      <div v-if="crmList.length" class="chat-input" style="margin-bottom:8px">
        <select v-model="customerId" style="flex:1; padding:9px 12px; border:1px solid var(--line); border-radius:8px; font-size:.95rem">
          <option :value="null">Type a new recipient below…</option>
          <option v-for="c in crmList" :key="c.id" :value="c.id">
            {{ c.first_name }} {{ c.last_name }} ({{ c.email }})
          </option>
        </select>
      </div>
      <p v-else-if="isNotEnabled(customersError)" class="muted" style="margin:0 0 8px">
        Customer list (CRM) isn't enabled for this workspace yet — type the recipient instead.
      </p>
      <div v-if="!customerId" class="chat-input" style="margin-bottom:8px">
        <input type="text" v-model="manual.name" placeholder="Customer name" />
        <input type="email" v-model="manual.email" placeholder="customer@example.com" />
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
        <button class="btn" :disabled="!recipient || composing" @click="compose">
          {{ composing ? "AI is writing…" : "Draft with AI" }}
        </button>
      </div>
    </div>

    <p v-if="error" class="card" style="color:#b91c1c">{{ error }}</p>
    <p v-if="notice" class="card" style="color:#15803d">{{ notice }}</p>

    <div v-if="draft" class="card">
      <h2>2 · Review the draft</h2>
      <p class="sub">To: {{ draft.to }} · subject: <strong>{{ draft.subject }}</strong></p>
      <div class="draft-body">{{ draft.body }}</div>
      <div class="chips">
        <button class="btn" :disabled="sending" @click="send">
          {{ sending ? "Sending…" : "Send now" }}
        </button>
        <button class="chip btn-chip" :disabled="sending" @click="draft = null">× Discard</button>
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
          <tr v-if="remindersError">
            <td colspan="4" class="muted">Couldn't load the log: {{ errorMessage(remindersError) }}</td>
          </tr>
          <tr v-else-if="!(reminders ?? []).length">
            <td colspan="4" class="muted">Nothing sent yet.</td>
          </tr>
          <tr v-for="r in reminders ?? []" :key="r.id">
            <td>{{ r.subject }}</td>
            <td class="muted">{{ r.to }}</td>
            <td><span class="chip" :title="r.error || ''">{{ r.status }}</span></td>
            <td class="muted">{{ r.sent_at ? new Date(r.sent_at).toLocaleString() : "—" }}</td>
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
