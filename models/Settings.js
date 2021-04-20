const storage = require('electron-settings')

module.exports = class Settings {
	// ---------- check if the user has the min settings needed ---------- //
	settingsSet = async () => {
		const saveDirectory = await storage.get('settings.saveDirectory')

		if (!saveDirectory) {
			return false
		} else {
			return {
				saveDirectory: saveDirectory,
			}
		}
	}

	// ---------- save users settings ---------- //
	saveSettings = async payload => {
		await storage.set('settings.saveDirectory', payload.saveDirectory)
		return
	}

	// ---------- get the users settings ---------- //
	getSettings = async () => {
		let saveDirectory = await storage.get('settings.saveDirectory')
		return {
			saveDirectory: saveDirectory,
		}
	}
}
