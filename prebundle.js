const fs = require('fs-extra');

console.log('Copying plugin GUI source files to magma');

if (fs.existsSync('./src/plugins/')) {
    fs.removeSync('./src/plugins/');
}

// arguments passed from backend
const requestedPlugins = process.argv.slice(2);
if (requestedPlugins.length === 0) {
    console.log("No plugins specified — skipping copy phase");
    process.exit(0);
}

let plugins = [];

if (requestedPlugins.length > 0) {
    // targeted build
    plugins = requestedPlugins;
    console.log("Building selected plugins:", plugins.join(', '));
} else {
    // full build (server.py --build or manual build)
    plugins = fs.readdirSync('../');
    console.log("Building ALL plugins");
}

plugins.forEach((plugin) => {
    if (!fs.existsSync(`../${plugin}/gui`)) return;

    console.log(`Copying "${plugin}" files...`);

    fs.copySync(
        `../${plugin}/gui/`,
        `./src/plugins/${plugin}`,
        { overwrite: true, recursive: true }
    );
});

console.log('Plugin GUI source files copied!');
