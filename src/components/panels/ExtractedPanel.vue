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
    <div v-else id="card-grid" class="card-grid">
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
            <UiButton
              size="sm"
              variant="ghost"
              class="copy-btn"
              @click="onCopy(entry.display)"
            >
              <img
                class="ui-icon-sm icon-copy"
                src="/assets/copy-icon.svg"
                alt="Copy to clipboard"
              />
            </UiButton>
          </div>
          <div class="card-name" v-if="entry.filename">
            <span v-html="highlightText(entry.filename)"></span>
          </div>
          <div v-if="entry.region" class="card-region">{{ entry.region }}</div>
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
</template>

<script setup>
import { computed } from "vue";
import Badge from "../ui/Badge.vue";
import Spinner from "../ui/Spinner.vue";
import UiButton from "../ui/Button.vue";
import UiCard from "../ui/Card.vue";

const props = defineProps({
  entries: {
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
});

const safeEntries = computed(() => props.entries || []);
</script>
