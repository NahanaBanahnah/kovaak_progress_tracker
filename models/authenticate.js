const app = require('electron').app
const path = require('path')
const url = require('url')
const axios = require('axios').default
const storage = require('electron-settings')

const config = require(path.join(app.getAppPath(), 'config', 'config.js'))
const fs = require('fs').promises

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
	isAuthenticated = async () => {
		const access_token = await storage.get('auth.access_token')
		const token_type = await storage.get('auth.token_type')

		if (!access_token || !token_type) {
			return false
		}

		let userData = await this.getUserdata(token_type, access_token)
		this.localizeInfo(userData)
		return true
	}

	// ---------- Open Auth ---------- //
	openAuth = () => {
		this.windows.modal.loadURL(config.authUrl)
		this.windows.modal.show()
		this.waitForRedirect()
	}

	// ---------- Wait for Redirect from Auth Window ---------- //
	waitForRedirect = async () => {
		//filter our uri
		const filter = {
			urls: [redirectUri + '*'],
		}

		this.session.defaultSession.webRequest.onBeforeRequest(
			filter,
			async (details, callback) => {
				const urlObj = url.parse(details.url, true)

				//credentials are good
				if (urlObj.query.code) {
					const accessCode = urlObj.query.code
					this.params.code = accessCode
					this.windows.modal.close()

					//get the oauth info and store it for later
					const res = await this.authenicateUser()
					await this.localizeInfo(res.data)

					//get the user data from discord
					const userData = await this.getUserdata(
						this.userData.token_type,
						this.userData.access_token
					)

					//store all the info
					await this.localizeInfo(userData.data)
					await this.storeUserInfo()

					//built the settings file to display
					const file = path.join(
						app.getAppPath(),
						'app',
						'html',
						`home.html`
					)
					const html = await fs.readFile(file, 'utf8')

					//payload to push to the new page
					const payload = {
						userid: this.userData.id,
						avatar: this.userData.avatar,
						html: html,
						section: 'settings',
						initial: true,
					}

					this.windows.main.send('loadContent', payload)
					return true
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
	authenicateUser = async () => {
		return await axios({
			method: 'POST',
			url: 'https://discord.com/api/oauth2/token',
			data: new URLSearchParams(this.params),
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
			},
		})
	}

	// ---------- Get the user data ---------- //
	getUserdata = async (tokenType, token) => {
		return await axios({
			method: 'get',
			url: 'https://discord.com/api/users/@me',
			headers: {
				authorization: `${tokenType} ${token}`,
			},
		})
	}

	// ---------- store the info we want from discord response ---------- //
	localizeInfo = payload => {
		return Object.keys(payload)
			.filter(key => key in this.userData)
			.forEach(key => (this.userData[key] = payload[key]))
	}

	// ---------- save the user tokens ---------- //
	storeUserInfo = async () => {
		const userData = Object.fromEntries(
			Object.entries(this.userData).filter(([_, v]) => v != null)
		)
		for (const [key, value] of Object.entries(userData)) {
			let storeKey = `auth.${key}`
			await storage.set(storeKey, value)
		}
		return true
	}

	// ---------- help func to get info ---------- //
	getUserInfo = async () => {
		let id = await storage.get('auth.id')
		let avatar = await storage.get('auth.avatar')

		return {
			userid: id,
			avatar: avatar,
		}
	}
}
