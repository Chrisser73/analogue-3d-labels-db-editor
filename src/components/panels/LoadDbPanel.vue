<template>
  <div class="panel-header">
    <div>
      <h2>Load Database File</h2>
      <p class="small-note">
        Load your existing <code>labels.db</code> so you can view and edit its
        entries locally in your browser or use the one from
        <a
          href="/assets/labels.db"
          target="_blank"
          title="labels.db file download"
          >here</a
        >.
      </p>
    </div>
    <!-- <small v-if="dbStatus" class="small-note">{{ dbStatus }}</small> -->
  </div>

  <form class="load-grid" @submit.prevent="$emit('load-db')">
    <Dropzone
      ref="dbDrop"
      accept=".db"
      required
      placeholder="labels.db"
      :inputId="'labelsUpload'"
      :inputName="'labelsUpload'"
      @select="onSelect"
    />
    <div class="button-row">
      <UiButton
        type="submit"
        variant="primary"
        size="md"
        :disabled="loading || !localCanLoad"
      >
        <template v-if="loading"> <Spinner /> Loading DB... </template>
        <template v-else>
          <div class="text-icon">
            <span>Load DB</span>
            <img
              class="ui-icon ui-icon-md"
              src="/assets/load-file.svg"
              alt=""
              aria-hidden="true"
            />
          </div>
        </template>
      </UiButton>
      <UiButton
        v-if="hasDb && !loading"
        type="button"
        variant="primary"
        size="md"
        @click="$emit('download-db')"
      >
        <div class="hide-mobile text-icon">
          <span>Download modified</span>
          <img
            class="ui-icon ui-icon-md"
            src="/assets/download.svg"
            alt=""
            aria-hidden="true"
          />
        </div>
        <div class="hide-desktop text-icon">
          <span>Modified</span>
          <img
            class="ui-icon ui-icon-md"
            src="/assets/download.svg"
            alt=""
            aria-hidden="true"
          />
        </div>
      </UiButton>
      <UiButton
        v-if="hasDb && !loading"
        type="button"
        variant="ghost"
        size="md"
        :disabled="packing"
        @click="$emit('download-images')"
      >
        <template v-if="packing"> <Spinner /> Packing zip... </template>
        <template v-else>
          <div class="hide-mobile text-icon">
            <span>Download Images</span>
            <img
              class="ui-icon ui-icon-md"
              src="/assets/zip2.svg"
              alt=""
              aria-hidden="true"
            />
          </div>
          <div class="hide-desktop text-icon">
            <span>Images</span>
            <img
              class="ui-icon ui-icon-md"
              src="/assets/zip2.svg"
              alt=""
              aria-hidden="true"
            />
          </div>
        </template>
      </UiButton>
    </div>
  </form>
</template>

<script setup>
import Dropzone from "../ui/Dropzone.vue";
import UiButton from "../ui/Button.vue";
import Spinner from "../ui/Spinner.vue";
import { computed, ref } from "vue";

const props = defineProps({
  loading: Boolean,
  hasDb: Boolean,
  canLoad: Boolean,
  packing: Boolean,
  dbStatus: {
    type: String,
    default: "",
  },
});

const emit = defineEmits([
  "select-db",
  "load-db",
  "download-db",
  "download-images",
]);

const hasLocalFile = ref(false);
const localCanLoad = computed(() => hasLocalFile.value || !!props.canLoad);

function onSelect(file) {
  hasLocalFile.value = !!file;
  // bubble up to parent so it can hold the file ref
  emit("select-db", file);
}
</script>
