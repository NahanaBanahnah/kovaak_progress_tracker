import { ui, message, evnt, form } from './helpers.js'

window.api.receive('initChangelog', md => {
	//displayed added notification
	document.querySelector('#changeContent').innerHTML = md
})

document.addEventListener('click', e => {
	const id = e.target.id
	const ele = e.target

	evnt.listen(id, 'btnClose', window.api.close)
})

// ---------- UNCOMMENT ONLY WHEN WORKING ON UI  ---------- //
// document.addEventListener('DOMContentLoaded', () => {
// 	window.api.send('sendContent')
// })
