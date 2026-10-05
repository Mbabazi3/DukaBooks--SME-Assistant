<script setup>
const api = useSmeApi();

const { data: services } = await useAsyncData("services", () => api.listServices());

const now = new Date();
const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
const weekEnd = new Date(todayStart); weekEnd.setDate(weekEnd.getDate() + 7);

const { data: todays, refresh: refreshToday } = await useAsyncData(
  "appointments-today",
  () => api.listAppointmentsBetween(todayStart.toISOString(), new Date(now.getTime() + 86400000).toISOString())
);
const { data: upcoming, refresh: refreshUpcoming } = await useAsyncData(
  "appointments-upcoming",
  () => api.listAppointmentsBetween(new Date(now.getTime() + 86400000).toISOString(), weekEnd.toISOString())
);

const showForm = ref(false);
const form = ref({ title: "", date: new Date().toISOString().slice(0, 10), time: "10:00", serviceId: null });
const saving = ref(false);
const acting = ref(null); // id of event being completed/cancelled

const serviceName = (id) => services.value?.find((s) => s.id === id)?.name ?? "Meeting";
const serviceDuration = (id) => services.value?.find((s) => s.id === id)?.duration_minutes ?? 30;

async function book() {
  if (!form.value.title || !form.value.serviceId) return;
  saving.value = true;
  const start = new Date(`${form.value.date}T${form.value.time}:00`);
  const end = new Date(start.getTime() + serviceDuration(form.value.serviceId) * 60000);
  // SDK (server side): client.scheduling.events.create({ start_time, end_time, ... }) (Test 019B)
  await api.createAppointment({
    title: form.value.title,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    serviceId: form.value.serviceId
  });
  form.value = { title: "", date: form.value.date, time: "10:00", serviceId: null };
  await Promise.all([refreshToday(), refreshUpcoming()]);
  saving.value = false;
  showForm.value = false;
}

async function act(id, verb) {
  acting.value = id;
  // SDK (server side): client.scheduling.events.complete/cancel(id) (Test 019D)
  await (verb === "complete" ? api.completeAppointment(id) : api.cancelAppointment(id));
  await Promise.all([refreshToday(), refreshUpcoming()]);
  acting.value = null;
}

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtDay = (iso) =>
  new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });

const statusChip = (s) =>
  s === "confirmed" ? "" : s === "completed" ? "background:#ecfdf5;color:#047857" : "background:#fef2f2;color:#b91c1c";
</script>

<template>
  <div>
    <h1 class="page-title">Appointments</h1>
    <p class="page-sub">
      Bookings for you and your team
      <span class="mono">(scheduling.events, verified Test 019)</span>.
    </p>

    <div class="card">
      <h2>Today · {{ fmtDay(todayStart.toISOString()) }}</h2>
      <p class="sub">Your day at a glance — from <span class="mono">events.listByDateRange</span>.</p>
      <div v-for="ev in todays ?? []" :key="ev.id" class="appt">
        <div class="appt-time">
          <strong>{{ fmtTime(ev.start_time) }}</strong>
          <span class="muted">– {{ fmtTime(ev.end_time) }}</span>
        </div>
        <div style="flex:1">
          <div class="appt-title">{{ ev.title }}</div>
          <div class="muted" style="font-size:.8rem">{{ serviceName(ev.event_type_id) }} · in person</div>
        </div>
        <span class="chip" :style="statusChip(ev.status)">{{ ev.status }}</span>
        <button
          v-if="ev.status === 'confirmed'"
          class="btn ghost move-btn"
          :disabled="acting === ev.id"
          @click="act(ev.id, 'complete')"
        >
          {{ acting === ev.id ? "…" : "Done ✓" }}
        </button>
      </div>
      <div v-if="!(todays ?? []).length" class="muted" style="padding:8px 0">Nothing booked today.</div>
    </div>

    <div class="card">
      <h2>Next 7 days</h2>
      <div v-for="ev in upcoming ?? []" :key="ev.id" class="appt">
        <div class="appt-time">
          <strong>{{ fmtDay(ev.start_time) }}</strong>
          <span class="muted"> {{ fmtTime(ev.start_time) }}</span>
        </div>
        <div style="flex:1">
          <div class="appt-title">{{ ev.title }}</div>
          <div class="muted" style="font-size:.8rem">{{ serviceName(ev.event_type_id) }}</div>
        </div>
        <span class="chip" :style="statusChip(ev.status)">{{ ev.status }}</span>
        <button class="btn ghost move-btn" :disabled="acting === ev.id" @click="act(ev.id, 'cancel')">×</button>
      </div>
      <div v-if="!(upcoming ?? []).length" class="muted" style="padding:8px 0">No upcoming appointments.</div>
      <div class="chips">
        <button class="chip btn-chip" @click="showForm = !showForm">
          {{ showForm ? "× Cancel" : "＋ Book appointment" }}
        </button>
      </div>
    </div>

    <div v-if="showForm" class="card">
      <h2>New appointment</h2>
      <p class="sub">Duration comes from the service type — bookable services live in <span class="mono">scheduling.eventTypes</span>.</p>
      <div class="chat-input" style="margin-bottom:8px">
        <input type="text" v-model="form.title" placeholder="With whom / about what? *" />
        <select v-model.number="form.serviceId" style="flex:1; padding:9px 12px; border:1px solid var(--line); border-radius:8px; font-size:.95rem">
          <option :value="null" disabled>Service…</option>
          <option v-for="s in services ?? []" :key="s.id" :value="s.id">{{ s.name }} ({{ s.duration_minutes }} min)</option>
        </select>
      </div>
      <div class="chat-input" style="margin-bottom:8px">
        <input type="date" v-model="form.date" />
        <input type="time" v-model="form.time" />
      </div>
      <button class="btn" :disabled="saving || !form.title || !form.serviceId" @click="book">
        {{ saving ? "Booking…" : "Book it" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.appt {
  display: flex;
  gap: 12px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.appt-time { min-width: 120px; font-size: 0.88rem; }
.appt-title { font-weight: 600; font-size: 0.92rem; }
.move-btn { padding: 5px 10px; font-size: 0.78rem; border-radius: 8px; }
</style>
