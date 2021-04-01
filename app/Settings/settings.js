'use strict'

const folder = document.querySelector('#folder')
const folderField = document.querySelector('#folderField')
const database = document.querySelector('#database')
const submit = document.querySelector('#submit')
const requied = document.querySelectorAll('[required]')

const canSubmit = () => {
    let send = true

    requied.forEach(e => {
        if(e.value === '') {
            send = false   
        }
        if(!e.checkValidity()) {
            send = false
        }
        if(!send) {
            submit.disabled = true
            return
        }
        submit.disabled = false
    })
}

document.addEventListener('click', e => {
    if(e.target.id === 'file_browse') {
        window.api.send('toMain', {
            case: 'fileBrowser',
        })
    }
    if(e.target.id === 'submit') {
        const payload = {
            case : 'saveSettings',
            saveDirectory : folder.value,
            database : database.value
        }
        window.api.send('toMain', payload)
    }
})

database.addEventListener('keyup', e => {
    const ele = e.target
    const error = e.target.dataset.invalid
    const label = document.querySelector(`label[for=${ele.id}]`)

    if(!ele.checkValidity()) {
        label.innerHTML = error
    }
    canSubmit()
})

window.api.receive('fromMain', (payload) => {
    const file = payload.file[0]
    folder.value = file
    folderField.innerHTML = `Kovaak Directory: ${file}`
    canSubmit()
})





