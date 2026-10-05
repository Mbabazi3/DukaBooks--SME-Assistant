<script setup>
const api = useSmeApi();

const messages = ref([]);
const input = ref("");
const busy = ref(false);
const thread = ref(null);

const setupError = ref(null);

onMounted(async () => {
  // → POST /api/assistant/threads: finds or creates the DukaBooks agent, then
  //   client.threads.create({ title, agent_id }) (Test 011A)
  try {
    thread.value = await api.threadsCreate("SME Invoice Assistant");
    const n = thread.value.invoice_count ?? 0;
    messages.value.push({
      role: "assistant",
      content: n
        ? `Hello! I can see ${n} extracted invoice${n === 1 ? "" : "s"}. Ask me anything — for example "Which supplier invoices are above UGX 2 million?"`
        : "Hello! I don't see any extracted invoices yet — scan one on the Scan page, then ask me about it.",
      sources: []
    });
  } catch (err) {
    setupError.value = errorMessage(err);
  }
});

const suggestions = [
  "Which supplier invoices are above UGX 2 million?",
  "How much do I owe Kampala Hardware?",
  "What is my biggest invoice this month?"
];

async function send(text) {
  const question = (text ?? input.value).trim();
  if (!question || busy.value || !thread.value) return;
  input.value = "";
  busy.value = true;

  messages.value.push({ role: "user", content: question });
  const reply = { role: "assistant", content: "", sources: [], streaming: true };
  messages.value.push(reply);

  // → POST /api/assistant/threads/:id/messages → client.threads.messages.stream(...)
  //   (SSE 'token' events relayed by the server, verified Test 011C)
  try {
    const final = await api.messagesStream(thread.value.id, question, (tok) => {
      reply.content += tok;
    });
    reply.content = final.content;
    reply.sources = final.metadata?.sources ?? [];
  } catch (err) {
    reply.content = `Sorry, something went wrong: ${err.message}`;
  } finally {
    reply.streaming = false;
    busy.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Ask AI</h1>
    <p class="page-sub">
      Answers are grounded in your extracted invoices and cite their numbers
      <span class="mono">(threads + agents, verified Test 011)</span>.
    </p>

    <div class="chips">
      <button v-for="s in suggestions" :key="s" class="chip btn-chip" :disabled="busy" @click="send(s)">
        {{ s }}
      </button>
    </div>

    <p v-if="setupError" class="card" style="color:#b91c1c">Couldn't start the assistant: {{ setupError }}</p>

    <div class="chat">
      <div v-for="(m, i) in messages" :key="i" class="bubble" :class="m.role">
        {{ m.content }}<span v-if="m.streaming" class="muted"> ▌</span>
        <div v-if="m.sources?.length" class="chips">
          <span v-for="s in m.sources" :key="s" class="chip">📄 {{ s }}</span>
        </div>
      </div>
    </div>

    <div class="chat-input">
      <input
        type="text"
        v-model="input"
        placeholder="Ask about your invoices…"
        @keyup.enter="send()"
      />
      <button class="btn" :disabled="busy || !thread" @click="send()">Send</button>
    </div>
  </div>
</template>
