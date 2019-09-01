# Atmosphir Launcher (Node/Electron)

## Uploading a New Release

The "Server" element to the launcher requires no server elements, it simply reads a publicly accessible `index.json` file to see if there's a new update. Here is what that file looks like:

```javascript
// index.json
{
    "launcher_version": "1.0.0",
    "versions": [ /* ... */ ]
}
```

The default URL for this file will be:
- Windows: `https://onemoreblock.com/Atmosphir/launcher2019/win32/index.json` (even for 64 bit)
- Mac: `https://onemoreblock.com/Atmosphir/launcher2019/darwin/index.json`

The order of the items in the `versions` field does not matter (since they all have semvers), but I would strongly recommend keeping new versions towards the bottom for ease of usage.

To create a new update, add `"dev":true` to the `config.json` for the launcher. When you run the launcher now, it will be in "bundle" mode. Fill out the form and click "Bundle", and it will give you the JSON you need to put add to the end of `versions` in `index.json`

A folder will also be generated with the version number of your new release (e.g. `1.4.3`). Upload that folder to the destination you specified in the bundler. Be sure to wait to update `versions` in `index.json` last, after you have finished uploading the asset folder.

## Development
Use `yarn` instead of `npm`.

### Development Scripts

```bash
# run the test server (to test downloading updates) on localhost
# this will run a server at http://localhost:7070/ with the contents of the server_example/ folder as root
yarn dev-server

# run application in development mode (webpack with hot reload)
yarn dev

# compile source code and create webpack output
yarn compile

# `yarn compile` & builds for your platform
yarn dist

# `yarn compile` & create unpacked build with electron-builder
yarn dist:dir
```

Build scripts for specific platforms will probably come later. For now just use [`electron-builder` CLI](https://www.electron.build/cli).