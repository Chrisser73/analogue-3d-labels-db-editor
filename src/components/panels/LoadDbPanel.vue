<template>
  <div class="panel-header">
    <div>
      <h2>Load Database File</h2>
      <p class="small-note">
        Load your existing <code>labels.db</code> so you can view and edit its entries locally in your browser or use the one from
        <a href="/assets/labels.db" target="_blank" title="labels.db file download">here</a>.
      </p>
    </div>
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
      <UiButton type="submit" variant="primary" size="md" :disabled="loading || !localCanLoad">
        <template v-if="loading">
          <Spinner /> Loading DB...
        </template>
        <template v-else>Load DB</template>
      </UiButton>
      <UiButton v-if="hasDb && !loading" type="button" variant="primary" size="md" @click="$emit('download-db')">
        Download modified DB
      </UiButton>
      <UiButton v-if="hasDb && !loading" type="button" variant="ghost" size="md" @click="$emit('download-images')">
        Download Images (ZIP)
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
});

const emit = defineEmits(["select-db", "load-db", "download-db", "download-images"]);

const hasLocalFile = ref(false);
const localCanLoad = computed(() => hasLocalFile.value || !!props.canLoad);

function onSelect(file) {
  hasLocalFile.value = !!file;
  // bubble up to parent so it can hold the file ref
  emit("select-db", file);
}
</script>
