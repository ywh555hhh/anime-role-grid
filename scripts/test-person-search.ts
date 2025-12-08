import 'dotenv/config'

const accessToken = process.env.VITE_BANGUMI_ACCESS_TOKEN
const userAgent = process.env.VITE_BANGUMI_USER_AGENT

console.log('Testing Bangumi Person Search API...')

async function testPersonSearch(keyword: string) {
    try {
        // Try 'persons' endpoint
        const res = await fetch('https://api.bgm.tv/v0/search/persons', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': userAgent || 'test-script',
            },
            body: JSON.stringify({
                keyword,
                filter: {
                    type: [1], // Person type: 1 = Individual, 2 = Corporation, 3 = ???. Usually just search directly.
                }
            }),
        })

        console.log('Response Status:', res.status)

        if (!res.ok) {
            console.error('Error Body:', await res.text())
            // If 404, maybe it's not the right endpoint.
            return
        }

        const data = await res.json()
        console.log('Search Results for:', keyword)
        console.log(JSON.stringify(data, null, 2))
    } catch (error) {
        console.error('Fetch Error:', error)
    }
}

testPersonSearch('花泽香菜')
