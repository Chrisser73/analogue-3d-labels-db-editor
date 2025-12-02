<template>
  <div class="panel">
    <div class="images-header">
      <h2>Extracted Images</h2>
      <small
        ><Badge>{{ dbStatus }}</Badge></small
      >
    </div>
    <div v-if="loading" class="panel-loading">
      <Spinner class="ui-spinner-lg" />
      <span>Loading database...</span>
    </div>
    <div v-else-if="!hasDb" class="no-db-loaded">
      <p class="small-note">
        No database loaded. Please load a labels.db file to view entries.
      </p>
    </div>
    <div v-else>
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
        </div>
        <div v-if="collapsibleOpen" class="quick-fix-body">
          <div class="quick-fix-options-row">
            <div class="quick-fix-options">
              <label
                v-for="item in quickFixOptions"
                :key="item.crc"
                class="quick-fix-option"
                @click="toggleSelect(item.crc)"
              >
                <button
                  type="button"
                  class="switch"
                  :class="{
                    on: selected.includes(item.crc),
                    disabled: isPresent(item.crc) || applying,
                  }"
                  @click.stop="toggleSelect(item.crc)"
                  :disabled="isPresent(item.crc) || applying"
                >
                  <span class="switch-handle"></span>
                </button>
                <div class="quick-fix-label">
                  <span
                    class="fix-name"
                    v-html="highlightText(displayNameForCrc(item.crc))"
                  ></span>
                  <span class="fix-crc">{{ item.crc }}</span>
                </div>
                <span
                  v-if="isPresent(item.crc)"
                  class="fix-dot"
                  title="Already in DB"
                ></span>
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

      <div id="card-grid" class="card-grid">
        <UiCard
          v-for="(entry, idx) in safeEntries"
          :key="entry.display"
          :id="entry.display"
          :class="{ 'card-highlight': highlightSig === entry.display }"
        >
          <img class="card-thumb" :src="entry.url" alt="label preview" />
          <div class="card-meta">
            <div class="card-id">
              <span v-html="highlightText(entry.display)"></span>
              <div class="copy-wrap">
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="copy-btn"
                  @click="handleCopy(entry.display)"
                >
                  <img
                    class="ui-icon-sm icon-copy"
                    src="/assets/copy-icon.svg"
                    alt="Copy to clipboard"
                  />
                </UiButton>
                <span v-if="isCopied(entry.display)" class="copy-tooltip"
                  >Copied</span
                >
              </div>
            </div>
            <div class="card-name" v-if="entry.filename">
              <span v-html="highlightText(entry.filename)"></span>
            </div>
            <div v-if="entry.region" class="card-region">
              {{ entry.region }}
            </div>
          </div>
          <UiButton
            variant="destructive"
            size="sm"
            class="full"
            :disabled="isRemoving(entry.sig)"
            @click="onRemove(entry.sig)"
          >
            <template v-if="isRemoving(entry.sig)">
              <Spinner /> Deleting...
            </template>
            <template v-else>Remove</template>
          </UiButton>
        </UiCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import Badge from "../ui/Badge.vue";
import Spinner from "../ui/Spinner.vue";
import UiButton from "../ui/Button.vue";
import UiCard from "../ui/Card.vue";

const props = defineProps({
  entries: {
    type: Array,
    default: () => [],
  },
  allEntries: {
    type: Array,
    default: () => [],
  },
  hasDb: Boolean,
  loading: Boolean,
  dbStatus: {
    type: String,
    default: "",
  },
  highlightSig: {
    type: String,
    default: null,
  },
  isRemoving: {
    type: Function,
    required: true,
  },
  onRemove: {
    type: Function,
    required: true,
  },
  onCopy: {
    type: Function,
    required: true,
  },
  highlightText: {
    type: Function,
    required: true,
  },
  onInjectQuickFix: {
    type: Function,
    required: true,
  },
  romMap: {
    type: Object,
    default: () => new Map(),
  },
});

const safeEntries = computed(() => props.entries || []);

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

const presentSet = computed(() => {
  const source =
    props.allEntries && props.allEntries.length
      ? props.allEntries
      : props.entries;
  return new Set((source || []).map((e) => e.display?.toUpperCase?.() || ""));
});
const isPresent = (crc) => presentSet.value.has(crc.toUpperCase());

const selected = ref([]);
const applying = ref(false);
const collapsibleOpen = ref(false);

const hasSelection = computed(() =>
  selected.value.some((crc) => !isPresent(crc))
);

function toggleSelect(crc) {
  if (isPresent(crc) || applying.value) return;
  const next = new Set(selected.value);
  if (next.has(crc)) next.delete(crc);
  else next.add(crc);
  selected.value = Array.from(next);
}

async function applyQuickFix() {
  const targets = quickFixOptions.value.filter(
    (item) => selected.value.includes(item.crc) && !isPresent(item.crc)
  );
  if (!targets.length || applying.value) return;
  applying.value = true;
  try {
    await props.onInjectQuickFix(targets);
    selected.value = selected.value.filter(
      (crc) => !targets.some((t) => t.crc === crc)
    );
  } finally {
    applying.value = false;
  }
}

const copied = ref(new Map());
const isCopied = (id) => copied.value.has(id);

function handleCopy(text) {
  props.onCopy?.(text);
  const next = new Map(copied.value);
  next.set(text, true);
  copied.value = next;
  setTimeout(() => {
    const cleared = new Map(copied.value);
    cleared.delete(text);
    copied.value = cleared;
  }, 500);
}
</script>
