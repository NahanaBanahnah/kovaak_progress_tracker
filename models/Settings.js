const { rejects } = require('assert')
const Store = require('electron-store')
const { resolve } = require('url')
const store = new Store({ name: 'config.main' })

module.exports = class Settings {
	// ---------- check if the user has the min settings needed ---------- //
	settingsSet = () => {
		const saveDirectory = store.get('saveDirectory')
		const database = store.get('database')

		if (!saveDirectory || !database) {
			return false
		} else {
			return true
		}
	}

	// ---------- save users settings ---------- //
	saveSettings = payload => {
		payload.database += payload.database.endsWith('/') ? '' : '/'
		store.set('saveDirectory', payload.saveDirectory)
		store.set('database', payload.database)
	}

	// ---------- get the users settings ---------- //
	getSettings = () => {
		return {
			saveDirectory: store.get('saveDirectory'),
			database: store.get('database'),
		}
	}
}
