<template>
  <div class="app">
    <HeaderBar />

    <section class="panel top-panel">
      <LoadDbPanel
        :db-status="dbStatusValue"
        :loading="labels.state.loadingDb"
        :has-db="hasDbValue"
        :can-load="canLoadDbValue"
        @select-db="labels.onDbSelected"
        @load-db="labels.onLoadDb"
        @download-db="labels.downloadDb"
        @download-images="labels.downloadImages"
      />

      <Alert v-if="messageValue || labels.state.lastInsertedCrc" variant="success">
        <template v-if="labels.state.lastInsertedCrc">
          Inserted / updated CRC
          <a href="#" @click.prevent="labels.scrollToCrc(labels.state.lastInsertedCrc)">
            {{ labels.state.lastInsertedCrc }}
          </a>
        </template>
        <template v-else>
          {{ messageValue }}
        </template>
      </Alert>
    </section>

    <section class="layout" id="editor">
      <ModifyPanel
        :has-db="hasDbValue"
        :can-insert="canInsertValue"
        :inserting="labels.state.inserting"
        :image-reset-key="labels.imageResetKey.value"
        :search-query="searchQueryValue"
        :filtered-count="filteredCount"
        @select-image="labels.onImageSelected"
        @update:searchQuery="(val) => (labels.searchQuery.value = val)"
        @submit="labels.onAdd"
        @update:crc="(val) => (labels.crcValue.value = val)"
        :crc="labels.crcValue.value"
      />

      <ExtractedPanel
        :entries="filteredEntriesValue"
        :has-db="hasDbValue"
        :loading="labels.state.loadingDb"
        :db-status="dbStatusValue"
        :highlight-sig="highlightSigValue"
        :is-removing="labels.isRemoving"
        :on-remove="labels.removeEntry"
        :on-copy="labels.copyToClipboard"
        :highlight-text="labels.highlightText"
      />
    </section>

    <FooterBar />
  </div>
</template>

<script setup>
import Alert from "./components/ui/Alert.vue";
import FooterBar from "./components/layout/FooterBar.vue";
import HeaderBar from "./components/layout/HeaderBar.vue";
import LoadDbPanel from "./components/panels/LoadDbPanel.vue";
import ModifyPanel from "./components/panels/ModifyPanel.vue";
import ExtractedPanel from "./components/panels/ExtractedPanel.vue";
import { useLabelsDb } from "./composables/useLabelsDb";
import { computed } from "vue";

const labels = useLabelsDb();
const searchQueryValue = computed(() => labels.searchQuery.value ?? "");
const filteredEntriesValue = computed(() => labels.filteredEntries.value ?? []);
const hasDbValue = computed(() => labels.hasDb.value ?? false);
const canLoadDbValue = computed(() => labels.canLoadDb.value ?? false);
const canInsertValue = computed(() => labels.canInsert.value ?? false);
const dbStatusValue = computed(() => labels.dbStatus.value ?? "");
const messageValue = computed(() => labels.message.value ?? "");
const highlightSigValue = computed(() => labels.highlightSig.value ?? null);
const filteredCount = computed(() =>
  (searchQueryValue.value || "").trim().length ? filteredEntriesValue.value.length : 0
);
</script>
