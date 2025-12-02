<template>
  <section class="quick-fix">
    <div class="quick-fix-title">
      <button
        class="collapsible-trigger"
        type="button"
        @click="collapsibleOpen = !collapsibleOpen"
        :aria-expanded="collapsibleOpen"
      >
        <span class="quick-fix-title-label">Add flash cart labels</span>
        <span class="chevron" :class="{ open: collapsibleOpen }">▾</span>
      </button>
      <span v-if="loading" class="quick-fix-spinner"><Spinner /></span>
    </div>
    <div v-if="collapsibleOpen" class="quick-fix-body">
      <div class="quick-fix-options-row">
        <div class="quick-fix-options">
          <label
            v-for="item in quickFixOptions"
            :key="item.crc"
            class="quick-fix-option"
            :class="{ disabled: isPresent(item.crc) || applying }"
            @click="toggleSelect(item.crc)"
          >
            <span class="switch-wrap">
              <button
                type="button"
                class="switch"
                :class="{ on: selected.includes(item.crc), disabled: isPresent(item.crc) || applying }"
                @click.stop="toggleSelect(item.crc)"
                :disabled="isPresent(item.crc) || applying"
              >
                <span class="switch-handle"></span>
              </button>
            </span>
            <div class="quick-fix-label">
              <span class="fix-name" v-html="highlightText(displayNameForCrc(item.crc))"></span>
              <span class="fix-crc">{{ item.crc }}</span>
            </div>
            <span v-if="isPresent(item.crc)" class="fix-dot" title="Already in DB"></span>
          </label>
        </div>
        <div class="quick-fix-actions">
          <UiButton
            variant="primary"
            size="sm"
            :disabled="applying || !hasSelection"
            @click="applyQuickFix"
          >
            <template v-if="applying"><Spinner /> Injecting...</template>
            <template v-else>Apply</template>
          </UiButton>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import Spinner from "../ui/Spinner.vue";
import UiButton from "../ui/Button.vue";

const props = defineProps({
  romMap: {
    type: Object,
    default: () => new Map(),
  },
  allEntries: {
    type: Array,
    default: () => [],
  },
  onInjectQuickFix: {
    type: Function,
    required: true,
  },
  highlightText: {
    type: Function,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const quickFixBase = [
  { crc: "FFFFFFFE", asset: "/assets/inject-flashcard/FFFFFFFE.png" },
  { crc: "1C414340", asset: "/assets/inject-flashcard/1C414340.png" },
];

const baseDisplayName = (name) => {
  if (!name) return "";
  const match = name.match(/^(.*?)(\s*\((NTSC-J|NTSC|PAL)\))$/i);
  return match ? match[1].trim() : name;
};

const romMapValue = computed(() => {
  if (props.romMap?.value instanceof Map) return props.romMap.value;
  if (props.romMap instanceof Map) return props.romMap;
  return new Map();
});

const displayNameForCrc = (crc) => {
  const map = romMapValue.value;
  const raw = map.get(crc.toUpperCase()) || map.get(crc.toLowerCase()) || "";
  return baseDisplayName(raw) || crc.toUpperCase();
};

const quickFixOptions = computed(() =>
  quickFixBase.map((item) => {
    const name = displayNameForCrc(item.crc);
    return { ...item, name };
  })
);

const presentSet = computed(() =>
  new Set((props.allEntries || []).map((e) => e.display?.toUpperCase?.() || ""))
);
const isPresent = (crc) => presentSet.value.has(crc.toUpperCase());

const selected = ref([]);
const applying = ref(false);
const collapsibleOpen = ref(false);

const hasSelection = computed(() => selected.value.some((crc) => !isPresent(crc)));

function toggleSelect(crc) {
  if (isPresent(crc) || applying.value) return;
  const next = new Set(selected.value);
  if (next.has(crc)) next.delete(crc);
  else next.add(crc);
  selected.value = Array.from(next);
}

watch(
  () => presentSet.value,
  () => {
    selected.value = selected.value.filter((crc) => !isPresent(crc));
  }
);

async function applyQuickFix() {
  const targets = quickFixOptions.value.filter(
    (item) => selected.value.includes(item.crc) && !isPresent(item.crc)
  );
  if (!targets.length || applying.value) return;
  applying.value = true;
  try {
    await props.onInjectQuickFix(targets);
    selected.value = selected.value.filter((crc) => !targets.some((t) => t.crc === crc));
  } finally {
    applying.value = false;
  }
}
</script>
