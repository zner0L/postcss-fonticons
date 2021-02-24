const postcss = require('postcss');
const postcssPlugin = require('../index');
const fs = require('fs');

const path = require("path");

function processCss(css, options = {}) {
    const trimmedCss = css.replace(/\s*\n\s*/g, '\n');

    return postcss([postcssPlugin(options)])
        .process(trimmedCss, { from: path.join(__dirname, 'main.css'), to: 'main.css' });
}

fs.readFile('./main.css', (err, res) => {
    processCss(res.toString(), { iconPath: './', enforcedTimestamp: 1528942455 }).then(result => {
        fs.writeFile("./dist/main.css", result.css, function (err) {
            if (err) {
                return console.log(err);
            }
        });


    });
});
