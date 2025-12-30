<script setup lang="ts">
import { useModalStore } from '~/stores/modalStore'

const store = useModalStore

// 监听弹窗关闭事件，统一反向调用 store
function handleClose() {
    // 假设大多弹窗组件都会 emit 'close' 或者 update:modelValue = false
    store.closeModal()
}

// 代理模式：所有的 Props 传递给动态组件
// 监听 'close', 'update:modelValue'
</script>

<template>
  <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
  >
    <!-- 使用 Component 动态渲染 -->
    <!-- 我们给每个弹窗包一层容器，确保即使组件本身没有 Modal Overlay 也能正常显示？ -->
    <!-- 不，我们的组件 (Modal) 通常自带 Overlay (fixed inset-0)。 -->
    <!-- 所以直接渲染 activeModal.component 即可。 -->
    <!-- 关键点：我们需要传递 modelValue=true 让组件显示出来 -->
    <component 
        v-if="store.activeModal.value"
        :is="store.activeModal.value.component"
        v-bind="store.activeModal.value.props"
        :modelValue="true"
        :show="true" 
        @close="handleClose"
        @update:modelValue="(val: boolean) => !val && handleClose()"
    />
  </Transition>
</template>

<style scoped>
/* 确保 Dispatcher 位于最顶层 */
:deep(.fixed) {
    z-index: 9999 !important; 
}
</style>
