<template>
    <div class="container">
        <div class="form-group pt-3">
            <label>Current Launcher URL</label>
            <input
                v-model="indexUrl"
                type="text"
                :disabled="bundling"
                class="form-control"
            />
        </div>
        <div class="form-group">
            <label>New Version Number</label>
            <input
                v-model="newVersion"
                type="text"
                :disabled="bundling"
                class="form-control"
            />
        </div>
        <div class="form-group">
            <label>Folder to Bundle</label>
            <input
                v-model="folder"
                type="text"
                :disabled="bundling"
                class="form-control"
            />
        </div>
        <div class="form-group">
            <label>Launch Command</label>
            <input
                v-model="launch"
                type="text"
                :disabled="bundling"
                class="form-control"
            />
        </div>
        <div class="form-group">
            <button
                type="button"
                class="btn btn-success"
                :disabled="bundling"
                @click="bundle"
            >
                <div
                    v-if="bundling"
                    class="spinner-border spinner-border-sm"
                    role="status"
                >
                    <span class="sr-only">Bundling...</span>
                </div>
                Bundle
            </button>
        </div>
        <div class="form-group">
            <label>Output</label>
            <textarea
                v-model="output"
                class="form-control form-control-plaintext"
                readonly="true"
                rows="15"
            ></textarea>
            <div class="form-text"></div>
        </div>
    </div>
</template>

<script>
import path from 'path'
import fs from 'fs'
import Config from '../Config'
import rimraf from 'rimraf'
import crypto from 'crypto'

const config = new Config()

export default {
    data: function() {
        return {
            indexUrl: config.get('server'),
            newVersion: '1.0.0',
            folder: path.join(process.cwd(), 'bundle_me'),
            launch: 'Atmosphir_Data/Atmosphir.exe standalone',

            bundling: false,
            outputJson: {}
        }
    },
    computed: {
        output: function() {
            return JSON.stringify(this.outputJson)
        }
    },
    mounted: function() {},
    methods: {
        bundle() {
            this.doBundle
                .bind(this)()
                .then(() => {})
        },
        async doBundle() {
            this.bundling = true

            this.outputJson = {
                version: this.newVersion + '',
                launch: this.launch.split(' '),
                deleted_files: [],
                updated_files: []
            }

            if (this.indexUrl !== '') {
                // do stuff
            }

            rimraf.sync(this.newVersion)
            fs.mkdirSync(this.newVersion)

            const files = this.walkSync(this.folder)
            for (const file of files) {
                const actualCurrentPath = path.join(this.folder, file)
                const copyTo = path.join(this.newVersion, file)
                this.outputJson.updated_files.push({
                    client_location: file,
                    size: fs.statSync(actualCurrentPath).size,
                    server_path: path.join(this.newVersion, file),
                    sha1_hash: crypto
                        .createHash('sha1')
                        .update(fs.readFileSync(actualCurrentPath))
                        .digest('hex')
                })
                try {
                    fs.mkdirSync(path.dirname(copyTo), { recursive: true })
                } catch {
                    // nothing
                }
                fs.copyFileSync(actualCurrentPath, copyTo)
            }

            this.bundling = false
            return 1
        },
        walkSync(dir, filelist, relDir) {
            var fs = fs || require('fs'),
                files = fs.readdirSync(dir)
            filelist = filelist || []
            relDir = relDir || ''
            files.forEach(file => {
                if (fs.statSync(path.join(dir, file)).isDirectory()) {
                    filelist = this.walkSync.bind(this)(
                        path.join(dir, file) + '/',
                        filelist,
                        path.join(relDir, file)
                    )
                } else {
                    filelist.push(path.join(relDir, file))
                }
            })
            return filelist
        }
    }
}
</script>

<style scoped>
* {
    font-family: 'Whitney Semibold';
}

textarea {
    font-size: 8pt;
}
</style>
