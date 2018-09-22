import xf = require('xfetch-js')
import cheerio = require('cheerio')
import moment = require('moment')
import _ = require('lodash')

const joinUrl = (a, b) => new URL(b, a).toString()
const normalizeBahaDate = s =>
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
const getPage = ($:CheerioStatic):Page => ({
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
	date: string
	sticky: boolean
	deleted: boolean
}
export interface ArticleFloor {
	title?: string
	content?: string
	author?: string
	url?: string
	deleted: boolean
}
export interface Page{
	current: number
	last: number
}
export interface Pageable {
	hasNext(): boolean
	next(): Promise<Pageable>
	next<T>(): Promise<T>
	page: Page
}
export interface ArticleListResponse extends Pageable{
	articles: ArticleListItem[]
	next(): Promise<ArticleListResponse>
}
export interface ArticleResponse extends Pageable{
	floors: ArticleFloor[]
	next(): Promise<ArticleResponse>
}
export const getArticleList = async (url: string, page: number = 1):Promise<ArticleListResponse> => {
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
				date: normalizeBahaDate(
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
		articles,
		hasNext: () => page < pageo.last,
		next: () => getArticleList(url, page + 1)
	}
}

// exports.getArticleList('https://forum.gamer.com.tw/B.php?bsn=18673&subbsn=18').then(console.log)

export const getArticle = async (url: string, page: number = 1):Promise<ArticleResponse> => {
	const $ = await xf.get(url, { qs: { page } }).text(x => cheerio.load(x, { decodeEntities: false }))
	const floors = <ArticleFloor[]>(<any>$('.c-section[id]')
		.map((i, el) => {
			const $el = $(el)
			const deleted = $el.has('.c-disable').length > 0
			if (deleted) {
				return {
					author: _.get(/\((.+?)\)/.exec($el.find('.hint').text()), '1'),
					deleted: true
				}
			}
			return {
				title: $el.find('.c-post__header__title').text().trim(),
				content: $el.find('.c-article__content').html().trim(),
				author: $el.find('.userid').text().trim(),
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
		page: pageo,
		floors,
		hasNext: () => page < pageo.last,
		next: () => getArticle(url, page + 1)
	}
}
export const pageableToArray = async<T extends Pageable> (iter: T):Promise<(T)[]> => {
	if (!iter.hasNext()) {
		return []
	}
	let ar = [iter]
	iter = await iter.next<T>()
	while (iter.hasNext()) {
		ar.push(iter)
		iter = await iter.next<T>()
	}
	return ar
}
