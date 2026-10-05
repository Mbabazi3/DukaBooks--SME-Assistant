<script setup>
// Shows why a screen has no data: the platform feature isn't enabled for this
// key yet (403), or another error from an /api call.
const props = defineProps({
  feature: { type: String, required: true },
  errors: { type: Array, default: () => [] },
});
const list = computed(() => props.errors.filter(Boolean));
const blocked = computed(() => list.value.some(isNotEnabled));
const other = computed(() => (blocked.value ? null : list.value[0]));
</script>

<template>
  <div v-if="blocked" class="card notice">
    <strong>{{ feature }} isn't enabled for this workspace yet.</strong>
    The GPT Platform answered <span class="mono">403 Forbidden</span>: the app key works, but it hasn't been
    given access to {{ feature }}. Once the platform team grants it, this screen works without any code change.
  </div>
  <div v-else-if="other" class="card notice error">
    {{ errorMessage(other) }}
  </div>
</template>

<style scoped>
.notice { background: #fffbeb; border-color: #fde68a; color: #92400e; }
.notice.error { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
</style>
