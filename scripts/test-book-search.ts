import "dotenv/config";

const accessToken = process.env.VITE_BANGUMI_ACCESS_TOKEN;
const userAgent = process.env.VITE_BANGUMI_USER_AGENT;

async function testBookSearch(keyword: string) {
    if (!accessToken || !userAgent) return;

    const url = "https://api.bgm.tv/v0/search/subjects";
    console.log(`Testing Book Search for: "${keyword}"`);

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": userAgent,
            },
            body: JSON.stringify({
                keyword: keyword,
                filter: { type: [1] }, // 1 = Book
                limit: 10,
            }),
        });
        const data = (await res.json()) as {
            data?: { id: number; name: string; type?: number; platform?: string }[];
        };
        if (data.data) {
            console.log(`Hits: ${data.data.length}`);
            data.data.forEach(
                (d: { id: number; name: string; type?: number; platform?: string }) => {
                    console.log(
                        `[${d.id}] ${d.name} | Type: ${d.type} | Platform: "${d.platform}"`,
                    );
                },
            );
        }
    } catch (e) {
        console.error(e);
    }
}

testBookSearch("Frieren");
testBookSearch("Overlord");
