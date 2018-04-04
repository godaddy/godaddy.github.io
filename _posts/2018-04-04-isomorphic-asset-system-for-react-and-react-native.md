---
layout: post
title:  "Isomorphic Asset System for React and React-Native"
date:   2018-04-04 02:00:00 -0800
cover:  /assets/images/headers/isomorphic-asset-system.png
excerpt: Introducing Asset System a cross platform asset rendering system for React and React-Native using SVG's.
authors:
  - name: Arnout Kazemier
    url: https://github.com/3rd-Eden
    photo: https://avatars2.githubusercontent.com/u/28071?s=460&v=4
---

Proudly introducing our latest Open Source project, [**Asset System**][AS], which is built upon our previously released [svgs][svgs] library.

- It provides an easy way to share assets between React and React-Native.
- Allows you to modify the assets on the fly, rotate, re-color etc so you can rebrand and re-use assets without the need for duplication.
- Assets scale without degradation of quality as they are a vector.
- High focus on performance, bundles multiple assets in a single bundle to reduce HTTP requests, comes with caching and other request optimization techniques.
- UX/DX first, easy to use, intuitive API's. Optimized for a great UX by preventing unwanted re-layout
- Accessible, ARIA roles and properties are used where possible and `accessiblityLabel` on React-Native.

Asset System consists of the following packages:

- [asset-provider](#asset-provider)
- [asset-parser](#asset-parser)
- [asset-bundle](#asset-bundle)
- [asset-webpack](#asset-webpack)
- [asset-list](#asset-list)

All these projects are available on [Github][AS]. Lets dive a bit deeper into the functionality of each project.

## asset-provider

```bash
npm install --save asset-provider

# Only needed when you use this on React-Native
npm install --save react-native-svg && react-native link react-native-svg
```

This is the component layer of the system, it works with React **and** React-Native. What this means is that you can share the same assets, and code on both platforms without having to rewrite a single line of code. This is a huge win in terms of efficiency. The `asset-provider` module exposes 2 different components:

```js
import Provider, { Asset } from 'asset-provider';
```

### Provider

This is the root component that should be wrapping your application or component that wants to use the asset system. It fetches the specified bundle and ensures that all nested `<Asset />` components will have access to the assets within the downloaded bundle. You can wrap your app with a single `<Provider>`:

```jsx
import Provider from 'asset-provider';
import React from 'react';
import App from './app';

export default function Bootstrap() {
  return (
    <Provider uri='https://cdn.example.com/bundle.svgs'>
      <App />
    </Provider>
  );
}
```

If you are building standalone components you can also wrap those in a `<Provider>` component so they can be used separately from your application if needed. The component is smart enough to detect duplicate requests and will re-use the previously requested bundle so only a single HTTP request is made. So it doesn't matter if you have 1 or 100 provider statements, it will only make a single HTTP request.

```jsx
import Provider, { Asset } from 'asset-provider';
import React from 'react';

function Icon(props) {
  return (
    <Provider uri='https://cdn.example.com/icons.svgs'>
      <Asset name={ props.name } title={ props.name } width={ 10 } height={ 10 } />
    </Provider>
  );
}

export default function OpenSource(props) {
  return (
    <div className='social'>
      <a href="https://twitter.com/GodaddyOSS">
        <Icon name='twitter' />
      </a>
      <a href="http://github.com/godaddy">
        <Icon name='github' />
      </a>
    </div>
  );
}
```

### Asset

This is the component that will render the actually requested asset.

```jsx
import { Asset } from 'asset-provider';
import React from 'react';

export default function Example() {
  return (
    <Asset name='logo' title='GoDaddy Logo' height={100} width={250} />
  )
}
```

- It asks the wrapping `<Provider>` through `React.context` for the asset. If the asset was not downloaded, the `<Provider>` will start downloading the bundle and passes it to the Asset once it's retrieved.
- If the bundle is still downloading we will display an empty, transparent, SVG element with the same dimensions. So the rest of the application can still render as intended. The same width/height are used to prevent the layout
from being re-calculated so once the asset is downloaded it would only need to repaint the area where the asset was inserted.
- The bundle is loaded, optional transformations are applied to the asset.
- The asset renders.

```jsx
import { Asset } from 'asset-provider';
import Spinner from './spinner';
import React from 'react';

export default function Example() {
  return (
    <Asset name='example' height={300} width={300}>
      <Spinner width={300} height={300} />
    </Asset>
  );
}
```

[View project on Github](https://github.com/godaddy/asset-system/tree/master/packages/provider)

## asset-parser

The asset-parser contains all the logic to encode and decode the created bundle as well as logic to transform the decoded structure back into proper SVG elements. It's not something you as a user would be installing yourself but we felt the need to explain what it does as this library also powers the transformation process.

### encoding

At the time of this writing, asset-parser is using `JSON` to encode and decode the structure that the `asset-bundle` project generated.

### transformation

```js
import Parser from 'asset-parser';

const parser = new Parser();
```

This is one of the strengths of this library, the ability transform/modify assets on the fly. You can recolor, rotate, skew and even delete parts of the SVG if you wish. This allows you to reduce duplicate assets. For example, instead of a left and right arrow in black and grey, you can have a single arrow. And just rotate it, and recolor if needed.

```jsx
import { Asset, parser } from 'asset-provider';
import React from 'react';

/**
 * Assign a new parser for the `color` prop which will re-color all Path
 * elements in the asset.
 *
 * @param {Object} attr The attributes that will be added to the SVG element
 * @param {Object} props The properties that we received from <Asset />
 * @param {React.Element} child The actual React Element that will be rendered.
 */
parser.modify('color', function (attr, props, child) {
  if (child.type !== 'Path') return;

  if (attr.fill) {
    attr.fill = props.color;
  }
});

export default function Example() {
  return (
    <div>
      <Asset name='arrow' color='red' width={ 10 } height={ 10 } />
      <Asset name='arrow' width={ 10 } height={ 10 } />
    </div>
  );
}
```

In the example above we access the `parser` instance that the `asset-provider` library exposes and assign a new modifier for the keyword `color`, this means that when an `<Asset />` is rendered with the `color` property, that this modifier will be triggered during the transformation process. The modifier will have access to all the custom properties that are added on the `<Asset />` so we use it to pass in the color and use it to override the `fill` attribute of the SVG attribute.

It's worth noting that the transformations are only applied to the `<Asset />` that specified the `color` property all other assets that reference the same asset will remain unchanged. So in our example code above we will have a red arrow and normal default colored arrow.

[View project on Github](https://github.com/godaddy/asset-system/tree/master/packages/parser)

## asset-bundle

This project allows you to bundle multiple SVG assets into a single `asset-provider` compatible, optimized bundle. Ideally you want to have your assets out of your JavaScript bundle as assets change less over time. This means you're not invalidating the cached asset bundle when you release/publish a new JavaScript application bundle. It comes at the cost of an extra HTTP request for fetching the bundle.

The `asset-bundle` help by:

- Optimizing each bundled SVG using `svgo` to make it as small as possible.
- Minimize the impact on your user's mobile device CPU and battery life so we transform each SVG in an easy to parse format.
- Reducing HTTP requests by bundling multiple assets in to a single format.

```js
import Bundle from 'asset-bundle';
import path from 'path';

const bundle = new Bundle([
  //
  // Array of all the svgs we want to include in the bundle.
  //
  path.join(__dirname, 'folder', 'filename.svg'),
  path.join(__dirname, 'folder', 'another.svg'),
  path.join(__dirname, 'folder', 'more.svg')
]);

bundle.run((err, output) => {
  if (err) throw err;

  console.log(output);
});
```

For the best cross-platform compatibility, we recommended that the resulting asset bundle is served over HTTPS so you do not need to configure [App Transport Security (ATS)][ATS] on React-Native for iOS. In addition to that, it's recommended that this file is served with `text/plain` as `Content-Type`. This [prevents a CORS preflight][CORS] request from being made and drastically improves performance.

[View project on Github](https://github.com/godaddy/asset-system/tree/master/packages/bundle)

## asset-webpack

We have also wrapped the `asset-bundle` project in a WebPack plugin. This allows you to easily generate an `asset-provider` compatible bundle using your existing build system. Instead of manually specifying which svgs need to be included, it will read out your `require` statements. In addition to including the assets in the SVG bundle it will also rewrite the contents of the original required file to output the name of asset:

```jsx
import Provider, { Asset } from 'asset-provider';
import React, { Component } from 'react';
import upload from './upload.svg';
import file from './file.svg';

export default class Example extends Component {
  render() {
    return (
      <Provider uri='http://url.com/bundle.svgs'>
        <div>
          <h1>Upload <Asset name={ file } /></h1>

          <label>
            Upload file: <input type='file' name='file' />
          </label>

          <button> Upload <Asset name={ upload } /></button>
        </div>
      </Provider>
    );
  }
}
```

To add `asset-webpack` to your `webpack.config.js` we require you to also specify the `file-loader` and set for the `.svg` extension:

```js
module: {
  loaders: [
    { test: /\.svg$/, loaders: [ 'file-loader' ] }
  ]
}
```

Once you have set that up, you can add `asset-webpack` as a plugin to your WebPack configuration:

```js
import AssetSystem from 'asset-webpack';
```

And add it to the plugin section of your WebPack configuration:

```js
{
  ...,
  plugins: [
    new AssetSystem('bundle-name-here.svgs', { /* opts */ })
  ]
}
```

The first argument is the name of the resulting bundle. It will be stored in the `dist` folder that you previously configured in your WebPack configuration.

[View project on Github](https://github.com/godaddy/asset-system/tree/master/packages/webpack)

## asset-list

Last but not least, `asset-list` will automatically generate documentation about the assets that are included in the bundle. It can be hooked to the `asset-bundle` as well as the `asset-webpack` projects. This allows you to quickly review what assets are included in the bundle, their names, and even what their dimensions are.

### Bundle

When using `asset-bundle` you use the `plugin` method to register the `asset-list` plugin. It's worth noting that the documentation generation is a **synchronous** process and will store the generated documentation in the same location as the provided output directory with the same name as your bundle, but with a `.md` extension.

```js
import AssetSystem from 'asset-bundle';
import List from 'asset-list';
import path from 'path';
import fs from 'fs';

const output = path.join(__dirname, 'bundle.svg');
const bundle = new AssetSystem([
  path.join(__dirname, 'test', 'fixtures', 'godaddy.svg')
]);

//
// Add the plugin to the bundle process using the `.plugin` module.
//
bundle.plugin(List, { file: output });

//
// Once the bundle is done, it will generate all the things.
//
bundle.run((err, str) => {
  fs.writeFileSync(output, str);
});
```

### WebPack

And for `asset-webpack` we can use the `plugins` option to supply a list of plugins.

```js
import AssetSystem from 'asset-webpack';
import List from 'asset-list';
import path from 'path';

module.exports = {
  entry: path.join(__dirname, 'index.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'output.js'
  },

  module: {
    loaders: [
      { test: /\.svg$/, loaders: ['file-loader'] }
    ]
  },

  plugins: [
    new AssetSystem('bundle.svgs', {
      plugins: [
        [List, { /* asset-list options here */ }]
      ]
    })
  ]
};
```

[View project on Github](https://github.com/godaddy/asset-system/tree/master/packages/list)

This was a quick review of what **Asset System** is and what it could do for your projects. In the following weeks we will dive a bit deeper in the `asset-provider` and `asset-bundle` projects to highlight some it's use-cases, patterns and best practices.

You can find all the projects and their code on [Github][AS].

[ATS]: https://ste.vn/2015/06/10/configuring-app-transport-security-ios-9-osx-10-11/
[CORS]: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#Simple_requests
[svgs]: http://github.com/godaddy/svgs
[AS]: http://github.com/godaddy/asset-system
