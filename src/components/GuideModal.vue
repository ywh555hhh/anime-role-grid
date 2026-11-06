<script setup lang="ts">
defineProps<{
    show: boolean;
}>();

const emit = defineEmits(["close"]);
</script>

<template>
    <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
    >
        <div
            v-if="show"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            @click="emit('close')"
        >
            <!-- Outer Container -->
            <div
                class="bg-white dark:bg-gray-900 w-full max-w-md max-h-[80vh] rounded-2xl shadow-2xl border-4 border-black dark:border-gray-700 relative flex flex-col overflow-hidden min-h-0"
                @click.stop
            >
                <!-- Close Button -->
                <button
                    class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black text-white rounded-full hover:bg-primary transition-colors z-20"
                    @click="emit('close')"
                >
                    <div class="i-carbon-close text-xl" />
                </button>

                <!-- Scrollable Content -->
                <div class="overflow-y-auto flex-1 p-6 flex flex-col gap-6 scrollbar-thin">
                    <!-- Sticker Area -->
                    <div class="w-full flex items-center justify-center shrink-0 pt-4">
                        <img
                            src="/cana2.webp"
                            class="h-32 object-contain animate-wobble-slow"
                            alt="Sticker"
                        />
                    </div>

                    <!-- Title -->
                    <div class="text-center shrink-0">
                        <h2
                            class="font-serif-sc text-2xl font-bold text-black dark:text-white mb-1"
                        >
                            食用指南
                        </h2>
                        <div class="w-12 h-1 bg-primary mx-auto rounded-full" />
                    </div>

                    <!-- Sections -->
                    <div class="space-y-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                        <div class="flex gap-3 items-start">
                            <div
                                class="w-6 h-6 rounded-full bg-black text-white flex-shrink-0 flex items-center justify-center font-bold text-xs mt-0.5"
                            >
                                1
                            </div>
                            <div>
                                <h3 class="font-bold text-black dark:text-white mb-1">切换模板</h3>
                                <p>
                                    点击下方的“当前模板”按钮，可以切换不同的格子布局（如 5x3,
                                    CP问卷等）。
                                </p>
                            </div>
                        </div>

                        <div class="flex gap-3 items-start">
                            <div
                                class="w-6 h-6 rounded-full bg-black text-white flex-shrink-0 flex items-center justify-center font-bold text-xs mt-0.5"
                            >
                                2
                            </div>
                            <div>
                                <h3 class="font-bold text-black dark:text-white mb-1">上传图片</h3>
                                <p>
                                    点击任意格子，可以直接搜索 Bangumi
                                    角色，或者上传本地图片（支持自定义老婆/老公）。
                                </p>
                            </div>
                        </div>

                        <div class="flex gap-3 items-start">
                            <div
                                class="w-6 h-6 rounded-full bg-black text-white flex-shrink-0 flex items-center justify-center font-bold text-xs mt-0.5"
                            >
                                3
                            </div>
                            <div>
                                <h3 class="font-bold text-black dark:text-white mb-1">修改标题</h3>
                                <p>点击图片最上方的标题文字，可以自定义修改成你喜欢的标题。</p>
                            </div>
                        </div>

                        <div class="flex gap-3 items-start">
                            <div
                                class="w-6 h-6 rounded-full bg-black text-white flex-shrink-0 flex items-center justify-center font-bold text-xs mt-0.5"
                            >
                                4
                            </div>
                            <div>
                                <h3 class="font-bold text-black dark:text-white mb-1">保存分享</h3>
                                <p>
                                    点击“保存高清图片”，会自动生成带水印的高清大图。请大方地展示你的品味吧！
                                </p>
                            </div>
                        </div>

                        <div class="flex gap-3 items-start">
                            <div
                                class="w-6 h-6 rounded-full bg-black text-white flex-shrink-0 flex items-center justify-center font-bold text-xs mt-0.5"
                            >
                                5
                            </div>
                            <div>
                                <h3 class="font-bold text-black dark:text-white mb-1">
                                    视频导出疑难解答 (Beta)
                                </h3>
                                <div class="space-y-2">
                                    <p>
                                        视频导出功能目前处于测试阶段，为了获得最佳体验，我们<strong>强烈推荐</strong>使用以下环境：
                                    </p>
                                    <ul
                                        class="list-disc list-inside pl-1 text-xs space-y-1 text-gray-800 dark:text-gray-300"
                                    >
                                        <li>
                                            <b class="text-primary">Windows 电脑 + Chrome 浏览器</b>
                                            (推荐)
                                        </li>
                                        <li>
                                            <b class="text-primary">iOS + Chrome 浏览器</b>
                                            (完美支持)
                                        </li>
                                    </ul>

                                    <div
                                        class="bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700"
                                    >
                                        <p
                                            class="font-bold text-xs text-gray-900 dark:text-gray-100 mb-1"
                                        >
                                            iOS / Safari 特别说明：
                                        </p>
                                        <ul
                                            class="list-disc list-inside text-xs text-gray-600 dark:text-gray-400"
                                        >
                                            <li>
                                                导出后请点击分享 ->
                                                <b class="text-primary">"存储到文件"</b>。
                                            </li>
                                            <li>
                                                微信请发给
                                                <b class="text-primary">"文件传输助手"</b> 保存。
                                            </li>
                                        </ul>
                                    </div>

                                    <p class="text-xs text-gray-400 pt-1">
                                        如果遇到导出卡住或兼容性问题，欢迎
                                        <strong>加群反馈</strong> 或提交 Issue，我们会尽快修复！
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-xs">
                            <span class="font-bold text-primary">💡 小贴士：</span>
                            如果遇到图片生成不全，请尝试重新点击保存。iOS 用户请长按弹出的图片保存。
                        </div>
                    </div>

                    <!-- Footer -->
                    <div
                        class="text-center pt-4 border-t border-gray-100 dark:border-gray-800 shrink-0"
                    >
                        <p class="text-xs text-gray-500">
                            觉得好用的话，就分享给朋友们一起玩吧！
                            <br />
                            <a
                                href="https://github.com/ywh555hhh/anime-role-grid"
                                target="_blank"
                                class="text-primary hover:underline"
                                >GitHub 贡献模板</a
                            >
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>
