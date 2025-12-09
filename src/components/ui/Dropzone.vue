<template>
  <div class="ui-input-wrap">
    <label v-if="label" class="ui-label" :for="inputId">
      {{ label }}
      <span v-if="hint" class="ui-hint"> ({{ hint }})</span>
    </label>
    <div
      class="ui-dropzone"
      :class="{ 'is-drag': isDragOver }"
      role="button"
      tabindex="0"
      :aria-label="dropAriaLabel"
      :aria-describedby="hintId || undefined"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @click="openFilePicker"
      @keydown.enter.prevent="openFilePicker"
      @keydown.space.prevent="openFilePicker"
    >
      <div class="drop-text" :id="hintId || undefined">
        <strong v-if="!fileName">Drag & Drop</strong>
        <span v-if="!fileName">or</span>
        <span v-if="!fileName" class="linkish">click to select</span>
        <div class="file-name" v-if="fileName">{{ fileName }}</div>
        <div class="drop-hint" v-else>{{ placeholder }}</div>
      </div>
    </div>
    <input
      ref="inputEl"
      class="hidden-input"
      type="file"
      :id="inputId"
      :name="inputName"
      :accept="accept"
      :required="required"
      :aria-label="dropAriaLabel"
      :aria-describedby="hintId || undefined"
      @change="onFileChange"
    />
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  label: { type: String, default: "" },
  hint: { type: String, default: "" },
  accept: { type: String, default: "" },
  inputId: { type: String, default: "" },
  inputName: { type: String, default: "" },
  required: { type: Boolean, default: false },
  placeholder: { type: String, default: "Drop a file here" },
});

const emit = defineEmits(["select"]);

const inputEl = ref(null);
const isDragOver = ref(false);
const fileName = ref("");
const uid = Math.random().toString(36).substring(2, 10);
const fallbackId = `dropzone-${uid}`;

const inputId = computed(() => props.inputId || fallbackId);
const inputName = computed(() => props.inputName || inputId.value);
const dropAriaLabel = computed(
  () => props.label || props.placeholder || "Upload file"
);
const hintId = computed(() =>
  props.hint || props.placeholder ? `${inputId.value}-hint` : null
);

function onDragOver() {
  isDragOver.value = true;
}

function onDragLeave() {
  isDragOver.value = false;
}

function useFile(file) {
  if (!file) return;
  fileName.value = file.name;
  emit("select", file);
}

function onDrop(e) {
  isDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  useFile(file);
}

function onFileChange(e) {
  const file = e.target.files?.[0];
  useFile(file);
}

function openFilePicker() {
  inputEl.value?.click();
}

function clear() {
  if (inputEl.value) {
    inputEl.value.value = "";
  }
  fileName.value = "";
}

defineExpose({ inputEl, clear });
</script>
