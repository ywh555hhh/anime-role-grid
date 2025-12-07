import 'dotenv/config'

const accessToken = process.env.VITE_BANGUMI_ACCESS_TOKEN
const userAgent = process.env.VITE_BANGUMI_USER_AGENT

async function testYearFilter(keyword: string, year: number) {
    if (!accessToken || !userAgent) {
        console.error('Missing env vars')
        return
    }

    const url = 'https://api.bgm.tv/v0/search/subjects'
    const query = `${keyword} ${year}`
    console.log(`Testing Query: "${query}"`)

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': userAgent,
            },
            body: JSON.stringify({
                keyword: query,
                filter: { type: [2] },
                limit: 5
            })
        })
        const data = await res.json()
        if (data.data) {
            console.log(`Hits: ${data.data.length}`)
            data.data.forEach((d: any) => console.log(`- ${d.date} | ${d.name}`))
        } else {
            console.log('No data:', data)
        }

    } catch (e) {
        console.error(e)
    }
}

testYearFilter('Gundam', 2022) 
