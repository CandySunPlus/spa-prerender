SPA Prerender
===

This SPA pre-render base on [prender-spa-plugin][][](https://github.com/chrisvfritz/prerender-spa-plugin), support multiple SPA pre-render


```js

var SPAPrerender = require('spa-prerender');
var spr = new SPAPrerender( path.join(__dirname, './dist'), [{ entry: 'index.html', routes: ['/', '/about'] }]);
spr.build()
    .then()
    .catch();
```

