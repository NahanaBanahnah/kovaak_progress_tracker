const { ipcRenderer  } = require('electron')

module.exports = class IPSend {
    static sendToMain = (name, payload) => {
        const sendData = {case : name, ...payload}
        ipcRenderer.send('ipSend', sendData)
    }
}