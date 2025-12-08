<template>
  <div class="ui-input-wrap">
    <label v-if="label" class="ui-label" :for="inputId">
      {{ label }}
      <span v-if="hint" class="ui-hint"> ({{ hint }})</span>
    </label>
    <div class="ui-input-shell">
      <img
        v-if="prefixIcon"
        :src="prefixIcon"
        class="ui-input-icon"
        aria-hidden="true"
      />
      <input
        ref="inputEl"
        v-bind="$attrs"
        class="ui-input"
        :class="{ 'with-icon': !!prefixIcon }"
        :id="inputId"
        :name="inputName"
        :type="type"
        :placeholder="placeholder"
        :value="type === 'file' ? null : modelValue"
        @input="onInput"
      />
      <button
        v-if="showClear"
        type="button"
        class="ui-input-clear"
        @click="clear"
        :aria-label="`Clear ${label || 'input'}`"
      >
        <img src="/assets/cross-circle.svg" alt="" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

defineOptions({
  inheritAttrs: false,
  inputId: { type: String, default: "" },
  inputName: { type: String, default: "" },
});

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: "",
  },
  label: {
    type: String,
    default: "",
  },
  hint: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "text",
  },
  prefixIcon: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
  clearable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);
const inputEl = ref(null);

const uid = Math.random().toString(36).substring(2, 10);
const fallbackId = `dropzone-${uid}`;

const inputId = computed(() => props.inputId || fallbackId);
const inputName = computed(() => props.inputName || inputId.value);
const showClear = computed(
  () =>
    props.clearable &&
    props.type !== "file" &&
    props.modelValue !== null &&
    props.modelValue !== undefined &&
    String(props.modelValue).length > 0
);

function onInput(event) {
  if (props.type === "file") return;
  emit("update:modelValue", event.target.value);
}

function clear() {
  if (props.type === "file") return;
  emit("update:modelValue", "");
  if (inputEl.value) {
    inputEl.value.value = "";
    inputEl.value.focus();
  }
}

defineExpose({ inputEl });
</script>
