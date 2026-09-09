<script setup>
const api = useSmeApi();

const messages = ref([]);
const input = ref("");
const busy = ref(false);
const thread = ref(null);

onMounted(async () => {
  // REAL: client.threads.create({ title, agent_id: "agt_sme_analyst" }) → POST /threads
  thread.value = await api.threadsCreate("SME Invoice Assistant");
  messages.value.push({
    role: "assistant",
    content:
      "Hello! I can see all 5 of your invoices. Ask me anything — for example " +
      "\"Which supplier invoices are above UGX 2 million?\"",
    sources: []
  });
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

  // REAL: client.threads.messages.stream(thread.id, { content: question })
  //   → POST /threads/:id/messages/stream  (SSE 'token' events, verified Test 011C)
  const final = await api.messagesStream(thread.value.id, question, (tok) => {
    reply.content += tok;
  });
  reply.content = final.content;
  reply.sources = final.metadata?.sources ?? [];
  reply.streaming = false;
  busy.value = false;
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
      <button class="btn" :disabled="busy" @click="send()">Send</button>
    </div>
  </div>
</template>
