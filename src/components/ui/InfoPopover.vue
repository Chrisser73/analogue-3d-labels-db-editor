<template>
  <div class="info-popover" ref="root">
    <button
      type="button"
      class="info-trigger"
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      @click.stop="toggle"
      
    >
      !
    </button>
    <transition name="popover-fade">
      <div v-if="isOpen" class="info-content" role="tooltip">
        <div class="info-arrow"></div>
        <div class="info-body" v-html="contentHtml"></div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({
  contentHtml: {
    type: String,
    required: true,
  },
});

const isOpen = ref(false);
const root = ref(null);

function toggle() {
  isOpen.value = !isOpen.value;
}

function handleClickOutside(event) {
  const el = root.value;
  if (!el || !isOpen.value) return;
  if (!el.contains(event.target)) {
    isOpen.value = false;
  }
}

function handleEscape(event) {
  if (event.key === "Escape") {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleEscape);
});
</script>

<style scoped lang="scss">
@use "../../styles/theme";

.info-popover {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.info-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid theme.$border-chip;
  background: theme.$accent-soft;
  color: theme.$accent-strong;
  font-weight: 800;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    background-color 120ms ease,
    border-color 120ms ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(theme.$accent, 0.25);
    border-color: theme.$accent;
  }

  &:active {
    transform: translateY(0);
  }
}

.info-content {
  position: absolute;
  top: calc(100% + 8px);
  left: -9px;
  min-width: 220px;
  max-width: 340px;
  padding: 10px 12px;
  border-radius: theme.$radius-md;
  border: 1px solid theme.$border-panel;
  background: rgba(12, 14, 24, 0.96);
  box-shadow: theme.$shadow-soft;
  color: theme.$fg;
  z-index: 20;
  backdrop-filter: blur(2px);
}

.info-body {
  font-size: 14px;
  line-height: 1.45;
  color: theme.$fg;
  font-weight: normal;

  a {
    color: theme.$accent-strong;
    text-decoration: underline;
  }
}

.info-arrow {
  position: absolute;
  top: -6px;
  left: 12px;
  width: 12px;
  height: 12px;
  background: inherit;
  border-left: 1px solid theme.$border-panel;
  border-top: 1px solid theme.$border-panel;
  transform: rotate(45deg);
}

.popover-fade-enter-active,
.popover-fade-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
