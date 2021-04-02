'use strict'

document.addEventListener('click', e => {
    if(e.target.id === 'login') {
        window.api.send('toMain', {
            case: 'openAuth',
        })
    }
})

window.api.receive('fromMain', (payload) => {
    const container = document.querySelector('div#message')
    container.innerHTML = payload.description
})




