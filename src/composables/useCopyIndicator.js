import { ref } from "vue";

export function useCopyIndicator(timeoutMs = 500) {
  const copied = ref(new Map());
  const isCopied = (id) => copied.value.has(id);

  function flashCopy(id) {
    if (!id) return;
    const next = new Map(copied.value);
    next.set(id, true);
    copied.value = next;
    setTimeout(() => {
      const cleared = new Map(copied.value);
      cleared.delete(id);
      copied.value = cleared;
    }, timeoutMs);
  }

  return { copied, isCopied, flashCopy };
}
