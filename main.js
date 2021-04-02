'use strict'

const { app, BrowserWindow, ipcMain, session, dialog   } = require('electron')

const path = require('path')

const Authenticate = require(path.join(__dirname, 'models', 'Authenticate.js'))
const Settings = require(path.join(__dirname, 'models', 'Settings.js'))
const Home = require(path.join(__dirname, 'models', 'Home.js'))

let windows = {}

const authenticate = new Authenticate(windows, session)
const settings = new Settings()
const home = new Home(windows)


const createWindows = () => {
    let mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        }
    })
    windows.main = mainWindow

    let modal = new BrowserWindow({
        modal: true,
        show: false,     
        parent: mainWindow,
        width: 800,
        height: 800,   
    })
    windows.modal = modal
}

const openAuth = () => {
    authenticate.openAuth()  
}

ipcMain.on('toMain', (e, payload) => {
    switch(payload.case) {
        default :

        break
        case 'openAuth' :
            openAuth()
        break
        case 'fileBrowser' :
            dialog.showOpenDialog({ 
                properties: ['openDirectory'],
                title: 'Browse For Your Kovaak Instalation Directory'                
            }).then(file => {
                if(!file.canceled) {
                    windows.main.send('fromMain', {case : 'filePicked', file : file.filePaths })
                }
            })
        break
        case 'saveSettings' :
            settings.saveSettings(payload)
        break
    }
})

app.whenReady().then(() => {
    createWindows()

    authenticate.isAuthenticated()
    .then(isAuthenticated => {
        if(!settings.settingsSet()) {
            windows.main.loadFile(path.join(__dirname, 'app', 'Settings', 'settings.html'))
        } else {
            windows.main.loadFile(path.join(__dirname, 'app', 'Home', 'home.html'))
            home.initWatch()
        }        
        windows.main.show()
    }).catch(e => {
        windows.main.loadFile(path.join(__dirname, 'app', 'Login', 'login.html'))
        windows.main.show()
    }) 
})


