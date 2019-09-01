import semver from 'semver'

export default class ServerJson {
    constructor(json) {
        console.log(json)

        this.launcherVersion = semver.parse(json.launcher_version)
        this.versions = json.versions.map(
            version => new ApplicationVersion(version)
        )
        this.versions.sort((a, b) => a.versionNumber.compare(b.versionNumber))

        this.latestVersion = this._calculateLatestVersion()
    }

    _calculateLatestVersion() {
        const latestVersion = new ApplicationVersion()

        for (const version of this.versions) {
            // loop through files that were deleted in this version
            for (const deletedFile of version.deletedFiles) {
                // if any of those files are updated by previous versions, drop them
                const index = latestVersion.updatedFiles.findIndex(
                    file => file.clientLocation == deletedFile.clientLocation
                )
                if (index !== -1) latestVersion.updatedFiles.splice(index, 1)

                latestVersion.deletedFiles.push(deletedFile.clone())
            }

            // loop through files that were updated in this version
            for (const updatedFile of version.updatedFiles) {
                // if a record of file already exists, delete it (we're replacing it)
                const index = latestVersion.updatedFiles.findIndex(
                    file => file.clientLocation == updatedFile.clientLocation
                )
                if (index !== -1) latestVersion.updatedFiles.splice(index, 1)

                latestVersion.updatedFiles.push(updatedFile.clone())
            }

            latestVersion.versionNumber = version.versionNumber
            latestVersion.launch = version.launch
        }

        return latestVersion
    }
}

export class ApplicationVersion {
    constructor(json = undefined) {
        if (json) {
            this.updatedFiles = json.updated_files.map(
                file => new ApplicationFile(file)
            )
            this.deletedFiles = json.deleted_files.map(
                file => new ApplicationFile(file)
            )
            this.versionNumber = semver.parse(json.version)
            this.launch = json.launch
        } else {
            this.updatedFiles = []
            this.deletedFiles = []
        }
    }
}

export class ApplicationFile {
    constructor(json = undefined) {
        if (json) {
            this.clientLocation = json.client_location
            this.size = 'size' in json ? json.size : null
            this.serverPath = 'server_path' in json ? json.server_path : null
            this.sha1Hash = 'sha1_hash' in json ? json.sha1_hash : null
        }
    }

    clone() {
        const clone = new ApplicationFile()
        clone.clientLocation = this.clientLocation
        clone.size = this.size
        clone.serverPath = this.serverPath
        clone.sha1Hash = this.sha1Hash
        return clone
    }
}
