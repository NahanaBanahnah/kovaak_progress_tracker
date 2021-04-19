import Records from './class.Records.js'
import chartOptions from './config.chart.js'

export default class Charts extends Records {
	constructor() {
		super()
	}

	initProgress = payload => {
		this.userPrefs = payload.prefs ? payload.prefs : []

		this.sortRecords(payload.records)
		this.displayChart()
		this.setOptions()
	}

	displayChart = async () => {
		const labels = this.buildLabels()
		const dataset = await this.buildDataset(labels)

		const ctx = document.querySelector('#progress').getContext('2d')
		const data = {
			labels: labels.labels,
			datasets: dataset,
		}

		this.chart = new Chart(ctx, {
			type: 'line',
			data: data,
			options: chartOptions,
		})
		Chart.defaults.plugins.legend.onClick = this.resetClickEvent
	}

	updateCharts = async payload => {
		this.sortRecords(payload)

		const labels = this.buildLabels()
		const dataset = await this.buildDataset(labels)
		this.chart.data.labels = labels.labels
		this.chart.data.datasets = dataset
		this.chart.update()
		this.setOptions()
	}

	//build the chart labels
	buildLabels = () => {
		let dates = []

		for (const array of this.records) {
			dates.push(...array.data)
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
	buildDataset = async labels => {
		let obj = []
		let i = 0

		for (const array of this.records) {
			const c = await this.getColors(array.title)

			let prefKey = Object.keys(this.userPrefs).find(
				k => this.userPrefs[k].title === array.title
			)

			let hidden = this.userPrefs[prefKey].hidden
			let label = hidden ? `${array.title}-hideme` : array.title

			obj[i] = {}
			obj[i].label = label
			obj[i].fill = false
			obj[i].hidden = hidden
			obj[i].borderColor = `rgb(${c.r}, ${c.g}, ${c.b})`
			obj[i].backgroundColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.5)`
			obj[i].tension = 0

			obj[i].data = labels.dates.map(d => {
				let results = array.data.filter(v => v.date === d)

				//find the highest score for the entries
				if (results.length === 1) {
					return results[0].score
				}
				if (results.length > 1) {
					let high = results.reduce((prev, current) => {
						return prev.score > current.score ? prev : current
					})
					return high.score
				}
				if (!results) {
					return false
				}
			})
			i++
		}
		obj.sort((a, b) => a.label.localeCompare(b.label))
		return obj
	}

	//dropdown options
	setOptions = () => {
		let records = { ...this.records }
		records = Object.values(records).sort((a, b) =>
			a.title.localeCompare(b.title)
		)

		records = records.filter(ele => !ele.prefs.hidden)

		const options = records.map(k => {
			return `<option value="${k.title}">${k.title}</option>`
		})

		options.unshift(`<option value="all">View All</option>`)
		document.querySelector('#challenges').innerHTML = options
	}

	setSingleView = toView => {
		this.chart.data.datasets.forEach(dataset => {
			dataset.hidden = dataset.label === toView ? false : true
			dataset.hidden = toView === 'all' ? false : dataset.hidden
		})

		this.chart.update()
	}

	//reset the default charjs click in the legend
	resetClickEvent = (e, legend) => {
		const obj = chart.data.datasets
		const key = Object.keys(obj).find(k => obj[k]['label'] === legend.text)

		obj[key]['hidden'] = obj[key]['hidden'] ? false : true

		this.chart.update()
	}

	openCustomize = async () => {
		//get the prefs and order them
		let userPrefs = { ...this.userPrefs }

		userPrefs = Object.values(userPrefs).sort((a, b) => {
			a.hidden = a.hidden ? a.hidden : false
			b.hidden = b.hidden ? b.hidden : false
			return a.hidden - b.hidden || a.title.localeCompare(b.title)
		})

		//set some empty vars to use later
		let html = ``
		let colors = ``

		//build the preset color picker colors
		for (const color of this.standard) {
			colors += `<option>${this.RGBToHex(
				color.r,
				color.g,
				color.b
			)}</option>`
		}
		document.querySelector('#colorOptions').innerHTML = colors

		//loop the records
		for (const [k, v] of Object.entries(userPrefs)) {
			//convert rgb to hex for color picker
			let hex = this.RGBToHex(v.color.r, v.color.g, v.color.b)

			//find the key of the chart dataset
			let object = this.chart.data.datasets
			let dataKey = Object.keys(object).find(
				k =>
					object[k].label === v.title ||
					object[k].label === `${v.title}-hideme`
			)

			//set options based on if the records is hidden or not
			let rowClass = v.hidden ? ['row', 'hide'] : ['row']
			let icon = v.hidden ? 'visibility_off' : 'visibility'
			let data = v.hidden ? 'data-hide="true"' : ''

			//build the display settings
			let preview = `<span style="background-color: ${hex}" data-func="preview"></span>`
			let picker = `<input type="color" value="${hex}" list="colorOptions" data-func="colorChange" />`
			let hide = `<span class="material-icons" data-func="hide">${icon}</span>`

			html += `<div class="${rowClass.join(
				' '
			)}" data-key="${dataKey}" data-pref="${k}" data-title="${
				v.title
			}" ${data}>`
			html += `<div class="title">${v.title}</div>`
			html += `<div class="preview">${preview}</div>`
			html += `<div class="picker">${picker}</div>`
			html += `<div class="view">${hide}</div>`
			html += `</div>`
		}

		document.querySelector('#customizeContainer').innerHTML = html
	}

	showHideRecord = async ele => {
		//chanage dataset so we cant double click
		ele.dataset.func = 'wait'

		//find the parent // set keys to find in the arrays // set toggle states
		let parent = ele.closest('div.row')
		let key = parent.dataset.key
		let prefKey = parent.dataset.pref
		let hide = parent.dataset.hide
		let icon = hide ? 'visibility' : 'visibility_off'
		let pref = hide ? false : true

		//run different function depending on the current state
		//add or remove -hideme so the lable gets removed from the legend
		let data = hide
			? () => {
					delete parent.dataset.hide
					parent.classList.remove('hide')

					this.chart.data.datasets[
						key
					].label = this.chart.data.datasets[key].label.replace(
						'-hideme',
						''
					)
					this.chart.data.datasets[key].hidden = false
			  }
			: () => {
					parent.dataset.hide = 'true'
					parent.classList.add('hide')
					this.chart.data.datasets[
						key
					].label = `${this.chart.data.datasets[key].label}-hideme`
					this.chart.data.datasets[key].hidden = true
			  }

		//chnage the icon // run the function
		ele.innerHTML = icon
		data()

		// set and store the prefs
		this.chart.update()
		this.userPrefs[prefKey].hidden = pref
		const rKey = Object.keys(this.records).find(
			k => this.records[k].title === parent.dataset.title
		)
		this.records[rKey].prefs.hidden = pref
		await window.api.setColors(this.userPrefs)

		//turn the button back on // update the dropdown menu
		ele.dataset.func = 'hide'
		this.setOptions()
		return true
	}

	getChart = () => {
		return this.chart
	}

	setColorChange = ele => {
		let parent = ele.closest('div.row')
		let k = parent.dataset.key
		let pref = parent.dataset.pref

		this.userPrefs[pref].color = { ...this.hexToRGB(ele.value) }
		const rKey = Object.keys(this.records).find(
			k => this.records[k].title === parent.dataset.title
		)
		this.records[rKey].prefs.color = { ...this.hexToRGB(ele.value) }
		this.chart.data.datasets[k].borderColor = ele.value
		this.chart.data.datasets[k].backgroundColor = `${ele.value}80`
		this.chart.update()
		window.api.setColors(this.userPrefs)
	}

	RGBToHex = (r, g, b) => {
		r = r.toString(16)
		g = g.toString(16)
		b = b.toString(16)

		if (r.length == 1) r = '0' + r
		if (g.length == 1) g = '0' + g
		if (b.length == 1) b = '0' + b

		return '#' + r + g + b
	}

	hexToRGB = hex => {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16),
			  }
			: null
	}
}
