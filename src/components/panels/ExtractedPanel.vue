<template>
  <div class="panel">
    <div class="images-header">
      <h2>Extracted Images</h2>
      <small>
        <!-- <Badge :class="'ui-badge--secondary'">{{ dbStatus }}</Badge> -->
        <Badge class="ui-badge--ghost">{{ dbStatus }}</Badge>
      </small>
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
      <QuickFixSection
        :entries="safeEntries"
        :all-entries="allEntries"
        :rom-map="romMap"
        :highlight-text="highlightText"
        :on-inject-quick-fix="onInjectQuickFix"
      />

      <div id="card-grid" class="card-grid">
        <UiCard
          v-for="(entry, idx) in safeEntries"
          :key="entry.display"
          :id="entry.display"
          :class="{ 'card-highlight': highlightSig === entry.display }"
        >
          <img class="card-thumb" :src="entry.url" :alt="cardAlt(entry)" />
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
            v-if="isRemoving(entry.sig)"
            variant="destructive"
            size="sm"
            class="full"
            :disabled="true"
          >
            <Spinner /> Deleting...
          </UiButton>
          <div v-else-if="confirmSig === entry.sig" class="confirm-split full">
            <button
              class="ui-btn-sm confirm-option confirm-yes"
              @click="confirmRemove(entry.sig)"
              :ref="(el) => setYesRef(el, entry.sig)"
            >
              Yes
            </button>
            <button
              class="ui-btn-sm confirm-option confirm-no"
              @click="cancelConfirm"
            >
              No
            </button>
          </div>
          <UiButton
            v-else
            variant="destructive"
            size="sm"
            class="full"
            @click="requestConfirm(entry.sig)"
          >
            Remove
          </UiButton>
        </UiCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from "vue";
import Badge from "../ui/Badge.vue";
import QuickFixSection from "./QuickFixSection.vue";
import Spinner from "../ui/Spinner.vue";
import UiButton from "../ui/Button.vue";
import UiCard from "../ui/Card.vue";
import { useCopyIndicator } from "../../composables/useCopyIndicator";

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
const confirmSig = ref(null);
const yesRefs = ref(new Map());

const { isCopied, flashCopy } = useCopyIndicator();

function handleCopy(text) {
  props.onCopy?.(text);
  flashCopy(text);
}

function requestConfirm(sig) {
  confirmSig.value = sig;
  nextTick(() => {
    requestAnimationFrame(() => {
      const target = yesRefs.value.get(sig);
      target?.focus();
    });
  });
}

function cancelConfirm() {
  confirmSig.value = null;
}

function confirmRemove(sig) {
  confirmSig.value = null;
  props.onRemove?.(sig);
}

function cardAlt(entry) {
  const name = entry?.filename || entry?.display || "Label";
  return `${name} label preview`;
}

function setYesRef(el, sig) {
  const map = yesRefs.value;
  if (!map) return;
  if (el) {
    map.set(sig, el);
    if (confirmSig.value === sig) {
      requestAnimationFrame(() => el.focus());
    }
  } else {
    map.delete(sig);
  }
}
</script>
