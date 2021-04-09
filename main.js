const {
	app,
	BrowserWindow,
	ipcMain,
	session,
	dialog,
	Menu,
	Tray,
	Notification,
} = require('electron')

const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')
const store = new Store({ name: 'config.main' })

const Authenticate = require(path.join(__dirname, 'models', 'Authenticate.js'))
const Settings = require(path.join(__dirname, 'models', 'Settings.js'))
const Home = require(path.join(__dirname, 'models', 'Home.js'))

const windows = {}
let tray = null

const authenticate = new Authenticate(windows, session)
const settings = new Settings()

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

	windows.main.loadFile(path.join(__dirname, 'app', 'main.html'))
}

// ---------- checking for updates ---------- //
const checkForUpdates = () => {
	autoUpdater.checkForUpdatesAndNotify()
	console.log('checking updates')
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
		windows.main.once('ready-to-show', () => {
			windows.main.show()
			checkForUpdates()
			setInterval(checkForUpdates, 1000 * 60 * 15)

			//check if the user is authnticated
			//if yes check if they have settings // if they don't open the settings page for initial setup
			//if no open the auth

			authenticate
				.isAuthenticated()
				.then(() => {
					if (!settings.settingsSet()) {
						sendContent('home', 'settings', true)
					} else {
						const home = new Home(windows)
						sendContent('home', 'home')
						home.initWatch()
					}
				})
				.catch(() => sendContent('login'))
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
	})
}
/*-- IPC PING PONG
    ================================================== --*/

// ---------- General Sending ---------- //
ipcMain.on('openAuth', () => authenticate.openAuth())
ipcMain.on('openFileBrowser', () => openFileDialog())
ipcMain.on('saveSettings', (e, payload) => {
	settings.saveSettings(payload)

	//if its the first start init home here, and pass in the database & save here
	//this eliminates the possibility of trying to start this before the settings are saved
	if (payload.initial) {
		const home = new Home(windows, payload.database, payload.saveDirectory)
		home.initWatch()
	}
})

// ---------- Window Buttons ---------- //
ipcMain.on('close', event => {
	event.preventDefault()
	findWindow(event).hide()

	const notified = store.get('notified')
	if (!notified) {
		const notification = {
			title: 'Your Progress Is Still Be Tracked',
			body: 'Kovaak Tracker Will Continue To Run In The Background',
		}
		new Notification(notification).show()

		store.set('notified', true)
	}
})
ipcMain.on('minimize', event => findWindow(event).minimize())
ipcMain.on('maximize', event => findWindow(event).maximize())
ipcMain.on('restore', event => findWindow(event).restore())

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

/*-- HELPER FUNCTIONS
    ================================================== --*/

//find the event sender
const findWindow = event => {
	return BrowserWindow.fromWebContents(event.sender)
}
//tiny templating
const sendContent = (file, section = false, initial = false) => {
	fs.readFile(
		path.join(__dirname, 'app', 'html', `${file}.html`),
		'utf8',
		(err, html) => {
			const payload = {
				...authenticate.getUserInfo(),
				...settings.getSettings(),
				html: html,
				section: section,
				initial: initial,
				version: app.getVersion(),
			}
			windows.main.send('loadContent', payload)
		}
	)
}

//file browser
const openFileDialog = () => {
	dialog
		.showOpenDialog({
			properties: ['openDirectory'],
			title: 'Browse For Your Kovaak Instalation Directory',
		})
		.then(file => {
			if (!file.canceled) {
				const dir = path.join(
					file.filePaths[0],
					'FPSAimTrainer',
					'stats'
				)
				let error = false
				fs.stat(dir, (err, stats) => {
					if (err) {
						error = true
					}
					windows.main.send('folderSelect', {
						case: 'filePicked',
						file: file.filePaths,
						error: error,
					})
				})
			}
		})
}
