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
        >
          here.
          <span class="screen-reader-text">
            Basic labels.db file download
          </span>
        </a>
      </p>
    </div>
  </div>

  <form class="load-grid" @submit.prevent="$emit('load-db')">
    <div class="drop-wrap">
      <Dropzone
        ref="dbDrop"
        accept=".db"
        placeholder="labels.db"
        :inputId="'labelsUpload'"
        :inputName="'labelsUpload'"
        :disabled="loading"
        @select="onSelect"
      />
      <div v-if="loading" class="drop-loading">
        <Spinner class="ui-spinner-md" />
        <div class="drop-loading__text">Reading database...</div>
      </div>
    </div>

    <div class="button-row">
      <UiButton
        type="submit"
        variant="primary"
        size="md"
        :disabled="loading || !localCanLoad"
      >
        <template v-if="loading"> <Spinner />Reading DB... </template>
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

<style scoped>
.drop-wrap {
  position: relative;
}

.load-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
}

.load-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 12, 20, 0.85);
  border-radius: 12px;
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.load-overlay__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.load-overlay__text {
  font-size: 14px;
}

.drop-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(10, 12, 20, 0.82);
  border-radius: 8px;
  backdrop-filter: blur(2px);
  z-index: 4;
  gap: 10px;
}

.drop-loading__text {
  color: #fff;
  font-size: 14px;
}
</style>
