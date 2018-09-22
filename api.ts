import xf = require('xfetch-js')
import cheerio = require('cheerio')
import moment = require('moment')
import _ = require('lodash')

const joinUrl = (a, b) => new URL(b, a).toString()
const normalizeBahaTime = s =>
	s
		.replace(
			'今日',
			moment()
				.subtract('1D')
				.format('MM/DD')
		)
		.replace(
			'昨日',
			moment()
				.subtract('2D')
				.format('MM/DD')
		)
const getPage = ($: CheerioStatic): Page => ({
	current: parseInt(
		$('.pagenow')
			.first()
			.text()
	),
	last: parseInt(
		$('.BH-pagebtnA a')
			.last()
			.text()
	)
})
export interface ArticleListItem {
	text: string
	url: string
	author: string
	gp: number
	time: string
	sticky: boolean
	deleted: boolean
}
export interface ArticleFloor {
	floor: number
	time: string
	content: string
	author: string
	gp: number
	url: string
	deleted: boolean
}
export interface Page {
	current: number
	last: number
}
export interface Pageable {
	hasNext(): boolean
	next(): Promise<Pageable>
	next<T>(): Promise<T>
	page: Page
}
export interface ArticleListResponse extends Pageable {
	url: string
	articles: ArticleListItem[]
	next(): Promise<ArticleListResponse>
}
export interface ArticleResponse extends Pageable {
	url: string
	title: string
	floors: ArticleFloor[]
	next(): Promise<ArticleResponse>
}
export const getArticleList = async (url: string, page: number = 1): Promise<ArticleListResponse> => {
	const $ = await xf.get(url, { qs: { page } }).text(cheerio.load)
	const articles = <ArticleListItem[]>(<any>$('.b-list__row')
		.map((i, el) => {
			const $el = $(el)
			const deleted = $el.hasClass('b-list__row--delete')
			if (deleted) {
				return {
					deleted: true
				}
			}
			return {
				text: $el
					.find('.b-list__main__title')
					.text()
					.trim(),
				url: joinUrl('https://forum.gamer.com.tw/', $el.find('.b-list__main__title').attr('href')),
				author: $el
					.find('.b-list__count__user')
					.text()
					.trim(),
				gp: parseInt($el.find('.b-list__summary__gp').text() || '0'),
				time: normalizeBahaTime(
					$el
						.find('.b-list__time__edittime')
						.text()
						.trim()
				),
				sticky: $el.hasClass('b-list__row--sticky'),
				deleted: false
			}
		})
		.toArray())
	const pageo = getPage($)
	return {
		page: pageo,
		url,
		articles,
		hasNext: () => page < pageo.last,
		next: () => getArticleList(url, page + 1)
	}
}

// exports.getArticleList('https://forum.gamer.com.tw/B.php?bsn=18673&subbsn=18').then(console.log)

export const getArticle = async (url: string, page: number = 1): Promise<ArticleResponse> => {
	const $ = await xf.get(url, { qs: { page } }).text(x => cheerio.load(x, { decodeEntities: false }))
	const floors = <ArticleFloor[]>(<any>$('.c-section[id]')
		.map((i, el) => {
			const $el = $(el)
			const deleted = $el.has('.c-disable').length > 0
			if (deleted) {
				return {
					floor: parseInt($el.find('.floor').data('floor')),
					author: _.get(/\((.+?)\)/.exec($el.find('.hint').text()), '1'),
					deleted: true
				}
			}
			return {
				floor: parseInt($el.find('.floor').data('floor')),
				time: $el.find('.edittime').data('mtime'),
				content: $el
					.find('.c-article__content')
					.html()
					.trim(),
				author: $el
					.find('.userid')
					.text()
					.trim(),
				gp: parseInt($el.find('.gp .count').text() || '0'),
				url: joinUrl(
					'https://forum.gamer.com.tw/',
					$(el)
						.find('.c-post__header__author .floor')
						.attr('href')
				),
				deleted: false
			}
		})
		.toArray())
	const pageo = getPage($)
	return {
		title: $('.c-post__header__title')
			.text()
			.trim(),
		page: pageo,
		url,
		floors,
		hasNext: () => page < pageo.last,
		next: () => getArticle(url, page + 1)
	}
}
export const pageableToArray = async <T extends Pageable>(
	iter: T,
	limit: number = Number.POSITIVE_INFINITY
): Promise<(T)[]> => {
	if (!iter.hasNext()) {
		return []
	}
	let ar = [iter]
	iter = await iter.next<T>()
	while (iter.hasNext() && ar.length <= limit) {
		ar.push(iter)
		iter = await iter.next<T>()
	}
	ar.push(iter)
	return ar
}
