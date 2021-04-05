const { contextBridge, ipcRenderer } = require('electron')

const path = require('path')
const validChannels = ['fromMain', 'toMain', 'loadContent', 'folderSelect']

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
	close: () => {
		window.close()
	},
	maximize: () => {
		ipcRenderer.maximize()
	},
})

//let currWindow = remote.BrowserWindow.getFocusedWindow()
// let parentWindow = remote.getCurrentWindow()
