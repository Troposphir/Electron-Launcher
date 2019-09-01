import fs from 'fs'

export default class Config {
    constructor() {
        this.fileName = 'config.json'
        this.data = {}
        if (fs.existsSync(this.fileName))
            this.data = JSON.parse(fs.readFileSync(this.fileName))

        if (!this.has('version')) this.set('version', '0.0.0')
        if (!this.has('launch'))
            this.set('launch', ['Atmosphir_Data/Atmosphir.exe', 'standalone'])
        if (!this.has('asset_path')) this.set('asset_path', 'game/')
        if (!this.has('server')) {
            if (process.env.NODE_ENV === 'production')
                this.set(
                    'server',
                    'https://onemoreblock.com/Atmosphir/launcher2019/' +
                        process.platform
                )
            else this.set('server', 'http://localhost:7070/' + process.platform)
        }
    }

    has(key) {
        return key in this.data
    }

    get(key) {
        return this.data[key]
    }

    set(key, value) {
        this.data[key] = value
        fs.writeFileSync(this.fileName, JSON.stringify(this.data))
    }
}
