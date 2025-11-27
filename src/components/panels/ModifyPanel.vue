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
          :hint="''"
          prefixIcon="/assets/search-icon.svg"
        />
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
  crc: {
    type: String,
    default: "",
  },
});

defineEmits(["select-image", "submit", "update:crc", "update:searchQuery"]);

const searchHint = computed(
  () => `${props.searchQuery.trim().length ? props.filteredCount : 0} results`
);
</script>
