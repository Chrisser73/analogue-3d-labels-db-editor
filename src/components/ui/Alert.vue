<template>
  <div
    class="ui-alert"
    :class="`ui-alert-${variant}`"
    role="status"
    aria-live="polite"
  >
    <slot />
  </div>
</template>

<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: "success",
  },
});
</script>
