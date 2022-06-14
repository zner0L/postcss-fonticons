# postcss-fonticons

postcss-fonticons is a [postcss](https://postcss.org) plugin, generating iconfonts from svg paths in your css. It works with postcss versions > 8.0.0.

## Usage

In your css, add the following delcaration to your selectors to make then contain a font-icon:

```
.icon-class {
    font-icon: url('<your-icon>.svg');
}
```

You can also set the icon size in the same declaration:

```
.icon-class {
    font-icon: 80% url('<your-icon>.svg');
}
```

To use the plugin, add it to your `postcss.config.js`, like so:

```
module.exports = {
    plugins: [
        require('postcss-fonticons')({
            iconPath: path.resolve(__dirname, '.'),
            enforcedTimestamp: 1528942455,
            fontName: 'example-font',
        }),
    ],
};
```

You can (and likely should) set the following options:

| Option        | Default           | Comment  |
| ------------- |:-------------:| -----:|
| `iconPath` | `'./icons/'` | Set this to the directory where the icon urls should be resolved to |
| `enforcedSvgHeight` | `1000` | The svg size requires all svgs to have the same height usually scaling the icons to 1000px should be fine, but if you prefer another value set it here. |
| `fontName` | `'postcss-fonticons-generated-font'` | Use a unique font name to prevent collisions. |
| `enforcedTimestamp` | `undefined` | UNIX timestamp as a number to overwrite the timestamp in the TTF conversion step. Set this to a fixed value to get the same build results in every run. |
