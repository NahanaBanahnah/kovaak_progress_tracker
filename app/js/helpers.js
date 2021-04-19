export const ui = {
	openSettings: () => {
		const settings = document.querySelector('#settings')
		const home = document.querySelector('#home')

		settings.classList.add('open')
		settings.classList.remove('close')

		home.classList.add('close')
		home.classList.remove('open')
	},
	closeSettings: () => {
		const settings = document.querySelector('#settings')
		const home = document.querySelector('#home')

		settings.classList.add('close')
		settings.classList.remove('open')

		home.classList.add('open')
		home.classList.remove('close')
	},
	//restore the buttons once the initial startup is done
	initialStart: () => {
		document.querySelector('#submit').dataset.initial = 'false'
		document.querySelector('#back').classList.remove('off')
		document.querySelector('#watching').innerHTML = '...Watching'
	},
	openCustomize: (ele, charts) => {
		if (ele.classList.contains('on')) {
			document.querySelector('#closeCustomize').click()
			return
		}
		charts.openCustomize()
		ele.classList.add('on')
		document.querySelector('#customizeDrawer').classList.add('open')
		document.querySelector('.chart_container').classList.add('fade')
	},
	closeCustomize: () => {
		document.querySelector('#customize').classList.remove('on')
		document.querySelector('#customizeDrawer').classList.remove('open')
		document.querySelector('.chart_container').classList.remove('fade')
	},
	pickColor: ele => {
		let parent = ele.closest('div.row')
		let k = parent.dataset.key
		let preview = parent.querySelector('div.preview > span')

		preview.style.backgroundColor = ele.value
	},
	recordAdded: payload => {
		const container = document.querySelector('#added')
		const data = Object.values(payload.newRecord)
		const score = Math.round(data[0].score * 100) / 100

		container.innerHTML = `<img src="./icons/check.svg" />Added ${data[0].name} Score: ${score}`
		container.classList.add('show')
	},
	updateAvailable: () => {
		document.querySelector('#update').innerHTML = 'Downloading Update'

		document.querySelector('#update').classList.add('show')
		document.querySelector('#downloading').classList.add('show')
	},
	updateDownloaded: () => {
		document.querySelector('#update').innerHTML =
			'<a id="restartToUpdate">Update available. Restart to update <img src="./icons/refresh.svg" alt="restart" /> </a>'

		document.querySelector('#update').classList.add('ui-green')
		document.querySelector('#downloading').classList.remove('show')
	},
	maximize: () => {
		document.querySelector('header').classList.add('maximized')
		window.api.maximize()
	},
	restore: () => {
		document.querySelector('header').classList.remove('maximized')
		window.api.restore()
	},
}

export const form = {
	submit: () => {
		const ele = document.querySelector('#submit')
		const folder = document.querySelector('#folder')
		const database = document.querySelector('#database')
		let initial = false

		if (ele.dataset.initial === 'true') {
			initial = true
		}
		const payload = {
			saveDirectory: folder.value,
			database: database.value,
			initial: initial,
		}
		window.api.send('saveSettings', payload)
		ui.closeSettings()

		if (initial) {
			ui.initialStart()
		}
	},
	canSubmit: () => {
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
	},
	checkDatabase: ele => {
		const label = document.querySelector(`label[for=${ele.id}]`)
		const error = ele.dataset.invalid
		const pass = ele.dataset.valid

		if (!ele.checkValidity()) {
			label.innerHTML = error
		} else {
			label.innerHTML = pass
		}
		form.canSubmit()
	},
	folderSelect: payload => {
		let display = `${payload.file[0]}
        <br /><span class="error">This directory does not contain the correct files. Please make sure you chose the correct directory</span>`

		if (!payload.error) {
			document.querySelector('#folder').value = payload.file[0]
			display = payload.file[0]
		}

		document.querySelector(
			'#folderField'
		).innerHTML = `Kovaak Directory: ${display}`

		form.canSubmit()
	},
}

export const message = {
	send: channel => {
		window.api.send(channel)
	},
}

export const evnt = {
	listen: (element, search, cb) => {
		if (element === search) {
			cb()
		}
	},
}
