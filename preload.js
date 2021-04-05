const { contextBridge, ipcRenderer } = require('electron')

const path = require('path')
const validChannels = [
	'loadContent',
	'folderSelect',
	'openAuth',
	'openFileBrowser',
	'saveSettings',
	'authClosed',
	'recordedAdded',
	'alternateMaximize',
	'alternateRestore',
]

contextBridge.exposeInMainWorld('api', {
	send: (channel, data) => {
		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data)
		}
	},
	receive: (channel, func) => {
		if (validChannels.includes(channel)) {
			ipcRenderer.on(channel, (event, ...args) => func(...args))
		}
	},
	close: () => ipcRenderer.send('close'),
	maximize: () => ipcRenderer.send('maximize'),
	minimize: () => ipcRenderer.send('minimize'),
	restore: () => ipcRenderer.send('restore'),
})

//let currWindow = remote.BrowserWindow.getFocusedWindow()
// let parentWindow = remote.getCurrentWindow()
