const { contextBridge, ipcRenderer } = require('electron')
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
	'records',
	'initProgress',
	'updateAvailable',
	'updateDownloaded',
	'restartToUpdate',
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
	getColors: async () => await ipcRenderer.invoke('getColors'),
	setColors: async payload => await ipcRenderer.invoke('setColors', payload),
})

//let currWindow = remote.BrowserWindow.getFocusedWindow()
// let parentWindow = remote.getCurrentWindow()
