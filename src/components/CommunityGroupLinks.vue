<script setup lang="ts">
/**
 * 社群列表
 * =========
 *
 * 数据全部来自 `~/logic/communityGroups` —— 这里**只负责展示**。
 *
 * 之前群名、描述、链接是硬编码在组件里的，于是同一个群在
 * FirstTimeGuide 叫「ACNG」、在这里叫「ACN」，链接也是两套。
 * 现在只有一份数据，写和指不可能再对不上。
 */
import { COMMUNITY_GROUPS } from "~/logic/communityGroups";
</script>

<template>
    <div class="flex flex-col gap-3">
        <a
            v-for="group in COMMUNITY_GROUPS"
            :key="group.id"
            :href="group.url"
            target="_blank"
            rel="noopener"
            class="w-full group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border-2 transition-all duration-300 shadow-sm hover:shadow-md p-4 flex items-center gap-4"
            :class="
                group.featured
                    ? 'border-primary/40 dark:border-primary/50 hover:border-primary'
                    : 'border-pink-100 dark:border-gray-700 hover:border-primary'
            "
        >
            <!-- Icon -->
            <div
                class="p-3 rounded-full text-primary border shrink-0 transition-colors"
                :class="
                    group.featured
                        ? 'bg-primary/10 border-primary/20'
                        : 'bg-pink-50 dark:bg-pink-900/30 border-pink-100 dark:border-pink-800/30'
                "
            >
                <div :class="group.icon" class="text-2xl" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                    <div class="font-black text-base text-gray-900 dark:text-gray-100 truncate">
                        {{ group.name }}
                    </div>
                    <span
                        class="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
                        :class="
                            group.featured
                                ? 'bg-primary text-white'
                                : 'bg-pink-50 text-primary dark:bg-pink-900/30 dark:text-pink-200'
                        "
                    >
                        {{ group.featured ? "推荐" : group.tagline }}
                    </span>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {{ group.desc }}
                </div>
                <!--
                    群号是保底手段：分享链接可能过期，群号不会。
                    直接显示出来，用户搜群号也能进。
                -->
                <div
                    class="mt-1 text-[10px] text-gray-400 dark:text-gray-500 font-mono tracking-wide"
                >
                    群号 {{ group.groupCode }}
                </div>
            </div>

            <!-- Arrow -->
            <div
                class="i-carbon-arrow-right text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0"
            />
        </a>
    </div>
</template>
