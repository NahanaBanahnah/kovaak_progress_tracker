'use strict'

/*-- SETTINGS VARS
    ================================================== --*/
const folder = document.querySelector('#folder')
const database = document.querySelector('#database')
// const folderField = document.querySelector('#folderField')

const canSubmit = () => {
	let send = true
	const submit = document.querySelector('#submit')
	const requied = document.querySelectorAll('[required]')

	requied.forEach(e => {
		if (e.value === '') {
			send = false
		}
		if (!e.checkValidity()) {
			send = false
		}
		if (!send) {
			submit.disabled = true
			return
		}
		submit.disabled = false
	})
}

const closeSettings = () => {
	const settings = document.querySelector('#settings')
	const home = document.querySelector('#home')

	settings.classList.add('close')
	settings.classList.remove('open')

	home.classList.add('open')
	home.classList.remove('close')
}

const openSettings = () => {
	const settings = document.querySelector('#settings')
	const home = document.querySelector('#home')

	settings.classList.add('open')
	settings.classList.remove('close')

	home.classList.add('close')
	home.classList.remove('open')
}

/*-- BUBBLING CLICK EVENTS
    ================================================== --*/

document.addEventListener('click', e => {
	const id = e.target.id

	// ---------- LOGIN ---------- //
	if (id === 'login') {
		window.api.send('openAuth')
	}

	// ---------- SETTINGS ---------- //
	if (id === 'file_browse') {
		window.api.send('openFileBrowser')
	}

	if (id === 'submit') {
		const folder = document.querySelector('#folder')
		const database = document.querySelector('#database')

		const payload = {
			saveDirectory: folder.value,
			database: database.value,
		}
		window.api.send('saveSettings', payload)
		closeSettings()
	}

	// ---------- TOP BAR ---------- //

	if (id === 'back') {
		closeSettings()
	}

	if (id === 'settings') {
		openSettings()
	}

	// ---------- WINDOW BUTTONS  ---------- //
	if (id === 'btnClose') {
		window.api.close()
	}

	if (id === 'btnMax') {
		window.api.maximize()
	}
})

/*-- BUBBLING KEYUP EVENTS
    ================================================== --*/

//Settings Input Validation
document.addEventListener('keyup', e => {
	// ---------- SETTINGS  ---------- //
	if (e.target.id === 'database') {
		const ele = e.target
		const label = document.querySelector(`label[for=${ele.id}]`)
		const error = e.target.dataset.invalid
		const pass = e.target.dataset.valid

		if (!ele.checkValidity()) {
			label.innerHTML = error
		} else {
			label.innerHTML = pass
		}
		canSubmit()
	}
})

/*-- MESSAGES
    ================================================== --*/

window.api.receive('authClosed', payload => {
	console.log(payload)
})

window.api.receive('recordedAdded', payload => {
	const container = document.querySelector('#added')
	const data = Object.values(payload.newRecord)
	const score = Math.round(data[0].score * 100) / 100

	container.innerHTML = `<img src="./icons/check.svg" />Added ${data[0].name} Score: ${score}`
	container.classList.add('show')
})

window.api.receive('folderSelect', payload => {
	let display = `${payload.file[0]}
    <br /><span class="error">This directory does not contain the correct files. Please make sure you chose the correct directory</span>`

	if (!payload.error) {
		document.querySelector('#folder').value = payload.file[0]
		display = payload.file[0]
	}

	document.querySelector(
		'#folderField'
	).innerHTML = `Kovaak Directory: ${display}`
	canSubmit()
})

window.api.receive('loadContent', payload => {
	const container = document.querySelector('#main')
	container.innerHTML = payload.html

	console.log(payload)

	const version = document.querySelector('#version')
	const pfp = document.querySelector('#pfp')
	const folder = document.querySelector('#folder')
	const database = document.querySelector('#database')
	const folderField = document.querySelector('#folderField')
	const watching = document.querySelector('#watching')

	if (payload.version && version) {
		version.innerHTML = payload.version
	}

	if (payload.userid && payload.avatar && pfp) {
		pfp.innerHTML = `<img src="https://cdn.discordapp.com/avatars/${payload.userid}/${payload.avatar}.png" />`
		console.log('test')
	}

	if (payload.saveDirectory && folder) {
		folderField.innerHTML = payload.saveDirectory
		folder.value = payload.saveDirectory
	}

	if (payload.database && database) {
		database.value = payload.database
	}

	if (payload.database && payload.saveDirectory) {
		document.querySelector('#submit').disabled = false
		watching.innerHTML = '...Watching'
	}

	if (payload.initial && payload.section === 'settings') {
		document.querySelector('#back').style.display = 'none'
	}

	if (payload.section === 'home') {
		closeSettings()
	}
	if (payload.section === 'settings') {
		openSettings()
	}
})
