const app = require('electron').app
const path = require('path')
const url = require('url')
const axios = require('axios').default
const Store = require('electron-store')
const store = new Store({ name: 'config.main' })
const config = require(path.join(app.getAppPath(), 'config', 'config.js'))
const fs = require('fs')

const redirectUri = 'http://localhost/oauth/redirect'

module.exports = class Authenticate {
	constructor(windows, session) {
		//set local window and session from main
		this.windows = windows
		this.session = session

		//oath params
		this.params = {
			client_id: config.clientId,
			client_secret: config.clientSecret,
			grant_type: 'authorization_code',
			redirect_uri: redirectUri,
			scope: 'the scopes',
		}

		//set userdata to null then fill it as we get it
		this.userData = {
			access_token: null,
			expires_in: null,
			refresh_token: null,
			scope: null,
			token_type: null,
			id: null,
			username: null,
			avatar: null,
			discriminator: null,
		}
	}

	// ---------- Check User Auth ---------- //
	isAuthenticated = () => {
		const access_token = store.get('access_token')
		const token_type = store.get('token_type')

		return new Promise((resolve, reject) => {
			if (!access_token || !token_type) {
				reject(false)
			}

			return this.getUserdata(token_type, access_token)
				.then(res => this.localizeInfo(res.data))
				.then(() => {
					resolve(true)
				})
				.catch(() => {
					reject(false)
				})
		})
	}

	// ---------- Open Auth ---------- //
	openAuth = () => {
		this.windows.modal.loadURL(config.authUrl)
		this.windows.modal.show()
		this.waitForRedirect()
	}

	// ---------- Wait for Redirect from Auth Window ---------- //
	waitForRedirect = () => {
		//filter our uri
		const filter = {
			urls: [redirectUri + '*'],
		}

		this.session.defaultSession.webRequest.onBeforeRequest(
			filter,
			(details, callback) => {
				const urlObj = url.parse(details.url, true)

				//credentials are good
				if (urlObj.query.code) {
					const accessCode = urlObj.query.code
					this.params.code = accessCode
					this.windows.modal.close()
					//loging you in message

					//get the oauth info and store it for later
					this.authenicateUser()
						.then(res => this.localizeInfo(res.data))
						.then(res =>
							this.getUserdata(
								this.userData.token_type,
								this.userData.access_token
							)
						)
						.then(res => this.localizeInfo(res.data))
						.then(() => this.storeUserInfo())
						.then(() => {
							fs.readFile(
								path.join(
									app.getAppPath(),
									'app',
									'html',
									`home.html`
								),
								'utf8',
								(err, html) => {
									const payload = {
										userid: this.userData.id,
										avatar: this.userData.avatar,
										html: html,
										section: 'settings',
										initial: true,
									}
									this.windows.main.send(
										'loadContent',
										payload
									)
								}
							)
						})
				}

				//display an error if there is one; or user cancels
				if (urlObj.query.error) {
					const errorCode = urlObj.query.error
					const errorDesc = urlObj.query.error_description
					this.windows.main.send('authClosed', {
						error: errorCode,
						description: errorDesc,
					})
					this.windows.modal.close()
				}
				callback({
					cancel: false,
				})
			}
		)
	}

	// ---------- API To discord oAuth2 ---------- //
	authenicateUser = () => {
		return axios({
			method: 'POST',
			url: 'https://discord.com/api/oauth2/token',
			data: new URLSearchParams(this.params),
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
			},
		})
	}

	// ---------- Get the user data ---------- //
	getUserdata = (tokenType, token) => {
		return axios({
			method: 'get',
			url: 'https://discord.com/api/users/@me',
			headers: {
				authorization: `${tokenType} ${token}`,
			},
		})
	}

	// ---------- store the info we want from discord response ---------- //
	localizeInfo = payload => {
		return new Promise((resolve, reject) => {
			Object.keys(payload)
				.filter(key => key in this.userData)
				.forEach(key => (this.userData[key] = payload[key]))
			resolve(payload)
		})
	}

	// ---------- save the user tokens ---------- //
	storeUserInfo = () => {
		const userData = Object.fromEntries(
			Object.entries(this.userData).filter(([_, v]) => v != null)
		)
		for (const [key, value] of Object.entries(userData)) {
			store.set(key, value)
		}
	}

	// ---------- help func to get info ---------- //
	getUserInfo = () => {
		return {
			userid: store.get('id'),
			avatar: store.get('avatar'),
		}
	}
}
