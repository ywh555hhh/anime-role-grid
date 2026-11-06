<script setup lang="ts">
defineProps<{
    saving: boolean;
    /** 当前模板名。切模板按钮上显示，让它顺便当状态指示器 */
    templateName?: string;
}>();

const emit = defineEmits<{
    (e: "save"): void;
    (e: "export-video"): void;
    (e: "create-new"): void;
    (e: "open-gallery"): void;
}>();
</script>

<template>
    <div class="flex flex-col items-center gap-4 w-full max-w-md mt-2">
        <!--
            切换模板 —— 与「保存高清图片」**同视觉级别**。

            以前这个入口只在页面顶部一个 14px 的小按钮里，
            而手机用户是从下往上滚到操作栏的（也就是看到导出按钮的地方），
            那里压根没有「切模板」。于是「怎么换模板」成了个找不到的功能。

            现在它就摆在导出按钮**正上方**：同样的 text-lg、同样满宽，
            只用描边配色和实心的保存按钮区分开 ——
            视觉重量对等，操作意图不混淆。

            顺带把当前模板名显示在按钮上：它既是入口，也是状态指示器，
            省得用户滚回页面顶部去看自己在做哪个模板。
        -->
        <button class="w-full btn-outline-primary-lg" @click="emit('open-gallery')">
            <span class="flex items-center gap-2 shrink-0">
                <div i-carbon-grid class="shrink-0" />
                <span class="shrink-0">切换模板</span>
            </span>
            <!--
                右侧这组要能在窄屏上正确收缩：
                flex-1 吃掉剩余空间、min-w-0 允许收缩到内容宽度以下，
                里面的 truncate 才有确定宽度可以省略号截断。
                少了任何一环，模板名就会把按钮撑破。
            -->
            <span class="flex items-center gap-1 min-w-0 flex-1 justify-end">
                <span class="truncate min-w-0 text-sm font-normal opacity-75">{{
                    templateName
                }}</span>
                <div i-carbon-chevron-right class="shrink-0 text-xs" />
            </span>
        </button>

        <button class="w-full btn-primary text-lg" :disabled="saving" @click="emit('save')">
            <div v-if="saving" class="i-carbon-circle-dash animate-spin text-xl" />
            <div v-else class="i-carbon-image text-xl" />
            <span>{{ saving ? "生成中..." : "保存高清图片" }}</span>
        </button>

        <!-- Secondary Actions -->
        <div class="flex w-full gap-3">
            <button class="flex-1 btn-outline-primary" @click="emit('export-video')">
                <div i-carbon-video-filled />
                <span>导出视频</span>
            </button>

            <button
                class="flex-1 btn-outline-primary relative group overflow-hidden"
                @click="emit('create-new')"
            >
                <div
                    class="absolute inset-0 bg-primary-light/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
                ></div>
                <div i-carbon-add-alt />
                <span>我要出题</span>
            </button>
        </div>

        <!-- Extra Slots (e.g. Reset Tags, Open Gallery) -->
        <slot name="extra-actions"></slot>
    </div>
</template>
