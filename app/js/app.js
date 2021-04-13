'use strict'
import { standard, ui } from './colors.js'

/*-- GLOBAL VARS
    ================================================== --*/

let chart

let ac = { standard: { ...standard }, material: { ...ui } }

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
		let initial = false

		if (e.target.dataset.initial === 'true') {
			initial = true
		}

		const payload = {
			saveDirectory: folder.value,
			database: database.value,
			initial: initial,
		}
		window.api.send('saveSettings', payload)
		closeSettings()

		if (initial) {
			initialStart()
		}
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
	const container = document.querySelector('#added')
	const data = Object.values(payload.newRecord)
	const score = Math.round(data[0].score * 100) / 100

	container.innerHTML = `<img src="./icons/check.svg" />Added ${data[0].name} Score: ${score}`
	container.classList.add('show')

	const sortedRecords = sortRecords(payload.records)
	updateCharts(sortedRecords)
})

// ---------- INITING  ---------- //

window.api.receive('initProgress', records => {
	const sortedRecords = sortRecords(records)
	setOptions(sortedRecords)
	displayChart(sortedRecords)
})

// ---------- FOLDER SELECT  ---------- //

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
		closeSettings()
	}
	if (payload.section === 'settings') {
		openSettings()
	}
})

// ---------- UPDATE MANAGEMENT  ---------- //

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

/*-- ALL THE FUNCTIONS
    ================================================== --*/

// ---------- form validation (kinda)  ---------- //

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

// ---------- open and close the settings  ---------- //

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

// ---------- PROGRESS SHIZ  ---------- //

//dropdown options
const setOptions = records => {
	const useable = getUsableRecords(records)
	useable.sort((a, b) => a[0].localeCompare(b[0]))

	const options = useable.map(k => {
		return `<option value="${k[0]}">${k[0]}</option>`
	})

	options.unshift(`<option value="all">View All</option>`)

	document.querySelector('#challenges').innerHTML = options
}

//sort the records by date
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

//reset the default charjs click in the legend
const resetClickEvent = (e, legend) => {
	const obj = chart.data.datasets
	const key = Object.keys(obj).find(k => obj[k]['label'] === legend.text)

	obj[key]['hidden'] = obj[key]['hidden'] ? false : true

	chart.update()
}

//finds the useable dates ... we're not showing anything that only has 1 data point
const getUsableRecords = fullRecords => {
	let use = Object.entries(fullRecords).filter(([_, k]) => k.length > 1)
	return use
}

//build the chart labels
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

//set up the dataset
const buildDataset = async (records, labels) => {
	let obj = []
	for (const [k, item] of Object.entries(records)) {
		const color = await getColors(item[0])
		obj[k] = {}

		obj[k].label = item[0]
		obj[k].fill = false
		obj[k].hidden = false
		obj[k].borderColor = `rgb(${color.r}, ${color.g}, ${color.b})`
		obj[k].backgroundColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`
		obj[k].tension = 0

		obj[k].data = labels.dates.map(d => {
			let results = item[1].filter(v => v.date === d)

			// ---------- TODO  ---------- //
			//this logic seems backwards
			//i was tired af when I wrote this...
			// lets look again with fresh eyes
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
	}
	obj.sort((a, b) => a.label.localeCompare(b.label))
	return obj
}

const getColors = async title => {
	let userPrefs = await window.api.getColors()
	userPrefs = userPrefs ? userPrefs : []
	let custom = true
	let color

	//see if the title is in store
	let d = userPrefs.find(item => item.title === title)

	//if it is remove it from appropriate object (so it doenst duplicate)
	if (d) {
		if (d.pallet !== 'custom') {
			ac[d.pallet] = { ...setAvailable(d.pallet, d.color) }
		}

		return d.color
	}

	//if its not check length of standrd and ui (set to a new const so we can see the length of that too)
	let pallet = Object.keys(ac.standard).length > 0 ? 'standard' : 'material'

	//if that const has a length pallet from that
	if (Object.keys(ac[pallet]).length > 0) {
		let obj = ac[pallet]
		let keys = Object.keys(obj)
		color = obj[keys[(keys.length * Math.random()) << 0]]

		ac[pallet] = { ...setAvailable(pallet, color) }
	} else {
		//if not build a custom color
		pallet = 'custom'
		const randomBetween = (min, max) =>
			min + Math.floor(Math.random() * (max - min + 1))
		color = {
			r: randomBetween(0, 255),
			g: randomBetween(0, 255),
			b: randomBetween(0, 255),
		}
	}

	//store the new color with an async invoke handle message
	let newPref = {
		title: title,
		pallet: pallet,
		color: { ...color },
	}
	userPrefs.push(newPref)
	await window.api.setColors(userPrefs)

	//then return color as rgb array
	return { ...color }
}

const setAvailable = (pallet, color) => {
	return Object.fromEntries(
		Object.entries(ac[pallet]).filter(
			([k, v]) =>
				Object.entries(v).toString() !==
				Object.entries(color).toString()
		)
	)
}

//show the chart
const displayChart = async records => {
	const useable = getUsableRecords(records)
	const labels = buildLabels(useable)
	const dataset = await buildDataset(useable, labels)

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
				align: 'start',
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

//update charts when new data is pushed
const updateCharts = async records => {
	const useable = getUsableRecords(records)
	const labels = buildLabels(useable)
	const dataset = await buildDataset(useable, labels)
	chart.data.labels = labels.labels
	chart.data.datasets = dataset

	chart.update()
	setOptions(records)
}

//restore the buttons once the initial startup is done
const initialStart = () => {
	document.querySelector('#submit').dataset.initial = 'false'
	document.querySelector('#back').classList.remove('off')
	document.querySelector('#watching').innerHTML = '...Watching'
}
