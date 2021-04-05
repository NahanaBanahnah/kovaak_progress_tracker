const axios = require('axios').default
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')
const store = new Store({ name: 'config.main' })
const chokidar = require('chokidar')
const neatCsv = require('neat-csv')

module.exports = class Home {
	constructor(windows) {
		this.windows = windows
		this.saveDirectory = store.get('saveDirectory')
		this.watchPath = path.join(this.saveDirectory, 'FPSAimTrainer', 'stats')
		this.database = store.get('database')
		this.user = store.get('id')
		this.records = null
	}

	initWatch = async () => {
		this.records = await this.getRecords()

		chokidar.watch(this.watchPath).on('add', async path => {
			let name = this.formatName(path)

			if (
				!Object.entries(this.records).find(
					([_, v]) => v.file === name.file
				)
			) {
				await this.addRecord(path, name)
				this.windows.main.send('recordedAdded', {
					payload: this.records,
				})
			}
		})
	}

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
					reject(e)
				})
		})
	}

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
					resolve()
				})
				.catch(e => {
					reject(e)
				})
		})
	}

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
