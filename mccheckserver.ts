import { getArticle, getArticleList, pageableToArray, ArticleFloor, ArticleListItem, ArticleListResponse } from './api'
import cheerio = require('cheerio')

// https://forum.gamer.com.tw/C.php?bsn=18673&snA=168425&tnum=1&subbsn=18
const isValidFloor = (f: ArticleFloor) => {
	try {
		if (!f || !f.content || f.deleted) return false
		const titleOk = /【.+】/u.test(f.title)
		const isGroupInvitation = f.title.includes('團招')
		const isRealm = f.title.toLowerCase().includes('realm') || f.content.toLowerCase().includes('realm')
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
		const floors = (await Promise.all(
			list
				.filter(art => !art.sticky && !art.deleted)
				.map(art => art.url)
				.map(art => getArticle(art))
		)).map(post => post.floors[0])
		invalidUrls = invalidUrls.concat(
			floors
				.filter(f => !isValidFloor(f))
				.filter(f => !f.deleted)
				.map(f => f.url)
		)
	}
	console.log(invalidUrls)
})()
