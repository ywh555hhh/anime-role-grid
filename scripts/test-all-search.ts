import "dotenv/config";
import fs from "fs";

const accessToken = process.env.VITE_BANGUMI_ACCESS_TOKEN;
const userAgent = process.env.VITE_BANGUMI_USER_AGENT;

console.log("Starting Comprehensive Bangumi API Test...");

// Types from Bangumi API docs or observation
// 1 = Book, 2 = Anime, 3 = Music, 4 = Game, 6 = Real

/** Bangumi v0 搜索接口返回的单条作品 */
interface SearchSubject {
    id: number;
    name: string;
    name_cn?: string;
    date?: string;
    score?: number;
    type?: number;
    platform?: string;
    images?: Record<string, string>;
}

/** 发给 Bangumi 的请求体 */
interface SearchRequestBody {
    keyword: string;
    limit: number;
    filter?: { type: number[] };
}

/** 汇总后的结果行 */
interface SearchResultRow {
    search_category: string;
    id: number;
    name: string;
    name_cn?: string;
    date?: string;
    score?: number;
    type?: number;
    images?: Record<string, string>;
}

const SUBJECT_TYPES = {
    ANIME: 2,
    GAME: 4,
    MUSIC: 3,
    REAL: 6,
    BOOK: 1,
};

async function searchGeneral(
    keyword: string,
    typeName: string,
    endpoint: string,
    filterType?: number,
) {
    console.log(`Testing ${typeName} Search [${keyword}]...`);
    try {
        const body: SearchRequestBody = {
            keyword,
            limit: 3,
        };

        if (filterType !== undefined) {
            body.filter = { type: [filterType] };
        }

        const res = await fetch(`https://api.bgm.tv/v0/search/${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": userAgent || "test-script",
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            console.error(`FAILED: ${res.status} ${res.statusText}`);
            return [];
        }

        const data = (await res.json()) as { data?: SearchSubject[] };
        const items = data.data || [];

        return items.map((item: SearchSubject): SearchResultRow => ({
            search_category: typeName,
            id: item.id,
            name: item.name,
            name_cn: item.name_cn,
            date: item.date,
            score: item.score,
            type: item.type, // API returned type
            images: item.images, // Check image structure
        }));
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
}

async function runTests() {
    const allResults: SearchResultRow[] = [];

    // 1. Person Search
    allResults.push(...(await searchGeneral("花泽香菜", "Person (Voice Actor)", "persons")));
    allResults.push(...(await searchGeneral("新海诚", "Person (Director)", "persons")));

    // 2. Character Search
    allResults.push(...(await searchGeneral("鲁路修", "Character", "characters")));

    // 3. Subject Search - Anime
    allResults.push(
        ...(await searchGeneral("进击的巨人", "Subject: Anime", "subjects", SUBJECT_TYPES.ANIME)),
    );

    // 4. Subject Search - Game
    allResults.push(
        ...(await searchGeneral("原神", "Subject: Game", "subjects", SUBJECT_TYPES.GAME)),
    );

    // 5. Subject Search - Manga (Book)
    allResults.push(
        ...(await searchGeneral("海贼王", "Subject: Manga", "subjects", SUBJECT_TYPES.BOOK)),
    );

    // 6. Subject Search - Light Novel (Book)
    allResults.push(
        ...(await searchGeneral(
            "刀剑神域",
            "Subject: Light Novel",
            "subjects",
            SUBJECT_TYPES.BOOK,
        )),
    );

    // 7. Subject Search - Music
    allResults.push(
        ...(await searchGeneral("YOASOBI", "Subject: Music", "subjects", SUBJECT_TYPES.MUSIC)),
    );

    // 8. Subject Search - Real (TV Drama / Tokusatsu)
    allResults.push(
        ...(await searchGeneral(
            "假面骑士",
            "Subject: Real/Tokusatsu",
            "subjects",
            SUBJECT_TYPES.REAL,
        )),
    );

    fs.writeFileSync("test_results.json", JSON.stringify(allResults, null, 2));
    console.log("Results written to test_results.json");
}

runTests();
