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
const getPage = $ => ({
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
export interface ArticleItem {
	text: string
	url: string
	author: string
	date: string
	sticky: boolean
	deleted: boolean
}
// url='https://forum.gamer.com.tw/B.php?bsn=18673&subbsn=18'
export const getArticleList = async (url: string) => {
	const $ = await xf.get(url).text(cheerio.load)
	const articles = <ArticleItem[]>(<any>$('.b-list__row')
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
	return {
		page: getPage($),
		articles
	}
}

// exports.getArticleList('https://forum.gamer.com.tw/B.php?bsn=18673&subbsn=18').then(console.log)

export interface ArticleFloor {
	title?: string
	content?: string
	author?: string
	url?: string
	deleted: boolean
}
export const getArticle = async url => {
	const $ = await xf.get(url).text(x => cheerio.load(x, { decodeEntities: false }))
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
				title: $el.find('.c-post__header__title').text(),
				content: $('.c-article__content').html(),
				author: $el.find('.userid').text(),
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
	return {
		page: getPage($),
		floors
	}
}
// exports.getArticle('https://forum.gamer.com.tw/C.php?bsn=18673&snA=166595&tnum=35&subbsn=18').then(console.log)
