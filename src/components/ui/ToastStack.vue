<template>
  <Teleport to="body">
    <div class="toast-viewport" role="status" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="(toast, idx) in toasts"
          :key="toast.id"
          class="toast-item"
          :style="{
            '--stack-index': idx,
          }"
        >
          <div class="toast-shell" :class="`toast-${toast.variant}`">
            <div class="toast-text">{{ toast.message }}</div>
            <button
              class="toast-close"
              type="button"
              aria-label="Dismiss notification"
              @click="dismiss(toast.id)"
            >
              ×
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  toasts: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["dismiss"]);

function dismiss(id) {
  emit("dismiss", id);
}
</script>

<style scoped lang="scss">
@use "../../styles/theme";

.toast-viewport {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  z-index: 2000;
  pointer-events: none;
}

.toast-item {
  position: relative;
  width: min(420px, calc(100vw - 10px));
  transform: translateY(calc(var(--stack-index) * -40px))
    scale(calc(1 - var(--stack-index) * 0.02));
  z-index: calc(200 - var(--stack-index));
  pointer-events: all;
}

.toast-shell {
  background: rgba(20, 22, 32, 0.96);
  color: theme.$fg;
  border-radius: theme.$radius-md;
  border: 1px solid theme.$border-panel;
  box-shadow:
    0 18px 38px rgba(0, 0, 0, 0.45),
    0 6px 18px rgba(0, 0, 0, 0.35);
  padding: 12px 14px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
}

.toast-success {
  border-color: theme.$danger;
  background-color: rgb(31 46 49);
  box-shadow:
    0 18px 38px rgba(0, 0, 0, 0.45),
    0 6px 18px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(theme.$accent, 0.18);
}

.toast-text {
  font-size: 14px;
  line-height: 1.45;
}

.toast-close {
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: theme.$fg;
  width: 28px;
  height: 28px;
  border-radius: theme.$radius-sm;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 160ms ease,
    transform 160ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.toast-enter-active {
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}

.toast-leave-active {
  transition:
    opacity 900ms ease,
    transform 900ms ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.97);
}
</style>
