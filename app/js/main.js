'use strict'

/*-- GLOBAL VARS
    ================================================== --*/

let fullRecords
let options = {}
let chart

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

const setOptions = records => {
	const useable = getUsableRecords(records)
	const options = useable.map(k => {
		return `<option value="${k[0]}">${k[0]}</option>`
	})

	options.unshift(`<option value="all">View All</option>`)

	document.querySelector('#challenges').innerHTML = options
}

const sortRecords = records => {
	const sortedRecords = {}
	Object.values(records).map(v => {
		if (!sortedRecords[v.name]) {
			sortedRecords[v.name] = [v]
		} else {
			sortedRecords[v.name] = [...sortedRecords[v.name], v]
		}
	})
	return sortedRecords
}

const resetClickEvent = (e, legend) => {
	const obj = chart.data.datasets
	const key = Object.keys(obj).find(k => obj[k]['label'] === legend.text)

	obj[key]['hidden'] = obj[key]['hidden'] ? false : true

	chart.update()
}

//finds the useable dates ... we're not showing anything that only has 1 data point
const getUsableRecords = fullRecords => {
	let use = Object.entries(fullRecords).filter(([_, k]) => k.length > 1)
	console.log(use)
	return use
}

const buildLabels = records => {
	let dates = []

	for (const arr of records) {
		dates.push(...arr[1])
	}
	//get unique dates and sort
	dates = [...new Set(Object.values(dates).map(item => item.date))]
	dates = dates.sort()

	//set up viewable dates fror the labels
	const labels = dates.map(v => {
		let dateView = luxon.DateTime.fromISO(v.replaceAll('.', '-'))

		return dateView.toLocaleString({
			month: 'short',
			day: '2-digit',
		})
	})

	return {
		dates: dates,
		labels: labels,
	}
}

const buildDataset = (records, labels) => {
	return records.map(item => {
		let obj = {}
		const randomBetween = (min, max) =>
			min + Math.floor(Math.random() * (max - min + 1))
		const r = randomBetween(0, 255)
		const g = randomBetween(0, 255)
		const b = randomBetween(0, 255)

		obj.label = item[0]
		obj.fill = false
		obj.hidden = false
		obj.borderColor = `rgb(${r}, ${g}, ${b})`
		obj.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.5)`
		obj.tension = 0

		obj.data = labels.dates.map(d => {
			let results = item[1].filter(v => v.date === d)
			if (results.length > 1) {
				return results[0].score
			}
			if (results.length === 1) {
				let high = results.reduce((prev, current) => {
					return prev.score > current.score ? prev : current
				})
				return high.score
			}
			if (!results) {
				return false
			}
		})

		return obj
	})
}

const displayChart = records => {
	const useable = getUsableRecords(records)
	const labels = buildLabels(useable)
	const dataset = buildDataset(useable, labels)

	const ctx = document.querySelector('#progress').getContext('2d')
	const options = {
		spanGaps: true,
		responsive: true,
		maintainAspectRatio: false,
	}
	const data = {
		labels: labels.labels,
		datasets: dataset,
		plugins: {
			legend: {
				align: 'left',
			},
		},
	}

	chart = new Chart(ctx, {
		type: 'line',
		data: data,
		options: options,
	})
	Chart.defaults.plugins.legend.onClick = resetClickEvent
}

const updateCharts = records => {
	const useable = getUsableRecords(records)
	const labels = buildLabels(useable)
	const dataset = buildDataset(useable, labels)

	console.log(labels)

	chart.data.labels = labels.labels
	chart.data.datasets = dataset

	chart.update()
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
		document.querySelector('header').classList.add('maximized')
		window.api.maximize()
	}
	if (id === 'btnRestore') {
		document.querySelector('header').classList.remove('maximized')
		window.api.restore()
	}

	if (id === 'btnMin') {
		window.api.minimize()
	}

	if (id === 'restartToUpdate') {
		window.api.send('restartToUpdate')
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

document.addEventListener('change', e => {
	if (e.target.id === 'challenges') {
		let solo = e.target.value

		chart.data.datasets.forEach(dataset => {
			dataset.hidden = dataset.label === solo ? false : true
			dataset.hidden = solo === 'all' ? false : dataset.hidden
		})

		chart.update()
	}
})

/*-- MESSAGES
    ================================================== --*/

window.api.receive('authClosed', () => {})

window.api.receive('alternateMaximize', () => {
	document.querySelector('header').classList.add('maximized')
})

window.api.receive('alternateRestore', () => {
	document.querySelector('header').classList.remove('maximized')
})

window.api.receive('recordedAdded', payload => {
	//displayed added notification
	const container = document.querySelector('#added')
	const data = Object.values(payload.newRecord)
	const score = Math.round(data[0].score * 100) / 100

	container.innerHTML = `<img src="./icons/check.svg" />Added ${data[0].name} Score: ${score}`
	container.classList.add('show')

	const sortedRecords = sortRecords(payload.records)
	updateCharts(sortedRecords)
})

window.api.receive('initProgress', records => {
	const sortedRecords = sortRecords(records)
	setOptions(sortedRecords)
	displayChart(sortedRecords)
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

window.api.receive('updateAvailable', () => {
	document.querySelector('#update').innerHTML = 'Downloading Update'

	document.querySelector('#update').classList.add('show')
	document.querySelector('#downloading').classList.add('show')
})

window.api.receive('updateDownloaded', () => {
	document.querySelector('#update').innerHTML =
		'<a id="restartToUpdate">Update available. Restart to update <img src="./icons/refresh.svg" alt="restart" /> </a>'

	document.querySelector('#update').classList.add('ui-green')

	document.querySelector('#downloading').classList.remove('show')
})
