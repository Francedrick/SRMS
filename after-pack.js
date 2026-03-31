const fs = require('fs');
const path = require('path');
const rcedit = require('rcedit');

module.exports = async function afterPack(context) {
    if (context.electronPlatformName !== 'win32') {
        return;
    }

    const projectDir = context.packager.projectDir;
    const appOutDir = context.appOutDir;
    const iconPath = path.join(projectDir, 'assets', 'images', 'icon-app.ico');
    const productFileName = context.packager.appInfo.productFilename;
    const exePath = path.join(appOutDir, `${productFileName}.exe`);

    if (!fs.existsSync(iconPath)) {
        throw new Error(`Icon file not found: ${iconPath}`);
    }

    if (!fs.existsSync(exePath)) {
        throw new Error(`Executable not found for icon patching: ${exePath}`);
    }

    await rcedit(exePath, {
        icon: iconPath
    });

    console.log(`[afterPack] EXE icon patched: ${exePath}`);
};
