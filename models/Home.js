const axios = require('axios').default
const path = require('path')
const fs = require('fs')
const storage = require('electron-settings')

const chokidar = require('chokidar')
const neatCsv = require('neat-csv')

module.exports = class Home {
	constructor(windows = null) {
		this.windows = windows
		this.saveDirectory = null
		this.database = null
		this.user = null
		this.records = null
	}

	// ---------- start the watching ---------- //

	initWatch = async (saveDirectory = null, database = null) => {
		//set some settings as they aren't always set
		this.saveDirectory = saveDirectory
			? saveDirectory
			: await storage.get('settings.saveDirectory')
		this.database = database
			? database
			: await storage.get('settings.database')
		this.user = await storage.get('auth.id')
		this.watchPath = path.join(this.saveDirectory, 'FPSAimTrainer', 'stats')
		this.records = await this.getRecords()

		//tell main we're watching
		this.windows.main.send('initProgress', this.records)

		//watch the directory
		chokidar.watch(this.watchPath).on('add', async path => {
			let name = this.formatName(path)

			if (
				!Object.entries(this.records).find(
					([_, v]) => v.file === name.file
				)
			) {
				let newRecord = await this.addRecord(path, name)
				this.windows.main.send('recordedAdded', {
					newRecord: newRecord,
					records: this.records,
				})
			}
		})
	}

	// ---------- get the users records or return an empty obj ---------- //
	getRecords = () => {
		return new Promise(resolve => {
			axios
				.get(
					`${this.database}/progress.json?orderBy="user"&equalTo="${this.user}"`
				)
				.then(res => {
					resolve(res.data)
				})
				.catch(e => {
					resolve({})
				})
		})
	}

	// ---------- when a record is added push to db ---------- //
	addRecord = async (path, name) => {
		let score = await this.findScore(path)
		let payload = {
			...name,
			...score,
			user: this.user,
		}
		return new Promise(resolve => {
			axios
				.post(`${this.database}/progress.json`, payload)
				.then(res => {
					let added = {}
					added[res.data.name] = { ...payload }

					this.records = {
						...this.records,
						...added,
					}
					resolve(added)
				})
				.catch(e => {
					console.log(e.error)
				})
		})
	}

	// ---------- pull info from the name ---------- //
	formatName = name => {
		const main = path.parse(name).base.split('-')
		const file = {
			file: path.parse(name).base,
			name: main[0].trim(),
			date: main[2].trim(),
			time: main[3].replace('Stats.csv', '').trim(),
		}
		return file
	}

	// ---------- find the score in the csv file ---------- //
	findScore = file => {
		return new Promise(resolve => {
			fs.readFile(file, (error, data) => {
				if (error) {
					return console.log('error reading file')
				}
				neatCsv(data)
					.then(parsedData => {
						const score = parsedData.filter(obj =>
							Object.keys(obj).some(key =>
								obj[key].includes('Score:')
							)
						)
						resolve({ score: score[0].Timestamp })
					})
					.catch(e => console.log(e))
			})
		})
	}
}
