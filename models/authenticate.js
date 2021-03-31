const app = require('electron').app
const path = require('path')
const url = require('url')
const axios = require('axios').default
const Store = require('electron-store')
const store = new Store({ name : 'config.main' })
const config = require(path.join(app.getAppPath(), 'config', 'config.js'))

const redirectUri = 'http://localhost/oauth/redirect'

module.exports = class Authenticate {
    constructor(windows, session) {
        this.windows = windows
        this.session = session
        this.params = {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            scope: 'the scopes'
        }        
    }
    isAuthenticated = () => {
        return false
    }
    openAuth = () => {
        this.windows.modal.loadURL(config.authUrl)
        this.windows.modal.show()
        this.waitForRedirect()        
    }

    waitForRedirect = () => {

        const filter = {
            urls: [redirectUri + '*']
        }

        this.session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {

            const urlObj = url.parse(details.url, true)
            
            if (urlObj.query.code) {
                const accessCode = urlObj.query.code
                this.params.push({ code: accessCode })
                this.windows.modal.close()
                //loging you in message
                
                
                this.windows.main.loadFile(path.join(app.getAppPath(), 'app', 'settings.html'))

            }
            if(urlObj.query.error) {
                const errorCode = urlObj.query.error
                const errorDesc = urlObj.query.error_description
                this.windows.main.send('fromMain', {case : 'authError', error : errorCode, description : errorDesc})
                this.windows.modal.close()
            }
            callback({
                cancel: false,
            })
        })
    }

    authenicateUser = (accessCode) => {


        axios({
            method: 'POST',
            url: 'https://discord.com/api/oauth2/token',
            data: new URLSearchParams(this.params),
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
            }               
        })        
    }


    

    

                // .then(res => {
                //     //store token info
                //     return res.data
                // })
                // .then(info => axios({
                //     method: 'get',
                //     url: 'https://discord.com/api/users/@me',
                //     headers: {
                //         authorization: `${info.token_type} ${info.access_token}`,
                //     }                
                // }))
                // .then(res => {
                //     console.log(res.data)
                // })                 
            // }
        
    // }
}