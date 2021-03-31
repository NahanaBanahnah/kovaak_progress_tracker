'use strict'

const { app, BrowserWindow, ipcMain, session  } = require('electron')

const path = require('path')

const Authenticate = require(path.join(__dirname, 'models', 'authenticate.js'))

let windows = {}

const authenticate = new Authenticate(windows, session)

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
            console.log(payload)
        break
        case 'openAuth' :
            openAuth()
        break
    }
})

app.whenReady().then(() => {
    createWindows()

    if(!authenticate.isAuthenticated()) {
        windows.main.loadFile(path.join(__dirname, 'app', 'login.html'))
    }
    windows.main.show()     

})


