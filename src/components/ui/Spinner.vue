<template>
  <span :class="[props.class, 'ui-spinner'  ]" aria-label="loading" />
</template>

<script setup>
const props = defineProps({
  class: {
    type: String,
    default: "",
  },
});
</script>
