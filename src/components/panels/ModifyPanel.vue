<template>
  <div class="panel">
    <div class="panel-header">
      <h2>Modify Database</h2>
    </div>

    <div v-if="!hasDb" class="no-db-loaded">
      <!--
      <p class="small-note">
        No database loaded. Please load a labels.db file to view entries.
      </p>
      -->
    </div>

    <div v-else>
      <p class="small-note">
        Add a new image or replace an existing one using its CRC32 cartridge
        signature.
      </p>

      <form class="stacked" @submit.prevent="$emit('submit')">
        <Dropzone
          :key="imageResetKey"
          label="PNG Image"
          hint="any size; will be resized to 74x86"
          accept="image/png"
          :inputId="'imageUpload'"
          :inputName="'imageUpload'"
          required
          placeholder="Select or drop a PNG"
          @select="$emit('select-image', $event)"
        />
        <InputUi
          label="Cartridge Signature"
          hint="CRC32, 8-digit Hex"
          :inputId="'crcInput'"
          :inputName="'crcInput'"
          :model-value="crc"
          @update:model-value="$emit('update:crc', $event)"
          type="text"
          placeholder="03CC04EE"
          clearable
          required
        />
        <UiButton
          type="submit"
          variant="primary"
          size="sm"
          :disabled="!canInsert || inserting"
        >
          <template v-if="inserting"> <Spinner /> Inserting... </template>
          <template v-else>Insert / Replace</template>
        </UiButton>
      </form>

      <div class="ui-divider"><span></span></div>

      <div class="stacked search-block">
        <div class="search-label">
          <span class="ui-label">Search in list</span>
          <small class="small-note">({{ searchHint }})</small>
        </div>
        <InputUi
          :inputId="'filterInput'"
          :inputName="'filterInput'"
          :model-value="searchQuery"
          @update:model-value="$emit('update:searchQuery', $event)"
          placeholder="mario,04079B93,52BA66FA"
          clearable
          :hint="''"
          prefixIcon="/assets/search-icon.svg"
        />
        <div class="filters-row" v-if="hasRegions || searchQuery.trim().length">
          <div v-if="hasRegions" class="region-filters">
            <button
              v-for="(count, region) in regionCounts"
              :key="region"
              type="button"
              class="region-filter-badge"
              :class="{ active: isRegionActive(region) }"
              @click="$emit('toggle-region-filter', region)"
            >
              <span class="region-label">{{ region }}</span>
              <span class="region-count ui-btn-ghost">{{ count }}</span>
            </button>
          </div>
        </div>
        <a class="clear-filters" @click="$emit('clear-filters')">
          Clear filters
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import Dropzone from "../ui/Dropzone.vue";
import InputUi from "../ui/Input.vue";
import UiButton from "../ui/Button.vue";
import Spinner from "../ui/Spinner.vue";

const props = defineProps({
  hasDb: Boolean,
  canInsert: Boolean,
  inserting: Boolean,
  imageResetKey: {
    type: Number,
    default: 0,
  },
  searchQuery: {
    type: String,
    default: "",
  },
  filteredCount: {
    type: Number,
    default: 0,
  },
  regionCounts: {
    type: Object,
    default: () => ({}),
  },
  activeRegionFilters: {
    type: Object,
    default: () => new Set(),
  },
  crc: {
    type: String,
    default: "",
  },
});

defineEmits([
  "select-image",
  "submit",
  "update:crc",
  "update:searchQuery",
  "toggle-region-filter",
  "clear-filters",
]);

const searchHint = computed(
  () => `${props.searchQuery.trim().length ? props.filteredCount : 0} results`
);

const hasRegions = computed(
  () => Object.keys(props.regionCounts || {}).length > 0
);

function isRegionActive(region) {
  if (!props.activeRegionFilters) return false;
  return props.activeRegionFilters.has
    ? props.activeRegionFilters.has(region)
    : false;
}
</script>

<style scoped lang="scss">
@use "../../styles/theme";

.filters-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.region-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.region-filter-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid theme.$border-chip;
  border-radius: 999px;
  background: theme.$bg-panel;
  color: theme.$fg;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: theme.$accent-strong;
  }

  &.active {
    border-color: theme.$accent;
    background: theme.$accent-soft;
    box-shadow: 0 0 0 1px rgba(theme.$accent, 0.4);
  }

  .region-count {
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    font-weight: 600;
  }
}

.clear-filters {
  font-size: 12px;
  display: flex;
  justify-content: flex-end;
  color: theme.$accent-strong;

  &:hover {
    text-decoration: underline;
  }
}
</style>
