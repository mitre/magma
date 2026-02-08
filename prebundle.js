const fs = require('fs-extra');
const yaml = require('js-yaml');

console.log('Copying plugin GUI source files to magma');

if (fs.existsSync('./src/plugins/')) {
    fs.removeSync('./src/plugins/');
}

const requestedPlugins = process.argv.slice(2);

let plugins = [];

if (requestedPlugins.length > 0) {
    // runtime targeted build
    plugins = requestedPlugins;
    console.log("Building selected plugins:", plugins.join(', '));

} else {
    // server --build mode
    try {
        const conf = yaml.load(
            fs.readFileSync('../../conf/default.yml', 'utf8')
        );

        plugins = conf.plugins || [];
        console.log("Building enabled plugins from config:", plugins.join(', '));

    } catch (e) {
        // fallback for dev mode
        plugins = fs.readdirSync('../');
        console.log("Building ALL plugins (fallback)");
    }
}

plugins.forEach(plugin => {
    if (!fs.existsSync(`../${plugin}/gui`)) return;

    console.log(`Copying "${plugin}" files...`);

    fs.copySync(
        `../${plugin}/gui/`,
        `./src/plugins/${plugin}`,
        { overwrite: true, recursive: true }
    );
});

console.log('Plugin GUI source files copied!');
