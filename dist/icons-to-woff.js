"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unicodeStringFromIndex = exports.createIconFont = void 0;
// Copied from https://github.com/jantimon/iconfont-webpack-plugin/blob/master/lib/icons-to-woff.js
const path_1 = __importDefault(require("path"));
const svgicons2svgfont_1 = __importDefault(require("svgicons2svgfont"));
const svg2ttf_1 = __importDefault(require("svg2ttf"));
const ttf2woff_1 = __importDefault(require("ttf2woff"));
const stream_1 = require("stream");
const fs_1 = __importDefault(require("fs"));
/**
 * @param iconPaths Array of icon file paths.
 * @param options SVG-Font options
 * @return Base64 encoded font
 */
const createIconFont = (iconPaths, options) => new Promise((resolve, reject) => {
    const fontStream = new svgicons2svgfont_1.default({
        fontName: options.name,
        normalize: true,
        fontHeight: options.enforcedSvgHeight,
        log: () => { }, // to prevent output to the console
    });
    // as per https://stackoverflow.com/a/49428486
    const svgFontChunks = [];
    fontStream
        .on('finish', () => resolve(Buffer.concat(svgFontChunks).toString('utf-8')))
        .on('data', (chunk) => svgFontChunks.push(Buffer.from(chunk)))
        .on('error', (err) => reject(err));
    iconPaths.forEach((iconPath, i) => {
        const filename = path_1.default.resolve(iconPath);
        const glyph = Object.assign(new stream_1.Readable(), {
            _read: function noop() { },
            metadata: {
                unicode: [String.fromCodePoint('\ue000'.charCodeAt(0) + i)],
                name: 'i' + i,
            },
        });
        fs_1.default.readFile(filename, (err, svgBuffer) => {
            if (err)
                return reject(err);
            // prevent svgs with fill="none" from beeing translated into an empty symbol
            const svgCode = svgBuffer.toString().replace(/\sfill\s*=\s*["']?none['"]?/gi, '');
            glyph.push(svgCode);
            glyph.push(null);
        });
        fontStream.write(glyph);
    });
    fontStream.end();
})
    .then((svgFont) => (0, svg2ttf_1.default)(svgFont, { ts: options.enforcedTimestamp }).buffer)
    .then((ttfFont) => (0, ttf2woff_1.default)(ttfFont).buffer)
    .then((woffFont) => Buffer.from(woffFont).toString('base64'));
exports.createIconFont = createIconFont;
const unicodeStringFromIndex = (index) => `\\e${'0'.repeat(Math.max(0, 3 - index.toString(16).length))}${index.toString(16)}`;
exports.unicodeStringFromIndex = unicodeStringFromIndex;
//# sourceMappingURL=icons-to-woff.js.map