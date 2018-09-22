import { pageableToArray, getArticle } from './api'
;(async () => {
	const art = await getArticle('https://forum.gamer.com.tw/C.php?bsn=60076&snA=4051045', 335)
	const floors = (await pageableToArray(art)).map(art => art.floors).reduce((a, b) => a.concat(b), [])
	console.log(floors.filter(f => f.gp >= 5))
})()
