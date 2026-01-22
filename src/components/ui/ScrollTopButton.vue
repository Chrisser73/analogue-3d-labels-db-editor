<template>
  <Teleport to="body">
    <button
      v-if="show"
      class="scroll-top-btn"
      type="button"
      aria-label="Scroll to top"
      @click="scrollToTop"
    >
      <img src="/assets/chevron-up.svg" alt="" class="scroll-top-icon" />
    </button>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const show = ref(false);

let threshold = window.innerHeight || 400;

function updateVisibility() {
  threshold = window.innerHeight || threshold;
  show.value = window.scrollY > threshold;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function onScroll() {
  requestAnimationFrame(updateVisibility);
}

function onResize() {
  requestAnimationFrame(updateVisibility);
}

onMounted(() => {
  updateVisibility();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onResize);
});
</script>

<style scoped lang="scss">
@use "../../styles/theme";

.scroll-top-btn {
  position: fixed;
  right: 8px;
  bottom: 8px;
  width: 48px;
  height: 48px;
  border-radius: theme.$radius-lg;
  border: 1px solid theme.$border-chip;
  background: theme.$btn-gradient;
  color: #fff;
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.06);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
  z-index: 2400;
}

.scroll-top-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.1);
}

.scroll-top-btn:active {
  transform: translateY(0);
}

.scroll-top-icon {
  width: 24px;
  height: 24px;
}

@media (min-width: 801px) {
  .scroll-top-btn {
    display: none;
  }
}
</style>
