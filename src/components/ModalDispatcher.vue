<script setup lang="ts">
import { useModalStore } from "~/stores/modalStore";

const store = useModalStore;

// 监听弹窗关闭事件，统一反向调用 store
function handleClose() {
    // 假设大多弹窗组件都会 emit 'close' 或者 update:modelValue = false
    store.closeModal();
}

// 代理模式：所有的 Props 传递给动态组件
// 监听 'close', 'update:modelValue'
</script>

<template>
    <!--
        包裹层只有一个作用：给全局 CSS 一个挂载点。

        App.vue 里的顺序是 <ModalDispatcher /> 然后 <router-view />，
        所以同层级 z-index 下，经调度器渲染的弹窗会落在页面内容**下面**。
        全局规则 `.modal-dispatcher-root .fixed { z-index: 9999 }` 只作用于
        这一层里的弹窗；页面里内联渲染的弹窗（搜索框、导出框）层级关系保持原样。

        以前这条规则写成 `<style scoped> :deep(.fixed) { z-index: 9999 }` ——
        等价，但被关在组件里，既违反「组件内禁止 scoped CSS」的规范，
        也让「这条规则到底作用在谁身上」只能靠读组件源码才看得清。
    -->
    <div class="modal-dispatcher-root">
        <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <!-- 使用 Component 动态渲染 -->
            <!-- 我们的组件 (Modal) 通常自带 Overlay (fixed inset-0)，直接渲染即可。 -->
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
    </div>
</template>
