const {
	app,
	BrowserWindow,
	ipcMain,
	dialog,
	Menu,
	Tray,
	Notification,
	shell,
} = require('electron')

const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs').promises
const storage = require('electron-settings')
storage.configure({
	fileName: 'settings.json',
	prettify: true,
})

const marked = require('marked')

const Settings = require(path.join(__dirname, 'models', 'Settings.js'))
const Home = require(path.join(__dirname, 'models', 'Home.js'))

const windows = {}
let tray = null

const settings = new Settings()
const home = new Home(windows)

// ---------- create the main window and auth modal  ---------- //
const createWindows = () => {
	const mainWindow = new BrowserWindow({
		width: 1600,
		height: 900,
		center: true,
		frame: false,
		show: false,
		backgroundColor: '#FFF',
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
		},
	})
	windows.main = mainWindow

	const modal = new BrowserWindow({
		modal: true,
		show: false,
		parent: mainWindow,
		width: 800,
		height: 800,
	})
	windows.modal = modal
	windows.modal.setMenuBarVisibility(false)

	const changelog = new BrowserWindow({
		modal: true,
		show: false,
		frame: false,
		parent: mainWindow,
		width: 800,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
		},
	})

	windows.changelog = changelog

	windows.main.loadFile(path.join(__dirname, 'app', 'main.html'))
	windows.changelog.loadFile(path.join(__dirname, 'app', 'changelog.html'))
}

// ---------- checking for updates ---------- //
const checkForUpdates = () => {
	autoUpdater.checkForUpdatesAndNotify()
}

// ---------- only allow one instance ---------- //
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
	app.quit()
} else {
	app.on('second-instance', () => {
		// Someone tried to run a second instance, we should focus our window.
		if (windows.main) {
			if (windows.main.isMinimized()) windows.main.restore()
			windows.main.focus()
		}
	})

	app.whenReady().then(() => {
		// ---------- make the windows ---------- //
		createWindows()

		// ---------- create the tray icon ---------- //
		tray = new Tray(
			path.join(__dirname, 'app', 'icons', 'tray', 'icon.png')
		)

		const contextMenu = Menu.buildFromTemplate([
			{
				label: 'Show App',
				click() {
					windows.main.show()
				},
			},
			{
				label: 'Quit',
				click() {
					windows.main.destroy()
					app.quit()
				},
			},
		])
		tray.setToolTip('Kovaak Progress Tracker')
		tray.setContextMenu(contextMenu)

		// ---------- on DOM load the main window  ---------- //
		windows.main.once('ready-to-show', async () => {
			const userVersion = await storage.get('settings.version')
			if (!userVersion || userVersion < app.getVersion()) {
				await showChangelog()
				windows.changelog.show()
				storage.set('settings.version', app.getVersion())
			}

			windows.main.show()

			checkForUpdates()
			setInterval(checkForUpdates, 1000 * 60 * 15)

			//are the user users settings set?
			const settingsSet = await settings.settingsSet()

			//there are not settings so lets have them enter their settings
			if (!settingsSet) {
				sendContent('home', 'settings', true)
			} else {
				//there are settings so take them home
				sendContent('home', 'home')
				home.initWatch()
			}
		})

		// ---------- handle max and restore caused by things other than the buttons (double click, drag, etc) ---------- //
		windows.main.on('maximize', () => {
			windows.main.send('alternateMaximize')
		})
		windows.main.on('unmaximize', () => {
			windows.main.send('alternateRestore')
		})

		// ---------- hide modal on close button ---------- //
		windows.modal.on('close', event => {
			event.preventDefault()
			windows.modal.hide()
		})

		// ---------- forward links from changelog to browser ---------- //
		windows.changelog.webContents.on('will-navigate', handleRedirect)
	})
}
/*-- IPC PING PONG
    ================================================== --*/

// ---------- General Sending ---------- //
ipcMain.on('openFileBrowser', () => openFileDialog())
ipcMain.on('saveSettings', (e, payload) => {
	settings.saveSettings(payload)

	//if its the first start init home here, and pass in the database & save here
	//this eliminates the possibility of trying to start this before the settings are saved
	if (payload.initial) {
		home.initWatch(payload.saveDirectory, payload.database)
	}
})

// ---------- Window Buttons ---------- //
ipcMain.on('close', async event => {
	event.preventDefault()
	findWindow(event).hide()

	const notified = await storage.get('settings.notified')

	if (!notified) {
		const notification = {
			title: 'Your Progress Is Still Be Tracked',
			body: 'Kovaak Tracker Will Continue To Run In The Background',
		}
		new Notification(notification).show()

		storage.set('settings.notified', true)
	}
})
ipcMain.on('minimize', event => findWindow(event).minimize())
ipcMain.on('maximize', event => findWindow(event).maximize())
ipcMain.on('restore', event => findWindow(event).restore())

ipcMain.handle('getColors', async () => {
	return await storage.get('colors')
})

ipcMain.handle('setColors', async (e, payload) => {
	return await storage.set('colors', payload)
})

// ---------- updating ---------- //

autoUpdater.on('update-available', () => {
	windows.main.send('updateAvailable')
})
autoUpdater.on('update-downloaded', () => {
	windows.main.send('updateDownloaded')
})

ipcMain.on('restartToUpdate', () => {
	autoUpdater.quitAndInstall()
})

ipcMain.on('openChangelog', async () => {
	await showChangelog()
	windows.changelog.show()
})

/*-- HELPER FUNCTIONS
    ================================================== --*/

//find the event sender
const findWindow = event => {
	return BrowserWindow.fromWebContents(event.sender)
}
//tiny templating
const sendContent = async (file, section = false, initial = false) => {
	let userSettings = await settings.getSettings()

	const html = await fs.readFile(
		path.join(__dirname, 'app', 'html', `${file}.html`),
		'utf8'
	)
	const payload = {
		...userSettings,
		html: html,
		section: section,
		initial: initial,
		version: app.getVersion(),
	}
	windows.main.send('loadContent', payload)
}

const showChangelog = async () => {
	const md = await fs.readFile(path.join(__dirname, 'CHANGELOG.md'), 'utf8')
	marked(md)
	windows.changelog.send('initChangelog', marked(md))
}

//file browser
const openFileDialog = () => {
	dialog
		.showOpenDialog({
			properties: ['openDirectory'],
			title: 'Browse For Your Kovaak Instalation Directory',
		})
		.then(async file => {
			if (!file.canceled) {
				const dir = path.join(
					file.filePaths[0],
					'FPSAimTrainer',
					'stats'
				)
				try {
					await fs.stat(dir)
					windows.main.send('folderSelect', {
						case: 'filePicked',
						file: file.filePaths,
					})
				} catch (error) {
					windows.main.send('folderSelect', {
						case: 'filePicked',
						file: file.filePaths,
						error: error,
					})
				}
			}
		})
}

//changelog parser
const renderer = {
	heading(text, level) {
		if (level === 4) {
			let date = text.match(/\((.*)\)/).pop()
			let dateObj = new Date(date)
			let display = dateObj.toLocaleString('default', {
				month: 'short',
				year: 'numeric',
				day: 'numeric',
			})
			let version = text.split(' ').shift()

			return `
            <h${level} class="version">Version ${version}</h${level}>
            <h${level} class="date">${display}</h${level}>`
		} else {
			return `<h${level}>${text}</h${level}>`
		}
	},
}
marked.use({ renderer })

//forward links to browser
const handleRedirect = (e, url) => {
	if (url !== e.sender.getURL()) {
		e.preventDefault()
		shell.openExternal(url)
	}
}

// ---------- UNCOMMENT ONLY WHEN WORKING ON UI  ---------- //
// ipcMain.on('sendContent', () => {
// 	sendContent('home', 'home')
// 	home.initWatch()
// })

// ipcMain.on('sendContent', () => {
// 	fs.readFile(path.join(__dirname, 'CHANGELOG.md'), 'utf8', (err, md) => {
// 		marked(md)
// 		windows.changelog.send('initChangelog', marked(md))
// 	})
// })
