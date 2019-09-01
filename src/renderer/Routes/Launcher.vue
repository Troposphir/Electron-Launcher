<template>
    <div
        id="background"
        :style="{
            'background-image':
                'url(' +
                getStatic('background.jpg').replace(/\\/g, '\\\\') +
                '\')'
        }"
    >
        <div class="container">
            <h1 class="display-4 text-center vertical">
                <div class="image">
                    <img id="gears" :src="getStatic('logo_gears.svg')" />
                    <img id="center" :src="getStatic('logo_center.svg')" />
                </div>
                <span class="align-middle pl-2">Atmosphir</span>
            </h1>

            <span v-if="!error">
                <div id="progress" class="progress">
                    <div
                        class="progress-bar progress-bar-striped progress-bar-animated"
                        :class="{ 'bg-danger': error }"
                        role="progressbar"
                        :aria-valuenow="progressPercent"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        :style="{ width: progressPercent + '%' }"
                    >
                        <span v-if="!error">
                            {{ progressPercent.toFixed(0) }}%
                        </span>
                    </div>
                </div>
                <span id="status">
                    {{ loadingMessage }}
                </span>
            </span>

            <div v-if="error" id="error" class="form-row">
                <label class="col-form-label col-8 text-danger">{{
                    errorMessage
                }}</label>
                <div class="col-4">
                    <button
                        class="btn btn-success w-100"
                        @click="offlineLaunch"
                    >
                        Launch Game
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
body,
html {
    height: 100%;
}
</style>

<style scoped>
@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

* {
    font-family: 'Whitney Semibold';
    color: white;
    user-select: none;
}

#background {
    height: 100%;
    background-size: contain;
    background-position: center center;
}

#progress {
    margin-top: 4rem;
}

#error {
    margin-top: 4rem;
}

.progress-bar {
    transition: none;
}

#status {
    font-family: 'Whitney Medium';
    font-size: 0.8rem;
    display: block;
    width: 100%;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow-x: hidden;
}

h1 {
    padding-top: 2.75rem;
}

h1 .image {
    max-width: 5rem;
    max-height: 5rem;
    position: relative;
    font-size: 0;
    display: inline-block;
    vertical-align: middle;
}

h1 .image img {
    width: 5rem;
    height: 5rem;
}

.image #gears {
    animation-name: spin;
    animation-iteration-count: infinite;
    animation-duration: 8000ms;
    animation-timing-function: linear;
}

.image #center {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
}
</style>

<script>
import { getStatic } from '@/static'
import axios from 'axios'
import ServerJson from '../structures/ServerJson'
import { remote } from 'electron'
import semver from 'semver'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import Config from '../Config'
import urljoin from 'url-join'
import crypto from 'crypto'

const config = new Config()

export default {
    data: function() {
        return {
            getStatic,

            tasks: [],

            error: false,
            loadingMessage: '',
            errorMessage: 'Failed to update.',
            serverJson: null,

            taskIndex: -1,
            taskProgress: 0 // 0 to 1
        }
    },
    computed: {
        progress: function() {
            if (this.error) return this.maxProgress
            let progress = 0
            for (var i = 0; i < this.taskIndex; i++)
                progress += this.tasks[i].taskWeight

            if (this.taskIndex >= 0)
                progress +=
                    this.taskProgress * this.tasks[this.taskIndex].taskWeight

            return progress
        },
        maxProgress: function() {
            return this.tasks.reduce((a, b) => a + b.taskWeight, 0)
        },
        // 0 to 100
        progressPercent: function() {
            return (this.progress / this.maxProgress) * 100
        }
    },
    mounted: function() {
        // the taskWeights determine how much of the progress bar each task takes up
        // they don't have to add up to 100
        this.tasks = [
            {
                display: 'Checking for updates...',
                method: this.task_downloadIndex,
                taskWeight: 10
            },
            {
                method: this.task_downloadUpdate,
                taskWeight: 100
            }
        ]

        this.nextTask()
    },
    methods: {
        async nextTask() {
            this.taskIndex++
            this.taskProgress = 0
            const task = this.tasks[this.taskIndex]
            if ('display' in task) this.loadingMessage = task['display']

            try {
                const result = await task.method.bind(this)()
                if (!result) {
                    this.failed()
                    return false
                }
            } catch (e) {
                console.log(e)
                this.failed()
                return false
            }

            this.taskProgress = 1
            if (this.taskIndex + 1 == this.tasks.length)
                return this.finishedLoading()
            else return this.nextTask()
        },
        failed() {
            this.error = true
        },
        async finishedLoading() {
            this.loadingMessage = 'Launching game...'
            const launch = this.serverJson.latestVersion.launch
            spawn(launch[0], launch.length > 1 ? launch.slice(1) : [], {
                cwd: config.get('asset_path'),
                detached: true
            })
            if (!config.has('devTools')) remote.app.quit()
            return true
        },
        offlineLaunch() {
            const launch = config.get('launch')
            // launch anyway
            spawn(launch[0], launch.length > 1 ? launch.slice(1) : [], {
                cwd: config.get('asset_path'),
                detached: true
            })
            if (!config.has('devTools')) remote.app.quit()
        },

        async task_downloadIndex() {
            const indexUrl =
                urljoin(config.get('server'), 'index.json') +
                '?' +
                new Date().getTime()
            const response = await axios.get(indexUrl, {
                responseType: 'json'
            })
            this.serverJson = new ServerJson(response.data)
            config.set('launch', this.serverJson.latestVersion.launch)
            if (
                semver.parse(remote.app.getVersion()) <
                this.serverJson.launcherVersion.toString()
            ) {
                this.errorMessage = this.loadingMessage =
                    'Please restart launcher to apply new update.'
                return false
            } else {
                return true
            }
        },
        async task_downloadUpdate() {
            const latestVersion = this.serverJson.latestVersion

            const currentVersionNumber = semver.parse(config.get('version'))
            if (currentVersionNumber >= latestVersion.versionNumber) {
                this.loadingMessage = 'Checking files...'
            }

            // delete files
            for (const deleteFile of latestVersion.deletedFiles) {
                const filePath = path.join(
                    config.get('asset_path'),
                    deleteFile.clientLocation
                )
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath)
                }
            }

            const totalDownloadSize = latestVersion.updatedFiles.reduce(
                (a, file) => a + file.size,
                0
            )
            let totalDownloaded = 0

            // download files
            for (const updateFile of latestVersion.updatedFiles) {
                const filePath = path.join(
                    config.get('asset_path'),
                    updateFile.clientLocation
                )
                this.loadingMessage =
                    'Downloading ' + updateFile.clientLocation + '...'

                if (fs.existsSync(filePath)) {
                    const sha1Hash = crypto
                        .createHash('sha1')
                        .update(fs.readFileSync(filePath))
                        .digest('hex')
                    if (sha1Hash === updateFile.sha1Hash) {
                        // this file is good, skip!
                        continue
                    } else {
                        // if the file changed, delete it and redownload
                        fs.unlinkSync(filePath)
                    }
                }

                let remoteUrl = urljoin(
                    latestVersion.assetRoot,
                    updateFile.serverPath
                )
                if (!remoteUrl.startsWith('http')) {
                    remoteUrl = urljoin(config.get('server'), remoteUrl)
                }
                const response = await axios.get(remoteUrl, {
                    responseType: 'arraybuffer',
                    onDownloadProgress: e => {
                        this.taskProgress =
                            (totalDownloaded + e.loaded) / totalDownloadSize
                    }
                })
                if (!fs.existsSync(path.dirname(filePath)))
                    fs.mkdirSync(path.dirname(filePath), { recursive: true })
                fs.writeFileSync(filePath, new Uint8Array(response.data))
                totalDownloaded += updateFile.size
            }

            // mark as updated
            config.set('version', latestVersion.versionNumber.toString())

            return true
        }
    }
}
</script>
