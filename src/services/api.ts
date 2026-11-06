import type { SaveGridPayload, CustomTemplate, TemplateConfig } from "~/types/grid";
import type { BgmSearchResultItem, StatsResponse, TrendingItem } from "~/types";

/**
 * Service Layer: Centralizes all network communication.
 * Components should NEVER call fetch() directly.
 */
export const api = {
    // --- Grid Operations ---

    async saveGrid(payload: SaveGridPayload): Promise<{ success: boolean; id?: string }> {
        const res = await fetch("/api/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            throw new Error(`Save failed: ${res.statusText}`);
        }
        return res.json();
    },

    // --- Template Operations ---

    async createTemplate(data: {
        title: string;
        config: TemplateConfig;
    }): Promise<{ success: boolean; id: string }> {
        const res = await fetch("/api/template/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Create template failed");
        return res.json();
    },

    async getTemplate(id: string): Promise<CustomTemplate> {
        const res = await fetch(`/api/template/${id}`);
        // if (!res.ok) throw new Error('Template not found')
        // 暂时隐藏旧模板错误提示，直接跳转首页
        if (!res.ok) {
            window.location.href = "/";
            return Promise.reject();
        }
        return res.json();
    },

    // --- External / Search ---

    async searchBangumi(
        keyword: string,
        type: string = "character",
        year?: string,
        offset: number = 0,
    ): Promise<BgmSearchResultItem[]> {
        // 1. Prepare Auth (Moved to Server)

        // 2. Determine Mode & API Path Strategy
        const isPerson = type === "person";
        const isCharacter = type === "character";

        let searchMode = "subject";
        if (isCharacter) searchMode = "character";
        if (isPerson) searchMode = "person";

        // 3. Construct Payload
        // Filter Type IDs: 1=Book, 2=Anime, 3=Music, 4=Game, 6=Real
        let filterType: number[] = [1];
        switch (type) {
            case "character":
                filterType = [1];
                break;
            case "person":
                filterType = [1];
                break;
            case "anime":
                filterType = [2];
                break;
            case "manga":
                filterType = [1];
                break;
            case "novel":
                filterType = [1];
                break; // Book
            case "game":
                filterType = [4];
                break;
            case "music":
                filterType = [3];
                break;
            case "real":
                filterType = [6];
                break;
        }

        // 4. Send Request via Proxy
        // ALWAYS use /api/search, never direct URL
        const res = await fetch("/api/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                keyword,
                filter: { type: filterType },
                offset,
                limit: 20,
                searchMode,
            }),
        });

        if (!res.ok) {
            if (res.status === 401) throw new Error("API 认证失败 (401)");
            throw new Error(`API 请求失败: ${res.status}`);
        }

        const result = (await res.json()) as { data?: BgmSearchResultItem[] };
        let items: BgmSearchResultItem[] = result.data || [];

        // 5. Client-side Post-Filtering (Legacy Logic Ported)
        if (!isCharacter && !isPerson) {
            items = items.filter((item) => {
                // 年份 / 平台这两个字段**只有作品类条目才有**，
                // 角色与人物条目上没有 —— 用 in 做类型收窄，别用 any 蒙过去。
                const date = "date" in item ? item.date : undefined;
                const platform = "platform" in item ? item.platform : undefined;

                // Year Filter
                if (year) {
                    if (!date || !date.startsWith(year)) return false;
                }
                // Platform Filter (Manga vs Novel)
                if (type === "manga") return platform === "漫画";
                if (type === "novel") return platform === "小说";

                return true;
            });
        }

        return items;
    },

    async getTrending(period: string = "24h"): Promise<TrendingItem[]> {
        const res = await fetch(`/api/trending?period=${period}`);
        if (!res.ok) throw new Error("Fetch trending failed");
        const data = (await res.json()) as { results?: TrendingItem[] };
        return data.results || [];
    },

    async getTrendingTemplates(): Promise<{ id: string; count: number }[]> {
        try {
            const res = await fetch("/api/trending-templates");
            if (!res.ok) return [];
            const data = await res.json();
            return data.results || [];
        } catch (e) {
            console.warn("Failed to fetch trending templates", e);
            return [];
        }
    },

    async getTemplateStats(
        templateId: string,
        period: "24h" | "week" | "all" = "all",
    ): Promise<StatsResponse> {
        const res = await fetch(`/api/stats/${templateId}?period=${period}`);
        if (!res.ok) throw new Error(`Failed to load stats: ${res.status} ${res.statusText}`);
        return res.json();
    },
};
