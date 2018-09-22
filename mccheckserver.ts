import { getArticle, getArticleList, pageableToArray, ArticleListItem, ArticleResponse } from './api'
import cheerio = require('cheerio')

// https://forum.gamer.com.tw/C.php?bsn=18673&snA=168425&tnum=1&subbsn=18
const isValidArticle = (r: ArticleResponse) => {
	const f = r.floors[0]
	try {
		if (!f || !f.content || f.deleted) return false
		const titleOk = /【.+】/u.test(r.title)
		const isGroupInvitation = r.title.includes('團招')
		const isRealm =
			r.title.toLowerCase().includes('realm') ||
			f.content.toLowerCase().includes('realm') ||
			r.title.includes('威廉') ||
			f.content.includes('威廉')
		const isHamachi = f.content.includes('HA') || f.content.toLowerCase().includes('hamachi')
		const $ = cheerio.load(f.content)
		const statusImg = $('.url-image[href*=minecraft]').first()
		const statusImgOk =
			statusImg.length === 1 && !statusImg.find('img').attr('src') && !statusImg.find('img').attr('src')
		return titleOk && (isGroupInvitation || isRealm || isHamachi || statusImgOk)
	} catch (e) {
		console.error(f.content)
		return false
	}
}
;(async () => {
	const url = 'https://forum.gamer.com.tw/B.php?page=1&bsn=18673&subbsn=18'
	const art = await getArticleList(url)
	const pages: ArticleListItem[][] = (await pageableToArray(art)).map(ar => ar.articles)
	let invalidUrls = []
	for (const list of pages) {
		const floors = await Promise.all(
			list
				.filter(art => !art.sticky && !art.deleted)
				.map(art => art.url)
				.map(art => getArticle(art))
		)
		invalidUrls = invalidUrls.concat(
			floors
				.filter(p => !isValidArticle(p))
				.filter(p => !p.floors[0].deleted)
				.map(p => p.url)
		)
	}
	console.log(invalidUrls)
})()
