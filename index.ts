import { getArticle, getArticleList, ArticleFloor, ArticleItem } from './api'
import cheerio = require('cheerio')

// https://forum.gamer.com.tw/C.php?bsn=18673&snA=168425&tnum=1&subbsn=18
const isValidFloor = (f: ArticleFloor) => {
	try {
		if (!f || !f.content || f.deleted) return false
		const titleOk = /【.+】/u.test(f.title)
		const isGroupInvitation = /團招/.test(f.title)
		const $ = cheerio.load(f.content)
		const statusImg = $('.url-image[href*=minecraft]').first()
		const statusImgOk =
			statusImg.length === 1 && !statusImg.find('img').attr('src') && !statusImg.find('img').attr('src')
		return titleOk && (isGroupInvitation || statusImgOk)
	} catch (e) {
		console.error(f.content)
		return false
	}
}
;(async () => {
	const url = 'https://forum.gamer.com.tw/B.php?page=1&bsn=18673&subbsn=18'
	const {
		page: { last }
	} = await getArticleList(url)
	const pages: ArticleItem[][] = []
	for (let i = 1; i <= last; i++) {
		pages.push(await getArticleList(url.replace('page=1', `page=${i}`)).then(x => x.articles))
	}
	let invalidUrls = []
	for (const list of pages) {
		const floors = (await Promise.all(
			list
				.filter(x => !x.sticky && !x.deleted)
				.map(x => x.url)
				.map(getArticle)
		)).map(x => x.floors[0])
		invalidUrls = invalidUrls.concat(
			floors
				.filter(x => !isValidFloor(x))
				.filter(x => !x.deleted)
				.map(x => x.url)
		)
	}
	console.log(invalidUrls)
})()
