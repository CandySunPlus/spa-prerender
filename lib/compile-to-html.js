var Hapi = require('hapi');
var Inert = require('inert');
var Path = require('path');
var Phantom = require('phantomjs-prebuilt');
var ChildProcess = require('child_process');
var PortFinder = require('portfinder');

module.exports = function(staticDir, entryFile, route, options, callback) {
    function serveAndPrerenderRoute() {
        PortFinder.getPort(function(error, port) {
            if (error) throw error;

            var Server = new Hapi.Server({
                connections: {
                    routes: {
                        files: {
                            relativeTo: staticDir
                        }
                    }
                }
            });

            Server.connection({ port: port });

            Server.register(Inert, function(error) {
                if (error) throw error;

                // if (options.basePath) {
                //     Server.route({
                //         method: 'GET',
                //         path: options.basePath + '/{file*}',
                //         handler: function(request, reply) {
                //             reply.file(Path.join(staticDir, request.params.file));
                //         }
                //     });
                // }

                Server.route({
                    method: 'GET',
                    path: route,
                    handler: function(request, reply) {
                        reply.file(Path.join(staticDir, entryFile));
                    }
                });

                Server.route({
                    method: 'GET',
                    path: '/{param*}',
                    handler: {
                        directory: {
                            path: '.',
                            redirectToSlash: true,
                            index: true
                        }
                    }
                });

                Server.start(function(error) {
                    // If port is already bound, try again with another port
                    if (error) return serveAndPrerenderRoute();

                    var maxAttempts = options.maxAttempts || 5;
                    var attemptsSoFar = 0;


                    var phantomArguments = [
                        Path.join(__dirname, 'phantom-page-render.js'),
                        'http://localhost:' + port + route,
                        JSON.stringify(options)
                    ];

                    if (options.phantomOptions) {
                        phantomArguments.unshift(options.phantomOptions);
                    }

                    function capturePage() {
                        console.log('prerender for', entryFile, route);
                        attemptsSoFar += 1;

                        ChildProcess.execFile(
                            Phantom.path,
                            phantomArguments,
                            { maxBuffer: 1048576 },
                            function(error, stdout, stderr) {
                                if (error || stderr) {
                                    // Retry if we haven't reached the max number of capture attempts
                                    if (attemptsSoFar <= maxAttempts) {
                                        return capturePage();
                                    } else {
                                        if (error) throw stdout;
                                        if (stderr) throw stderr;
                                    }
                                }
                                console.log('prerender end', entryFile, route);
                                callback(stdout);
                                Server.stop();
                            }
                        );
                    }
                    capturePage();
                });
            });
        });
    }
    serveAndPrerenderRoute();
};
