<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = defineProps<{
    modelValue: string;
    tag?: string;
    editable?: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
    (e: 'focus', event: FocusEvent): void;
    (e: 'blur', event: FocusEvent): void;
}>();

const element = ref<HTMLElement | null>(null);
const isComposing = ref(false);
const isEmpty = ref(true);

const checkEmpty = () => {
    if (element.value) {
        // Check if text is effectively empty (handling <br>, \n, whitespace)
        // Actually, if we want placeholder to show only when truly empty of chars:
        const text = element.value.innerText.replace(/[\n\r]+$/, ''); 
        isEmpty.value = text === '';
    }
};

// Watch for upstream changes
watch(() => props.modelValue, (newVal) => {
    if (element.value && document.activeElement !== element.value) {
        if (element.value.innerText !== newVal) {
            element.value.innerText = newVal || '';
            checkEmpty();
        }
    }
    // Also update empty state even if we didn't update DOM (e.g. typing)
    if (!element.value) isEmpty.value = !newVal;
});

// Watch editable prop to enable/disable
watch(() => props.editable, (canEdit) => {
    if (element.value) {
        element.value.contentEditable = canEdit ? 'true' : 'false';
    }
});

onMounted(() => {
    if (element.value) {
        element.value.innerText = props.modelValue || '';
        element.value.contentEditable = props.editable ? 'true' : 'false';
        checkEmpty();
    }
});

const onInput = (e: Event) => {
    if (isComposing.value) return;
    const text = (e.target as HTMLElement).innerText;
    emit('update:modelValue', text);
    checkEmpty();
};

const onCompositionStart = () => {
    isComposing.value = true;
};

const onCompositionEnd = (e: Event) => {
    isComposing.value = false;
    const text = (e.target as HTMLElement).innerText;
    emit('update:modelValue', text);
    checkEmpty();
};

const onFocus = (e: FocusEvent) => {
    emit('focus', e);
};

const onBlur = (e: FocusEvent) => {
    checkEmpty();
    emit('blur', e);
};
</script>

<template>
  <component 
    :is="tag || 'div'"
    ref="element"
    class="outline-none"
    :class="{ 'is-empty': isEmpty }"
    spellcheck="false"
    @input="onInput"
    @compositionstart="onCompositionStart"
    @compositionend="onCompositionEnd"
    @focus="onFocus"
    @blur="onBlur"
  >
    <slot />
  </component>
</template>
