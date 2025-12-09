<template>
  <div class="panel rom-search rom-command">
    <div class="rom-command-input">
      <img src="/assets/search-icon.svg" alt="" aria-hidden="true" />
      <input
        id="searchCrc"
        v-model="query"
        type="text"
        class="rom-command-field"
        :placeholder="placeholder"
        aria-label="Search ROMs by CRC, title, or region"
        @focus="ensureMap"
        @input="ensureMap"
        @keydown="onKeydown"
      />
      <button
        v-if="query.trim().length"
        type="button"
        class="rom-clear"
        @click="clearQuery"
        aria-label="Clear search"
      >
        <img src="/assets/cross-circle.svg" alt="" />
      </button>
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
          <button
            type="button"
            class="sort-head"
            @click="setSort('crc')"
            :aria-pressed="sortKey === 'crc'"
          >
            <span class="sort-label">CRC</span>
            <span class="sort-icons">
              <img
                src="/assets/sort-up.svg"
                :class="sortIconClass('crc', 'asc')"
                alt="Sort CRC ascending"
              />
              <img
                src="/assets/sort-down.svg"
                :class="sortIconClass('crc', 'desc')"
                alt="Sort CRC descending"
              />
            </span>
          </button>
          <button
            type="button"
            class="sort-head"
            @click="setSort('title')"
            :aria-pressed="sortKey === 'title'"
          >
            <span class="sort-label">Title</span>
            <span class="sort-icons">
              <img
                src="/assets/sort-up.svg"
                :class="sortIconClass('title', 'asc')"
                alt="Sort title ascending"
              />
              <img
                src="/assets/sort-down.svg"
                :class="sortIconClass('title', 'desc')"
                alt="Sort title descending"
              />
            </span>
          </button>
          <button
            type="button"
            class="sort-head"
            @click="setSort('region')"
            :aria-pressed="sortKey === 'region'"
          >
            <span class="sort-label">Region</span>
            <span class="sort-icons">
              <img
                src="/assets/sort-up.svg"
                :class="sortIconClass('region', 'asc')"
                alt="Sort region ascending"
              />
              <img
                src="/assets/sort-down.svg"
                :class="sortIconClass('region', 'desc')"
                alt="Sort region descending"
              />
            </span>
          </button>
          <span class="sort-head placeholder"></span>
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
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import UiButton from "../ui/Button.vue";
import Spinner from "../ui/Spinner.vue";
import {
  fetchRomMapRaw,
  filterRomEntries,
  highlightWithTerms,
  mapToEntriesRaw,
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

const placeholder = "Find CRC from database...";
const query = ref("");
const debouncedQuery = ref("");
const localMap = ref(new Map());
const loading = ref(false);
const { isCopied, flashCopy } = useCopyIndicator();
const activeIndex = ref(-1);
const sortKey = ref("crc");
const sortDir = ref("asc");
let debounceHandle = null;

// Always use the raw map for this panel to preserve full titles; ignore cleaned maps.
const resolvedMap = computed(() => localMap.value);

const csvSize = computed(() => resolvedMap.value?.size || 0);
const searchTerms = computed(() => parseSearchTerms(debouncedQuery.value));
const entries = computed(() => mapToEntriesRaw(resolvedMap.value));
const filtered = computed(() =>
  filterRomEntries(entries.value, searchTerms.value)
);
const sorted = computed(() => {
  const list = [...filtered.value];
  const dir = sortDir.value === "desc" ? -1 : 1;
  list.sort((a, b) => {
    const key = sortKey.value;
    const av =
      key === "title"
        ? (a.title || a.name || "").toLowerCase()
        : key === "region"
        ? (a.region || "").toUpperCase()
        : (a.crc || "").toUpperCase();
    const bv =
      key === "title"
        ? (b.title || b.name || "").toLowerCase()
        : key === "region"
        ? (b.region || "").toUpperCase()
        : (b.crc || "").toUpperCase();
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  return list;
});
const limitedResults = computed(() => sorted.value.slice(0, 24));
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

function setSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDir.value = "asc";
  }
}

function sortIconClass(key, dir) {
  const active = sortKey.value === key && sortDir.value === dir;
  return `sort-icon ${active ? "active" : "muted"}`;
}

async function ensureMap() {
  if (loading.value) return;
  if (resolvedMap.value && resolvedMap.value.size > 0) return;
  loading.value = true;
  try {
    const map = await fetchRomMapRaw();
    if (map instanceof Map) {
      localMap.value = map;
    }
  } finally {
    loading.value = false;
  }
}

function copy(crc) {
  if (props.onCopy) props.onCopy(crc, { setAnchor: false });
  else navigator.clipboard?.writeText(crc).catch(() => {});
  flashCopy(crc);
}

function clearQuery() {
  query.value = "";
  debouncedQuery.value = "";
  activeIndex.value = -1;
  if (typeof window !== "undefined") {
    const el = document.getElementById("searchCrc");
    el?.focus();
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
