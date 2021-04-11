const { rejects } = require('assert')
const { resolve } = require('url')
const storage = require('electron-settings')

module.exports = class Settings {
	// ---------- check if the user has the min settings needed ---------- //
	settingsSet = async () => {
		const saveDirectory = await storage.get('settings.saveDirectory')
		const database = await storage.get('settings.database')

		if (!saveDirectory || !database) {
			return false
		} else {
			return {
				saveDirectory: saveDirectory,
				database: database,
			}
		}
	}

	// ---------- save users settings ---------- //
	saveSettings = async payload => {
		payload.database += payload.database.endsWith('/') ? '' : '/'
		await storage.set('settings.saveDirectory', payload.saveDirectory)
		await storage.set('settings.database', payload.database)
		return
	}

	// ---------- get the users settings ---------- //
	getSettings = async () => {
		let saveDirectory = await storage.get('settings.saveDirectory')
		let database = await storage.get('settings.database')
		return {
			saveDirectory: saveDirectory,
			database: database,
		}
	}
}
