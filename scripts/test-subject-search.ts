import 'dotenv/config'
import fs from 'fs'
import path from 'path'

const accessToken = process.env.VITE_BANGUMI_ACCESS_TOKEN
const userAgent = process.env.VITE_BANGUMI_USER_AGENT

console.log('Testing Bangumi Subject Search API...')
console.log('User Agent:', userAgent)

async function testSubjectSearch(keyword: string) {
    if (!accessToken || !userAgent) {
        console.error('Missing VITE_BANGUMI_ACCESS_TOKEN or VITE_BANGUMI_USER_AGENT in .env')
        return
    }

    try {
        const url = 'https://api.bgm.tv/v0/search/subjects'
        console.log(`POST ${url}`)

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': userAgent,
            },
            body: JSON.stringify({
                keyword,
                filter: {
                    type: [2], // 2 = Anime (Animation)
                },
                limit: 3,
            }),
        })

        console.log('Response Status:', res.status)

        if (!res.ok) {
            console.error('Error Body:', await res.text())
            return
        }

        const data = await res.json()
        const outputPath = path.resolve(process.cwd(), 'subject_search_results.json')
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2))
        console.log(`Results saved to ${outputPath}`)

    } catch (error) {
        console.error('Fetch Error:', error)
    }
}

testSubjectSearch('葬送的芙莉莲')
