<template>
  <div class="ui-input-wrap">
    <label v-if="label" class="ui-label" :for="inputId">
      {{ label }}
      <span v-if="hint" class="ui-hint"> ({{ hint }})</span>
    </label>
    <input
      ref="inputEl"
      v-bind="$attrs"
      class="ui-input"
      :id="inputId"
      :name="inputName"
      :type="type"
      :placeholder="placeholder"
      :value="type === 'file' ? null : modelValue"
      @input="onInput"
    />
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
  placeholder: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue"]);
const inputEl = ref(null);

const uid = Math.random().toString(36).substring(2, 10);
const fallbackId = `dropzone-${uid}`;

const inputId = computed(() => props.inputId || fallbackId);
const inputName = computed(() => props.inputName || inputId.value);

function onInput(event) {
  if (props.type === "file") return;
  emit("update:modelValue", event.target.value);
}

defineExpose({ inputEl });
</script>
