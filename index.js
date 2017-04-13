var FS = require('fs')
var Path = require('path')
var mkdirp = require('mkdirp')
var compileToHTML = require('./lib/compile-to-html')

function SPAPrerender(staticDir, apps, options) {
  this.staticDir = staticDir
  this.routes = [].concat.apply([], apps.map(app => app.routes.map(route => ( { entry: app.entry, path: route } ))))
  this.options = options || {}
}

SPAPrerender.prototype.build = function () {
  var self = this
  return Promise.all(
    self.routes.map(function (route) {
      var outputPath = Path.join('/', Path.parse(route.entry).name, route.path)
      return new Promise(function (resolve, reject) {
        compileToHTML(self.staticDir, route.entry, route.path, self.options, function (prerenderedHTML) {
          if (self.options.postProcessHtml) {
            prerenderedHTML = self.options.postProcessHtml({
              html: prerenderedHTML,
              route: outputPath
            })
          }
          var folder = Path.join(self.staticDir, outputPath)
          mkdirp(folder, function (error) {
            if (error) {
              return reject('Folder could not be created: ' + folder + '\n' + error)
            }
            var file = Path.join(folder, 'index.html')
            FS.writeFile(
              file,
              prerenderedHTML,
              function (error) {
                if (error) {
                  return reject('Could not write file: ' + file + '\n' + error)
                }
                resolve()
              }
            )
          })
        })
      })
    })
  )
  .catch(function (error) {
    // setTimeout prevents the Promise from swallowing the throw
    setTimeout(function () { throw error })
  })
}

module.exports = SPAPrerender
