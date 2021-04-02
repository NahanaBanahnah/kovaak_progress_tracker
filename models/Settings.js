const { rejects } = require('assert')
const Store = require('electron-store')
const { resolve } = require('url')
const store = new Store({ name : 'config.main' })

module.exports = class Settings {
    settingsSet = () => {
        const saveDirectory = store.get('saveDirectory')
        const database = store.get('database') 
       
        if(!saveDirectory || !database) { return false }
        else { return true }
    }
    saveSettings = (payload) => {
        store.set('saveDirectory', payload.saveDirectory)
        store.set('database', payload.database)  
    }
}