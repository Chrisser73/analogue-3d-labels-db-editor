<template>
  <div class="panel rom-search rom-command">
    <!-- <div class="rom-search-head">
      <div class="rom-search-text">
        <p class="rom-search-title">Search for CRC</p>
      </div>
      <div class="rom-search-meta">
        <span class="rom-search-count">
          {{ resultSummary }}
        </span>
      </div>
    </div> -->

    <div class="rom-command-input">
      <img src="/assets/search-icon.svg" alt="" aria-hidden="true" />
      <input
        id="searchCrc"
        v-model="query"
        type="text"
        class="rom-command-field"
        :placeholder="placeholder"
        @focus="ensureMap"
        @input="ensureMap"
        @keydown="onKeydown"
      />
      <span v-if="loading" class="rom-command-loader">
        <Spinner class="ui-spinner-sm" />
      </span>
    </div>

    <div v-if="hasQuery" class="rom-command-list">
      <p class="rom-command-hint">
        {{ listLabel }}
      </p>

      <div v-if="limitedResults.length" class="rom-command-table">
        <div class="rom-command-head">
          <span>CRC</span>
          <span>Title</span>
          <span>Region</span>
          <span>Copy CRC</span>
        </div>
        <div
          v-for="entry in limitedResults"
          :key="entry.crc"
          class="rom-command-item"
          tabindex="0"
          role="group"
          :aria-label="rowLabel(entry)"
        >
          <div class="rom-crc" v-html="highlight(entry.crc)"></div>
          <div
            class="rom-title"
            v-html="highlight(entry.title || entry.name)"
          ></div>
          <div class="rom-region" v-if="entry.region">{{ entry.region }}</div>
          <div class="rom-region muted" v-else>—</div>
          <div class="copy-wrap rom-copy">
            <UiButton
              size="sm"
              variant="ghost"
              class="copy-btn"
              @click="copy(entry.crc)"
              :aria-label="`Copy ${entry.crc}`"
            >
              <img
                class="ui-icon-sm icon-copy"
                src="/assets/copy-icon.svg"
                alt="Copy CRC value to clipboard"
              />
              Copy
            </UiButton>
            <span v-if="isCopied(entry.crc)" class="copy-tooltip">Copied</span>
          </div>
        </div>
      </div>
      <!-- <div v-else class="rom-command-empty"></div> -->
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import UiButton from "../ui/Button.vue";
import Spinner from "../ui/Spinner.vue";
import {
  fetchRomMap,
  filterRomEntries,
  highlightWithTerms,
  mapToEntries,
  parseSearchTerms,
} from "../../utils/romSearch";
import { useCopyIndicator } from "../../composables/useCopyIndicator";

const props = defineProps({
  romMap: {
    type: Object,
    default: () => new Map(),
  },
  onCopy: {
    type: Function,
    default: null,
  },
});

const placeholder = "Not in List? Search for CRC in full database...";
const query = ref("");
const debouncedQuery = ref("");
const localMap = ref(new Map());
const loading = ref(false);
const { isCopied, flashCopy } = useCopyIndicator();
const activeIndex = ref(-1);
let debounceHandle = null;

const resolvedMap = computed(() => {
  if (props.romMap?.value instanceof Map) return props.romMap.value;
  if (props.romMap instanceof Map) return props.romMap;
  return localMap.value;
});

const csvSize = computed(() => resolvedMap.value?.size || 0);
const searchTerms = computed(() => parseSearchTerms(debouncedQuery.value));
const entries = computed(() => mapToEntries(resolvedMap.value));
const filtered = computed(() =>
  filterRomEntries(entries.value, searchTerms.value)
);
const limitedResults = computed(() => filtered.value.slice(0, 24));
const hasQuery = computed(() => debouncedQuery.value.trim().length > 0);

const listLabel = computed(() => {
  if (loading.value) return "Loading ROM signatures...";
  if (!hasQuery.value) return "Type to search";
  if (!limitedResults.value.length) return "No matches in database";
  const more = filtered.value.length - limitedResults.value.length;
  return `${filtered.value.length} match${
    filtered.value.length === 1 ? "" : "es"
  }${more > 0 ? ` (${more} more not shown)` : ""}`;
});

const resultSummary = computed(() =>
  csvSize.value
    ? `${csvSize.value} known signatures`
    : loading.value
    ? "Loading signatures..."
    : "Signatures offline"
);

function highlight(text) {
  return highlightWithTerms(text || "", searchTerms.value);
}

function rowLabel(entry) {
  const regionText = entry.region
    ? `Region: ${entry.region}`
    : "Region: unknown";
  const titleText = entry.title || entry.name || "Title unknown";
  return `CRC: ${entry.crc}, Title: ${titleText}, ${regionText}`;
}

async function ensureMap() {
  if (loading.value) return;
  const current = resolvedMap.value;
  if (current && current.size > 0) return;
  loading.value = true;
  try {
    const map = await fetchRomMap();
    if (map instanceof Map) {
      localMap.value = map;
    }
  } finally {
    loading.value = false;
  }
}

function copy(crc) {
  if (props.onCopy) props.onCopy(crc);
  else navigator.clipboard?.writeText(crc).catch(() => {});
  flashCopy(crc);
}

function onKeydown(event) {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    event.stopPropagation();
  }
  const total = limitedResults.value.length;
  if (!total) return;

  if (event.key === "ArrowDown") {
    activeIndex.value = (activeIndex.value + 1 + total) % total;
  } else if (event.key === "ArrowUp") {
    activeIndex.value =
      activeIndex.value === -1
        ? total - 1
        : (activeIndex.value - 1 + total) % total;
  } else if (event.key === "Enter" && activeIndex.value >= 0) {
    event.preventDefault();
    const hit = limitedResults.value[activeIndex.value];
    if (hit) copy(hit.crc);
  }
}

onMounted(() => {
  ensureMap();
});

watch(
  () => hasQuery.value,
  (active) => {
    if (active) ensureMap();
  }
);

watch(
  () => query.value,
  (val) => {
    if (debounceHandle) clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => {
      debouncedQuery.value = val;
      activeIndex.value = val.trim().length ? 0 : -1;
    }, 200);
  },
  { immediate: true }
);

watch(
  () => limitedResults.value.length,
  (len) => {
    if (activeIndex.value >= len) activeIndex.value = len ? 0 : -1;
  }
);
</script>
