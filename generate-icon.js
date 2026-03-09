const fs = require('fs');
const path = require('path');

async function generateIcon() {
    const pngToIcoModule = await import('png-to-ico');
    const pngToIco = pngToIcoModule.default;
    const rootDir = path.resolve(__dirname, '..');
    const sourcePng = path.join(rootDir, 'assets', 'images', 'icon-app.png');
    const targetIco = path.join(rootDir, 'assets', 'images', 'icon-app.ico');

    if (!fs.existsSync(sourcePng)) {
        throw new Error(`Source icon not found: ${sourcePng}`);
    }

    const icoBuffer = await pngToIco(sourcePng);
    fs.writeFileSync(targetIco, icoBuffer);
    console.log(`Generated icon: ${targetIco}`);
}

generateIcon().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
