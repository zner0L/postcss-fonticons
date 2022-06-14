// Copied from https://github.com/jantimon/iconfont-webpack-plugin/blob/master/lib/icons-to-woff.js
import path from 'path';
import Svgicons2svgfont from 'svgicons2svgfont';
import svg2ttf from 'svg2ttf';
import ttf2woff from 'ttf2woff';
import { Readable } from 'stream';
import fs from 'fs';

/**
 * @param iconPaths Array of icon file paths.
 * @param options SVG-Font options
 * @return Base64 encoded font
 */
export const createIconFont = (
    iconPaths: string[],
    options: { name: string; enforcedSvgHeight?: number; enforcedTimestamp?: number }
) =>
    new Promise((resolve, reject) => {
        const fontStream = new Svgicons2svgfont({
            fontName: options.name,
            normalize: true,
            fontHeight: options.enforcedSvgHeight,
            log: () => {}, // to prevent output to the console
        });

        // as per https://stackoverflow.com/a/49428486
        const svgFontChunks = [];
        fontStream
            .on('finish', () => resolve(Buffer.concat(svgFontChunks).toString('utf-8')))
            .on('data', (chunk) => svgFontChunks.push(Buffer.from(chunk)))
            .on('error', (err) => reject(err));

        iconPaths.forEach((iconPath, i) => {
            const filename = path.resolve(iconPath);
            const glyph = Object.assign(new Readable(), {
                _read: function noop() {},
                metadata: {
                    unicode: [String.fromCodePoint('\ue000'.charCodeAt(0) + i)],
                    name: 'i' + i,
                },
            });

            fs.readFile(filename, (err, svgBuffer) => {
                if (err) return reject(err);

                // prevent svgs with fill="none" from beeing translated into an empty symbol
                const svgCode = svgBuffer.toString().replace(/\sfill\s*=\s*["']?none['"]?/gi, '');
                glyph.push(svgCode);
                glyph.push(null);
            });

            fontStream.write(glyph);
        });

        fontStream.end();
    })
        .then((svgFont) => svg2ttf(svgFont, { ts: options.enforcedTimestamp }).buffer)
        .then((ttfFont) => ttf2woff(ttfFont).buffer)
        .then((woffFont) => Buffer.from(woffFont).toString('base64'));

export const unicodeStringFromIndex = (index: number) =>
    `\\e${'0'.repeat(Math.max(0, 3 - index.toString(16).length))}${index.toString(16)}`;
