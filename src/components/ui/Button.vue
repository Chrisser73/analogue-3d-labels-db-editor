<template>
  <button
    :type="type"
    class="ui-btn"
    :class="[`ui-btn-${variant}`, `ui-btn-${size}`, { 'ui-btn-disabled': disabled }]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: "primary", // primary, outline, destructive, ghost
  },
  size: {
    type: String,
    default: "md", // sm, md
  },
  type: {
    type: String,
    default: "button",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});
</script>
