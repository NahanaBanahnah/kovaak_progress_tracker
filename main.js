const {
	app,
	BrowserWindow,
	ipcMain,
	session,
	dialog,
	Menu,
	Tray,
} = require('electron')

const path = require('path')
const fs = require('fs')
const Authenticate = require(path.join(__dirname, 'models', 'Authenticate.js'))
const Settings = require(path.join(__dirname, 'models', 'Settings.js'))
const Home = require(path.join(__dirname, 'models', 'Home.js'))

const windows = {}
let tray = null

const authenticate = new Authenticate(windows, session)
const settings = new Settings()

// create the main window and the auth modal
const createWindows = () => {
	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
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

app.whenReady().then(() => {
	//create the windows
	createWindows()

	//create the tray
	tray = new Tray(path.join(__dirname, 'app', 'icons', 'tray', 'icon.png'))

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

	//load main window with loading bar once the DOM is ready
	windows.main.once('ready-to-show', () => {
		windows.main.show()

		//check if the user is authnticated
		//if yes check if they have settings
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

	windows.main.on('close', e => {
		e.preventDefault()
		windows.main.hide()
	})
})

/*-- IPC PING PONG
    ================================================== --*/

// ---------- General Sending ---------- //
ipcMain.on('openAuth', () => authenticate.openAuth())
ipcMain.on('openFileBrowser', () => openFileDialog())
ipcMain.on('saveSettings', (e, payload) => settings.saveSettings(payload))

/*-- HELPER FUNCTIONS
    ================================================== --*/
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
				const stat = fs.stat(dir, (error, stats) => {
					if (error) {
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
