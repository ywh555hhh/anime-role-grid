import 'dotenv/config'

const accessToken = process.env.VITE_BANGUMI_ACCESS_TOKEN
const userAgent = process.env.VITE_BANGUMI_USER_AGENT

async function testGameSearch(keyword: string) {
    if (!accessToken || !userAgent) return

    const url = 'https://api.bgm.tv/v0/search/subjects'
    console.log(`Testing Game Search for: "${keyword}"`)

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': userAgent,
            },
            body: JSON.stringify({
                keyword: keyword,
                filter: { type: [4] }, // 4 = Game
                limit: 5
            })
        })
        const data = await res.json()
        if (data.data) {
            console.log(`Hits: ${data.data.length}`)
            data.data.forEach((d: any) => {
                console.log(`[${d.id}] ${d.name} | Platform: "${d.platform}"`)
            })
        }

    } catch (e) {
        console.error(e)
    }
}

testGameSearch('Elden Ring')
testGameSearch('Zelda')
