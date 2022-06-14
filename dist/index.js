"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// mostly copied from https://github.com/jantimon/iconfont-webpack-plugin/blob/master/lib/postcss-plugin.js
const path_1 = __importDefault(require("path"));
const icons_to_woff_1 = require("./icons-to-woff");
const postcss_1 = require("postcss");
const urlRegexp = new RegExp('url\\s*\\((\\s*"([^"]+)"|\'([^\']+)\'|([^\'")]+))\\)');
/**
 * Turn `url("demo.svg")` into `demo.svg`
 */
function getUnresolvedIconPath(value) {
    const relativePathResult = urlRegexp.exec(value);
    if (!relativePathResult) {
        throw new Error(`Could not parse url "${value}".`);
    }
    return relativePathResult[2] || relativePathResult[3] || relativePathResult[4];
}
/**
 * Parses a `font-icon: 20px url('./demo.svg')` expression
 */
function parseFontIconValue(value) {
    const valueParts = value.trim().split(' ');
    // The url is always the last part
    // font-icon: url('./demo.svg');
    // font-icon: 20px url('./demo.svg);
    return {
        url: getUnresolvedIconPath(valueParts[valueParts.length - 1]),
        size: valueParts.length === 2 ? valueParts[0] : undefined,
    };
}
/**
 * @param fontName The name of the font (font-family)
 * @param postCssRoot The postCss root object
 * @param enforcedSvgHeight the enforced height of the svg font
 * @param relativeSvgPaths The svg path information. The options are passed as a query string so we use the relative svg paths to reduce the path length per file
 * @param enforcedTimestamp Unix timestamp to replace a generated one in the TTF conversion step.
 */
const addFontDeclaration = (name, postCssRoot, enforcedSvgHeight, relativeSvgPaths, enforcedTimestamp) => (0, icons_to_woff_1.createIconFont)(relativeSvgPaths, {
    name,
    enforcedSvgHeight,
    enforcedTimestamp,
})
    .then((result) => `data:application/x-font-woff;charset=utf-8;base64,${result}`)
    .catch((err) => {
    // In case of an svg generation error return an invalid font and throw an error
    err.message += ' - Tried to compile: ' + JSON.stringify(relativeSvgPaths, null, 2);
    console.error(err);
    return `data:application/x-font-woff;charset=utf-8;base64,`;
})
    .then((url) => void postCssRoot.prepend((0, postcss_1.parse)(`@font-face {
    font-family: '${name}';
    src: url('${url}') format('woff');
    font-weight: normal;
    font-style: normal;
}`)));
/**
 * PostCSS Plugin factory
 */
const plugin = (options) => {
    const defaults = {
        fontName: 'postcss-fonticons-generated-font',
        enforcedSvgHeight: 1000,
        iconPath: './icons/',
    };
    const config = Object.assign(Object.assign({}, defaults), options);
    return {
        postcssPlugin: 'postcss-fonticons',
        prepare: (result) => {
            const fontIconPaths = [];
            const fonticonDeclarationListener = (decl, { result }) => {
                if (!result.opts.from)
                    return;
                const fontIcon = parseFontIconValue(decl.value);
                const resolvedPath = path_1.default.resolve(path_1.default.resolve(path_1.default.dirname(result.opts.from), config.iconPath), fontIcon.url);
                const relativePath = path_1.default.relative('.', resolvedPath).replace(new RegExp('\\' + path_1.default.sep, 'g'), '/');
                const foundIndex = fontIconPaths.findIndex((path) => path === relativePath);
                const index = foundIndex !== -1 ? foundIndex : fontIconPaths.push(relativePath) - 1;
                // Add font icon styles
                // + text-rendering
                // + -webkit-font-smoothing
                if (decl.prop === 'font-icon') {
                    // Add font smoothing
                    // Similar to font Awesome
                    // https://github.com/FortAwesome/Font-Awesome/blob/31281606f5205b0191c17c3b4d2d56e1ddbb2dc6/web-fonts-with-css/css/fontawesome-all.css#L10-L15
                    decl.cloneBefore({
                        prop: 'text-rendering',
                        value: 'auto',
                    });
                    decl.cloneBefore({
                        prop: '-webkit-font-smoothing',
                        value: 'antialiased',
                    });
                    decl.cloneBefore({
                        prop: '-moz-osx-font-smoothing',
                        value: 'grayscale',
                    });
                }
                // If a font size is set we can use the font shorthand
                if (fontIcon.size) {
                    decl.cloneBefore({
                        prop: 'font',
                        value: `normal normal normal ${fontIcon.size}/1 '${config.fontName}'`,
                    });
                }
                // If no font size is set we use the font attributes
                if (!fontIcon.size) {
                    decl.cloneBefore({
                        prop: 'font-family',
                        value: `'${config.fontName}'`,
                    });
                    decl.cloneBefore({
                        prop: 'font-weight',
                        value: 'normal',
                    });
                }
                // Look up the index of the svg in the array to generate the unicode char position
                decl.value = `'${(0, icons_to_woff_1.unicodeStringFromIndex)(index)}'`;
                // Turn `font-icon:` into `content:`
                decl.prop = 'content';
            };
            return {
                Declaration: {
                    'font-icon': fonticonDeclarationListener,
                    'font-icon-glyph': fonticonDeclarationListener,
                },
                OnceExit: (root) => {
                    if (fontIconPaths.length <= 0)
                        return;
                    // Update the css
                    return addFontDeclaration(config.fontName, root, config.enforcedSvgHeight, fontIconPaths, config.enforcedTimestamp);
                },
            };
        },
    };
};
plugin.postcss = true;
module.exports = plugin;
//# sourceMappingURL=index.js.map