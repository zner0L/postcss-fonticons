// mostly copied from https://github.com/jantimon/iconfont-webpack-plugin/blob/master/lib/postcss-plugin.js

'use strict';
const postcss = require('postcss');
const path = require('path');
const _ = require('lodash');
const crypto = require('crypto');
const createIconFont = require('./icons-to-woff.js');
const urlRegexp = new RegExp('url\\s*\\((\\s*"([^"]+)"|\'([^\']+)\'|([^\'")]+))\\)');

/**
 * Turn `url("demo.svg")` into `demo.svg`
 */
function getUnresolvedIconPath (value) {
    const relativePathResult = urlRegexp.exec(value);
    if (!relativePathResult) {
        throw new Error(`Could not parse url "${value}".`);
    }
    return relativePathResult[2] || relativePathResult[3] || relativePathResult[4];
}

function parseFontIconValue (value) {
    const valueParts = value.trim().split(' ');
    const result = {};
    // Parse font size and url
    // font-icon: 20px url('./demo.svg');
    if (valueParts.length === 2) {
        result.size = valueParts[0];
    }
    // The url is always the last part
    // font-icon: url('./demo.svg');
    // font-icon: 20px url('./demo.svg);
    result.url = getUnresolvedIconPath(valueParts[valueParts.length - 1]);
    return result;
}

/**
 * Returns a promise with the result of all `icon-font:url(...)` svg paths of the given file
 *
 * @param postCssRoot {object} The postCss root object
 * @param iconPath {string} The webpack resolve helper
 * @param context {object} The css loader path context to resolve relative urls
 */
function getSvgPaths (postCssRoot, iconPath, context) {
    // Gather all font-icon urls:
    let unresolvedPaths = [];
    postCssRoot.walkDecls((decl) => {
        if (decl.prop === 'font-icon' || decl.prop === 'font-icon-glyph') {
            const fontIcon = parseFontIconValue(decl.value);
            unresolvedPaths.push(fontIcon.url);
        }
    });
    // Remove duplicates
    unresolvedPaths = _.uniq(unresolvedPaths);
    // Resolve the urls to the absolute url
    return Promise.all(unresolvedPaths.map((unresolvedPath) =>
        new Promise((resolve, reject) => {
            resolve(path.resolve(iconPath, unresolvedPath));
        })
    ))
        .then((resolvedFilenames) => ({
            // Original paths (unprocessed relative to the current css file context)
            unresolved: unresolvedPaths,
            // Absolute paths
            resolved: resolvedFilenames,
            // Relative unix paths (to the cwd)
            relative: resolvedFilenames.map(
                (resolvedPath) => path.relative('.', resolvedPath).replace(new RegExp('\\' + path.sep, 'g'), '/')
            )
        }));
}

/**
 * @param fontName {string} The name of the font (font-family)
 * @param postCssRoot {object} The postCss root object
 * @param svgPaths {object} The svg path information
 */
function replaceIconFontDeclarations (fontName, postCssRoot, svgPaths) {
    postCssRoot.walkDecls((decl) => {
        // Add font icon styles
        // + text-rendering
        // + -webkit-font-smoothing
        if (decl.prop === 'font-icon') {
            // Add font smoothing
            // Similar to font Awesome
            // https://github.com/FortAwesome/Font-Awesome/blob/31281606f5205b0191c17c3b4d2d56e1ddbb2dc6/web-fonts-with-css/css/fontawesome-all.css#L10-L15
            decl.cloneBefore({
                prop: 'text-rendering',
                value: 'auto'
            });
            decl.cloneBefore({
                prop: '-webkit-font-smoothing',
                value: 'antialiased'
            });
            decl.cloneBefore({
                prop: '-moz-osx-font-smoothing',
                value: 'grayscale'
            });
        }
        // set content property
        if (decl.prop === 'font-icon' || decl.prop === 'font-icon-glyph') {
            const fontIcon = parseFontIconValue(decl.value);
            // If a font size is set we can use the font shorthand
            if (fontIcon.size) {
                decl.cloneBefore({
                    prop: 'font',
                    value: `normal normal normal ${fontIcon.size}/1 ${fontName}`
                });
            }
            // If no font size is set we use the font attributes
            if (!fontIcon.size) {
                decl.cloneBefore({
                    prop: 'font-family',
                    value: fontName
                });
                decl.cloneBefore({
                    prop: 'font-weight',
                    value: 'normal'
                });
            }
            // Look up the index of the svg in the array to generate the unicode char position
            const iconCharCode = svgPaths.unresolved.indexOf(getUnresolvedIconPath(decl.value));
            decl.value = '\'\\e' + _.padStart(iconCharCode.toString(16), 3, '0') + '\'';
            // Turn `font-icon:` into `content:`
            decl.prop = 'content';
        }
    });
}

/**
 * @param fontName {string} The name of the font (font-family)
 * @param postCssRoot {object} The postCss root object
 * @param useCssModules {boolean} wether the css loader is using css-modules or not
 * @param useCssModules {number} the enforced height of the svg font
 * @param resolvedRelativeSvgs {object} The svg path information
 */
function addFontDeclaration (fontName, postCssRoot, useCssModules, enforcedSvgHeight, svgPaths) {
    console.log(svgPaths);
    // The options are passed as a query string so we use the relative svg paths to reduce the path length per file
    const options = { svgs: svgPaths.relative, name: fontName, enforcedSvgHeight: enforcedSvgHeight };

   return new Promise((resolve, reject) => createIconFont(options.svgs, options).then((result) => {
        // Return the font to webpack
        const url = '"data:application/x-font-woff;charset=utf-8;base64,' + result + '"';
        console.log(url);
        postCssRoot.prepend(postcss.parse(
            '@font-face { ' +
            'font-family: ' + fontName + '; src:url(' + url + ') format(\'woff\');' +
            'font-weight: normal;' +
            'font-style: normal;' +
            '}'
        ));
        resolve();
    }, function (err) {
        // In case of an svg generation error return an invalid font and throw an error
        const url = '"data:application/x-font-woff;charset=utf-8;base64,"';
        err.message += ' - Tried to compile: ' + JSON.stringify(options.svgs, null, 2);
        postCssRoot.prepend(postcss.parse(
            '@font-face { ' +
            'font-family: ' + fontName + '; src:url(' + url + ') format(\'woff\');' +
            'font-weight: normal;' +
            'font-style: normal;' +
            '}'
        ));
        resolve();
    }));
}

/**
 * PostCSS Plugin factory
 */
module.exports = postcss.plugin('postcss-fonticons', options => function (root, result) {
    const config = _.extend({
        // allows to prefix the font name to prevent collisions
        fontNamePrefix: '',

        // the svg size requires all svgs to have the same height
        // usually scaling the icons to 1000px should be fine but if you prefer
        // another value set it here
        enforcedSvgHeight: 1000,

        // the path to the directory in which the svgs are stored (with trailing slash)
        iconPath: './icons/',
    }, options);

    const cssFilename = result.opts.from;
    const context = path.dirname(cssFilename);
    return getSvgPaths(root, config.iconPath, context)
        .then(function (svgPaths) {
            // Stop if the css file contains no `font-icon:url('..');` declarations
            if (svgPaths.resolved.length === 0) {
                return;
            }
            // Generate a font icon name
            const md5sum = crypto.createHash('md5');
            md5sum.update(JSON.stringify(_.values(svgPaths.relative)));
            let fontName = md5sum.digest('hex').substr(0, 6);
            // Prefix the fontname with a letter as fonts with a leading number are not allowed
            fontName = config.fontNamePrefix + String.fromCharCode(fontName.charCodeAt(0) + 20) + fontName.substr(1);
            // Update the css
            return Promise.all([
                // add the font faces
                addFontDeclaration(fontName, root, config.modules, config.enforcedSvgHeight, svgPaths).then(() => {}),
                // replace the `font-icon` occurences
                replaceIconFontDeclarations(fontName, root, svgPaths)
            ]);
        });
});
