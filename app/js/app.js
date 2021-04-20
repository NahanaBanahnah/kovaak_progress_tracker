'use strict'
import { standard, material } from './config.colors.js'
import Charts from './class.Chart.js'
import { ui, message, evnt, form } from './helpers.js'

const charts = new Charts()

let chart
let userPrefs

let ac = { standard: { ...standard }, material: { ...ui } }

/*-- BUBBLING CLICK EVENTS
    ================================================== --*/

document.addEventListener('click', e => {
	const id = e.target.id
	const ele = e.target

	// ---------- LOGIN ---------- //
	evnt.listen(id, 'login', () => message.send('openAuth'))

	// ---------- SETTINGS ---------- //
	evnt.listen(id, 'file_browse', () => message.send('openFileBrowser'))
	evnt.listen(id, 'submit', () => form.submit())

	// ---------- TOP BAR ---------- //
	evnt.listen(id, 'back', ui.closeSettings)
	evnt.listen(id, 'settings', ui.openSettings)
	evnt.listen(id, 'customize', () => ui.openCustomize(ele, charts))
	evnt.listen(id, 'closeCustomize', ui.closeCustomize)

	// ---------- WINDOW BUTTONS  ---------- //
	evnt.listen(id, 'btnClose', window.api.close)
	evnt.listen(id, 'btnMax', ui.maximize)
	evnt.listen(id, 'btnRestore', ui.restore)
	evnt.listen(id, 'btnMin', window.api.minimize)

	// ---------- UPDATES ---------- //
	evnt.listen(id, 'restartToUpdate', () => window.api.send('restartToUpdate'))

	// ---------- CUSTOMIZE  ---------- //
	evnt.listen(ele.dataset.func, 'hide', () => charts.showHideRecord(ele))
})

/*-- BUBBLING KEYUP EVENTS
    ================================================== --*/

//Settings Input Validation
document.addEventListener('keyup', e => {
	// ---------- SETTINGS  ---------- //
	let ele = e.target
	evnt.listen(ele.id, 'database', () => form.checkDatabase(ele))
})

/*-- BUBBLING CHANGE EVENTS
    ================================================== --*/
document.addEventListener('change', e => {
	let ele = e.target

	evnt.listen(ele.id, 'challenges', () =>
		charts.setSingleView(e.target.value)
	)
	evnt.listen(ele.dataset.func, 'colorChange', () =>
		charts.setColorChange(ele)
	)
})

/*-- BUBBLING INPUT EVENTS
    ================================================== --*/
document.addEventListener('input', e => {
	let ele = e.target
	evnt.listen(ele.dataset.func, 'colorChange', () => ui.pickColor(ele))
})

/*-- MESSAGES
    ================================================== --*/

window.api.receive('authClosed', () => {})

// ---------- WINDOW RESIZING  ---------- //
window.api.receive('alternateMaximize', () => {
	document.querySelector('header').classList.add('maximized')
})

window.api.receive('alternateRestore', () => {
	document.querySelector('header').classList.remove('maximized')
})

// ---------- RECORDS  ---------- //
window.api.receive('recordedAdded', payload => {
	//displayed added notification
	ui.recordAdded(payload)
	charts.updateCharts(payload.records)
})

// ---------- INITING  ---------- //

window.api.receive('initProgress', payload => charts.initProgress(payload))

// ---------- FOLDER SELECT  ---------- //

window.api.receive('folderSelect', payload => form.folderSelect(payload))

// ---------- CONTENT CHANGING  ---------- //

window.api.receive('loadContent', payload => {
	const container = document.querySelector('#main')
	container.innerHTML = payload.html

	const version = document.querySelector('#version')
	const pfp = document.querySelector('#pfp')
	const folder = document.querySelector('#folder')
	const database = document.querySelector('#database')
	const folderField = document.querySelector('#folderField')
	const watching = document.querySelector('#watching')

	//set the version
	if (payload.version && version) {
		version.innerHTML = payload.version
	}

	//set the profile pic
	if (payload.userid && payload.avatar && pfp) {
		pfp.innerHTML = `<img src="https://cdn.discordapp.com/avatars/${payload.userid}/${payload.avatar}.png" />`
	}

	//set the values of the install dir
	if (payload.saveDirectory && folder) {
		folderField.innerHTML = payload.saveDirectory
		folder.value = payload.saveDirectory
	}

	//set the database
	if (payload.database && database) {
		database.value = payload.database
	}

	//if the settings for the folder and database are set we assume we're watching
	if (payload.database && payload.saveDirectory) {
		document.querySelector('#submit').disabled = false
		watching.innerHTML = '...Watching'
	}

	//its the inital setup so we need to hide the back button
	if (payload.initial && payload.section === 'settings') {
		document.querySelector('#back').classList.add('off')
		document.querySelector('#submit').dataset.initial = 'true'
	}

	if (payload.section === 'home') {
		ui.closeSettings()
	}
	if (payload.section === 'settings') {
		ui.openSettings()
	}
})

// ---------- UPDATE MANAGEMENT  ---------- //

window.api.receive('updateAvailable', () => ui.updateAvailable())
window.api.receive('updateDownloaded', () => ui.updateDownloaded())

// ---------- UNCOMMENT ONLY WHEN WORKING ON UI  ---------- //
// document.addEventListener('DOMContentLoaded', () => {
// 	window.api.send('sendContent')
// })
