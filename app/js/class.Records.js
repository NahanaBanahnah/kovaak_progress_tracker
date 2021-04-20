import { standard, material } from './config.colors.js'

export default class Records {
	constructor() {
		this.chart = null
		this.userPrefs = null
		this.records = null
		this.ac = { standard: { ...standard }, material: { ...material } }
		this.standard = standard
	}

	//build a nice data list
	sortRecords = records => {
		const sortedRecords = {}
		let recs = []

		//first lets combine the records by type
		Object.values(records).map(v => {
			if (!sortedRecords[v.name]) {
				sortedRecords[v.name] = [v]
			} else {
				sortedRecords[v.name] = [...sortedRecords[v.name], v]
			}
		})

		//now filter them out if theres one a single entry
		const filteredRecords = Object.fromEntries(
			Object.entries(sortedRecords).filter(([_, k]) => k.length > 1)
		)
		console.log(filteredRecords)

		//finally combine the records and the user prefs (colors, hidden)
		for (const [k, v] of Object.entries(filteredRecords)) {
			let pref = this.userPrefs.find(item => item.title === k)
			let obj = {
				title: k,
				data: v,
				prefs: pref ? pref : {},
			}
			recs.push(obj)
		}

		//now set a global to use everywhere
		this.records = recs
	}

	getColors = async title => {
		let custom = true
		let color

		//see if the title is in store
		let d = this.userPrefs.find(item => item.title === title)

		//if it is remove it from appropriate object (so it doenst duplicate)
		if (d) {
			if (d.pallet !== 'custom') {
				this.ac[d.pallet] = {
					...this.setAvailableColors(d.pallet, d.color),
				}
			}
			return d.color
		}

		//if its not check length of standrd and ui (set to a new const so we can see the length of that too)
		let pallet =
			Object.keys(this.ac.standard).length > 0 ? 'standard' : 'material'

		//if that const has a length pallet from that
		if (Object.keys(this.ac[pallet]).length > 0) {
			let obj = this.ac[pallet]
			let keys = Object.keys(obj)
			color = obj[keys[(keys.length * Math.random()) << 0]]

			this.ac[pallet] = { ...this.setAvailableColors(pallet, color) }
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
		this.userPrefs.push(newPref)
		await window.api.setColors(this.userPrefs)

		//then return color as rgb array
		return { ...color }
	}

	setAvailableColors = (pallet, color) => {
		return Object.fromEntries(
			Object.entries(this.ac[pallet]).filter(
				([k, v]) =>
					Object.entries(v).toString() !==
					Object.entries(color).toString()
			)
		)
	}
}
