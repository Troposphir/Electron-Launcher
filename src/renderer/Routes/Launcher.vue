<template>
    <div
        id="background"
        :style="{
            'background-image':
                'url(' +
                getStatic('background.jpg').replace(/\\/g, '\\\\') +
                ')'
        }"
    >
        <div class="container">
            <h1 class="display-4 text-center vertical">
                <img :src="getStatic('logo_atmosphir_preunity.svg')" />
                <span class="align-middle pl-2">Atmosphir</span>
            </h1>

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

h1 img {
    max-width: 4.5rem;
    max-height: 4.5rem;
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
import url from 'url'
import { spawn } from 'child_process'
import Config from '../Config'

const config = new Config()

export default {
    data: function() {
        return {
            getStatic,

            tasks: [],

            error: false,
            loadingMessage: '',
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

            const result = await task.method.bind(this)()
            console.log(result)
            if (!result) return this.failed()

            this.taskProgress = 1
            if (this.taskIndex + 1 == this.tasks.length)
                return this.finishedLoading()
            else return this.nextTask()
        },
        async failed() {
            this.error = true
        },
        async finishedLoading() {
            this.loadingMessage = 'Launching game...'
            const launch = this.serverJson.latestVersion.launch
            spawn(launch[0], launch.length > 1 ? launch.slice(1) : [], {
                cwd: config.get('asset_path'),
                detached: true
            })
            if (process.env.NODE_ENV === 'production') {
                // nothing
            }
            remote.app.quit()
            return true
        },

        async task_downloadIndex() {
            const response = await axios.get(config.get('server'), {
                responseType: 'json'
            })
            this.serverJson = new ServerJson(response.data)
            console.log(remote.app.getVersion())
            if (
                semver.parse(remote.app.getVersion()) <
                this.serverJson.launcherVersion.toString()
            ) {
                this.loadingMessage =
                    'A new launcher version has been released. Please update to continue.'
                return false
            } else {
                return true
            }
        },
        async task_downloadUpdate() {
            const latestVersion = this.serverJson.latestVersion

            const currentVersionNumber = semver.parse(config.get('version'))
            if (currentVersionNumber >= latestVersion.versionNumber) {
                this.loadingMessage = 'Up to date!'
                return true
            }

            // do update
            config.set('version', latestVersion.versionNumber.toString())

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
                    fs.unlinkSync(filePath)
                }

                const response = await axios.get(
                    url.resolve(config.get('server'), updateFile.serverPath),
                    {
                        responseType: 'arraybuffer',
                        onDownloadProgress: e => {
                            this.taskProgress =
                                (totalDownloaded + e.loaded) / totalDownloadSize
                        }
                    }
                )
                if (!fs.existsSync(path.dirname(filePath)))
                    fs.mkdirSync(path.dirname(filePath), { recursive: true })
                fs.writeFileSync(filePath, new Uint8Array(response.data))
                totalDownloaded += updateFile.size
            }
            return true
        }
    }
}
</script>
