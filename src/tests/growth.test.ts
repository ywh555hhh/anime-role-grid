import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

/**
 * 引流弹窗频控的回归测试
 * ========================
 *
 * 这里守的是三条最容易悄悄坏掉的规则：
 *
 * 1. `daily-picks` 是**日历日**粒度，不是 24 小时 ——
 *    晚上 11:59 弹过，第二天早上 8 点就该能再看
 * 2. `trending-picks` 是固定时长（一小时）
 * 3. localStorage 读不出来 / 写不进去时**不能把功能搞挂**
 *
 * 模块里有「本次访问已弹过」的模块级状态，所以每个用例都
 * 重新 import 一份，保证互相不干扰。
 */
async function freshGrowth() {
    vi.resetModules();
    return await import("~/logic/growth");
}

describe("引流频控", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
        // 固定在一个确定的时间点：2026-11-06 10:00 本地时间
        vi.setSystemTime(new Date(2026, 10, 6, 10, 0, 0));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("从没弹过 → 能弹", async () => {
        const growth = await freshGrowth();
        expect(growth.canShow("daily-picks")).toBe(true);
        expect(growth.canShow("trending-picks")).toBe(true);
    });

    it("弹过之后 → 同一个冷却窗口内不能弹", async () => {
        const growth = await freshGrowth();
        growth.markShown("daily-picks");
        growth.markShown("trending-picks");

        expect(growth.canShow("daily-picks")).toBe(false);
        expect(growth.canShow("trending-picks")).toBe(false);
    });

    it("trending-picks 一小时后恢复", async () => {
        const growth = await freshGrowth();
        growth.markShown("trending-picks");

        vi.advanceTimersByTime(59 * 60 * 1000);
        expect(growth.canShow("trending-picks")).toBe(false);

        vi.advanceTimersByTime(2 * 60 * 1000);
        expect(growth.canShow("trending-picks")).toBe(true);
    });

    it("daily-picks 跨过零点就恢复（是日历日，不是 24 小时）", async () => {
        const growth = await freshGrowth();
        // 当天 23:59 弹过
        vi.setSystemTime(new Date(2026, 10, 6, 23, 59, 0));
        growth.markShown("daily-picks");
        expect(growth.canShow("daily-picks")).toBe(false);

        // 次日 00:01 —— 只过了 2 分钟，但已经是新的一天了
        vi.setSystemTime(new Date(2026, 10, 7, 0, 1, 0));
        expect(growth.canShow("daily-picks")).toBe(true);
    });

    it("同一天内多次进入不会反复弹", async () => {
        const growth = await freshGrowth();
        growth.markShown("daily-picks");

        vi.setSystemTime(new Date(2026, 10, 6, 12, 0, 0));
        expect(growth.canShow("daily-picks")).toBe(false);

        vi.setSystemTime(new Date(2026, 10, 6, 23, 0, 0));
        expect(growth.canShow("daily-picks")).toBe(false);
    });

    it("「本次访问已弹过」是刷新即重置的", async () => {
        const growth = await freshGrowth();
        expect(growth.hasShownThisVisit()).toBe(false);

        growth.markShownThisVisit();
        expect(growth.hasShownThisVisit()).toBe(true);

        // 重新 import = 一次新的页面访问
        const again = await freshGrowth();
        expect(again.hasShownThisVisit()).toBe(false);
    });

    it("localStorage 写不进去不能把功能搞挂", async () => {
        const growth = await freshGrowth();
        const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("QuotaExceededError");
        });

        expect(() => growth.markShown("daily-picks")).not.toThrow();
        // 写不进去 = 当作没记录 = 还能弹（宁可多弹一次）
        expect(growth.canShow("daily-picks")).toBe(true);

        setItem.mockRestore();
    });

    it("localStorage 里有坏数据也不能把功能搞挂", async () => {
        const growth = await freshGrowth();
        localStorage.setItem("arg:growth:v1:daily-picks", "not-a-number");

        expect(() => growth.canShow("daily-picks")).not.toThrow();
        expect(growth.canShow("daily-picks")).toBe(true);
    });

    it("resetGrowthCooldowns 清掉持久化的冷却", async () => {
        const growth = await freshGrowth();
        growth.markShown("daily-picks");
        growth.markShown("trending-picks");
        expect(growth.canShow("daily-picks")).toBe(false);

        growth.resetGrowthCooldowns();
        expect(growth.canShow("daily-picks")).toBe(true);
        expect(growth.canShow("trending-picks")).toBe(true);
    });

    it("getGrowthState 能读出上次展示时间", async () => {
        const growth = await freshGrowth();
        expect(growth.getGrowthState()["daily-picks"]).toBeNull();

        growth.markShown("daily-picks");
        expect(growth.getGrowthState()["daily-picks"]).toBe(Date.now());
    });
});
