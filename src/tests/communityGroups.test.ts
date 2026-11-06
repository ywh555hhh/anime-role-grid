import { describe, it, expect } from "vitest";
import { COMMUNITY_GROUPS, getCommunityGroup, getFeaturedGroup } from "~/logic/communityGroups";

/**
 * 社群数据的回归测试
 * ==================
 *
 * 这份数据以前散在三个组件里，导致：
 *   - 同一个群在两处的名字不一样（ACN / ACNG）
 *   - 同一个群有两套链接
 *   - 群号没人记，链接过期就彻底进不去群
 *
 * 现在集中到一处了，就该守住它。
 */
describe("社群数据", () => {
    it("至少有一个群", () => {
        expect(COMMUNITY_GROUPS.length).toBeGreaterThan(0);
    });

    it("id 唯一", () => {
        const ids = COMMUNITY_GROUPS.map((g) => g.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("群号唯一（一个群号只能对应一个群）", () => {
        const codes = COMMUNITY_GROUPS.map((g) => g.groupCode);
        expect(new Set(codes).size).toBe(codes.length);
    });

    it("入群链接唯一（避免两个群指向同一个链接）", () => {
        const urls = COMMUNITY_GROUPS.map((g) => g.url);
        expect(new Set(urls).size).toBe(urls.length);
    });

    it("每条都字段完整", () => {
        for (const g of COMMUNITY_GROUPS) {
            expect(g.id, "id 不能为空").toBeTruthy();
            expect(g.name, `${g.id} 缺 name`).toBeTruthy();
            expect(g.tagline, `${g.id} 缺 tagline`).toBeTruthy();
            expect(g.desc, `${g.id} 缺 desc`).toBeTruthy();
            expect(g.groupCode, `${g.id} 缺 groupCode`).toBeTruthy();
            expect(g.url, `${g.id} 缺 url`).toBeTruthy();
            expect(g.icon, `${g.id} 缺 icon`).toBeTruthy();
        }
    });

    it("群号是纯数字（用户要照着它搜群）", () => {
        for (const g of COMMUNITY_GROUPS) {
            expect(g.groupCode, `${g.id} 的群号不是数字`).toMatch(/^\d{6,}$/);
        }
    });

    it("链接是 https 且指向 QQ", () => {
        for (const g of COMMUNITY_GROUPS) {
            expect(g.url, `${g.id} 的链接不是 https`).toMatch(/^https:\/\/(qm|qun)\.qq\.com\//);
        }
    });

    it("主推群存在，且只有一个", () => {
        const featured = COMMUNITY_GROUPS.filter((g) => g.featured);
        expect(featured).toHaveLength(1);
        expect(getFeaturedGroup().id).toBe(featured[0]?.id);
    });

    it("按 id 能查到", () => {
        const first = COMMUNITY_GROUPS[0];
        expect(first).toBeDefined();
        expect(getCommunityGroup(first!.id)?.name).toBe(first!.name);
        expect(getCommunityGroup("__not_exist__")).toBeUndefined();
    });
});
