/**
 * @param iconPaths Array of icon file paths.
 * @param options SVG-Font options
 * @return Base64 encoded font
 */
export declare const createIconFont: (iconPaths: string[], options: {
    name: string;
    enforcedSvgHeight?: number;
    enforcedTimestamp?: number;
}) => Promise<string>;
export declare const unicodeStringFromIndex: (index: number) => string;
//# sourceMappingURL=icons-to-woff.d.ts.map