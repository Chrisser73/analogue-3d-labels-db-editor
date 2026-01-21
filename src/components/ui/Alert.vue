<template>
  <div>
    <div
      class="ui-alert"
      :class="`ui-alert-${variant}`"
      role="status"
      aria-live="polite"
    >
      <slot />
    </div>
    <ToastStack :toasts="toasts" @dismiss="dismissToast" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from "vue";
import ToastStack from "./ToastStack.vue";

const props = defineProps({
  variant: {
    type: String,
    default: "success",
  },
  toastMessage: {
    type: String,
    default: "",
  },
});

const toasts = ref([]);
const timers = new Map();

watch(
  () => props.toastMessage,
  (val) => {
    if (val) enqueueToast(val);
  },
  { immediate: true },
);

function computeDuration(text) {
  const len = (text || "").length;
  const estimated = len * 50;
  const clamped = Math.min(Math.max(estimated, 3000), 7000);
  return clamped;
}

function enqueueToast(message) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  const duration = computeDuration(message);
  toasts.value.unshift({
    id,
    message,
    variant: props.variant,
    duration,
  });
  // TODO: Re-enable auto-dismiss toasts
  // const timeout = window.setTimeout(() => dismissToast(id), duration);
  // timers.set(id, timeout);
}

function dismissToast(id) {
  const timeout = timers.get(id);
  if (timeout) {
    clearTimeout(timeout);
    timers.delete(id);
  }
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

onBeforeUnmount(() => {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
});
</script>
