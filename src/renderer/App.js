import Vue from 'vue'
import VueRouter from 'vue-router'
Vue.use(VueRouter)

import Root from './Root'
import Launcher from './Routes/Launcher'
import Bundler from './Routes/Bundler'
import Config from './Config'

import { getStatic } from '@/static'

import 'bootstrap/scss/bootstrap.scss'

document.title = 'Atmosphir Launcher'

const fonts = {
    'Whitney Semibold': 'Whitney-Semibold.ttf',
    'Whitney Book': 'Whitney-Book.otf',
    'Whitney Medium': 'Whitney-Medium.ttf'
}
for (const fontName in fonts) {
    const font = new FontFace(
        fontName,
        'url(' + getStatic(fonts[fontName]) + ')'
    )
    font.load()
        .then(() => {
            document.fonts.add(font)
        })
        .catch(e => {
            console.log(e.message)
        })
}

const routes = [
    { path: '/', component: Launcher },
    { path: '/bundler', component: Bundler }
]

const router = new VueRouter({
    routes
})

const config = new Config()
const window = require('electron').remote.getCurrentWindow()
if (config.has('dev') && config.get('dev')) {
    router.replace('/bundler')
    window.setSize(700, 700)
} else router.replace('/')

if (config.has('devTools')) window.webContents.openDevTools()

const app = new Vue({
    router,
    render: h => h(Root)
})
app.$mount('#app')
