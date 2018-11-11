const fs = require('fs');

const BuildAutoInc = function (file, config) {
    this.file = file;
    this.config = config || {};
};

BuildAutoInc.prototype.read = function (file, callback) {
    const self = this;
    const ver = { major: 0, minor: 0, patch: 0, build: 0 };
    fs.readFile(this.file, function (err, buf) {
        if (err) {
            callback(ver);
        }
        else {
            const v = buf.toString().replace(/\n/g, '').split('.');
            ver.major = v[0];
            ver.minor = v[1];
            ver.patch = v[2];
            if (!self.config.input || !self.config.input.url) {
                ver.build = v[3];
                callback(ver);
            }
            else {
                const http = require(self.config.input.url.startsWith('https') ? 'https' : 'http') ;
                http.get(self.config.input.url, (res) => {
                    const { statusCode } = res;
                    const contentType = res.headers['content-type'];
                  
                    let error;
                    if (statusCode !== 200) {
                        error = new Error('Request Failed.\nStatus Code: ' + statusCode);
                    }
                    else if (!/^application\/json/.test(contentType) && !/^text\/plain/.test(contentType)) {
                        error = new Error('Invalid content-type.\n' +
                            `Expected application/json or text/plain but received ${contentType}`);
                    }
                    if (error) {
                        console.error(error.message);
                        res.resume();
                        return;
                    }
                  
                    let rawData = '';
                    res.on('data', (chunk) => { rawData += chunk; });
                    res.on('end', () => {
                        if (/^application\/json/.test(contentType)) {
                            try {
                                const parsedData = JSON.parse(rawData);
                                ver.build = parsedData.build;
                            }
                            catch (e) {
                                console.error(e.message);
                                return;
                            }
                        }
                        else {
                            ver.build = rawData;
                        }
                        callback(ver);
                    });
                }).on('error', (e) => {
                    console.error(`Got error: ${e.message}`);
                });
            }
        }
    });
};

BuildAutoInc.prototype.load = function (callback) {
    this.read(this.file, callback);
};

BuildAutoInc.prototype.save = function (version, callback) {
    return this.write(this.file, version, callback);
};

BuildAutoInc.prototype.write = function (cout, ver, callback) {
    switch (cout.type) {
        case "text":
            fs.writeFile(cout.file,
                ver.text + "\n",
                callback);
            break;
        case "json":
            fs.writeFile(cout.file,
                '{"major":' + ver.major + ',"minor":' + ver.minor + ',"patch":' + ver.patch + ',"build":' + ver.build + ',"text":' + ver.text + '}' + "\n",
                callback);
            break;
        case "ts":
            fs.writeFile(cout.file,
                "export const version = {\n    major: " + ver.major + ",\n    minor: " + ver.minor + ",\n    patch: " + ver.patch + ",\n    build: "
                + ver.build + ",\n    text: '" + ver.text + "'\n};\n",
                callback);
            break;
        case "package":
            const conf = { 'bin-links': false, verbose: true, prefix: cout.dir };
            const cli = require('npm');
            cli.load(conf, (err) => {
            if(err) {
                    return reject(err);
            }
            cli.commands.version([ver.major + "." + ver.minor + "." + ver.patch], callback);
            cli.on('log', (message) => {
                    console.log(message);
                });
            });
            break;
    }
};

BuildAutoInc.prototype.apply = function (compiler) {
    const self = this;

    compiler.plugin('run', function (compilation, callback) {
        self.read(self.file, function (ver) {
            ver.patch++;
            const tv = ver.major + '.' + ver.minor + '.' + ver.patch + '.' + ver.build;
            console.log('----------------------[', tv, "]---", ver);
            ver.text = tv;
            if (self.config && self.config.output) {
                for (let i = 0; i < self.config.output.length; i++) {
                    self.write(self.config.output[i], ver, null);
                }
            }
            self.write({ type: 'text', file: self.file }, ver, callback);
        });
    });

    compiler.plugin('watch-run', function (compilation, callback) {
        self.read(self.file, function (ver) {
            ver.build++;
            let tv = ver.major + '.' + ver.minor + '.' + ver.patch + '.' + ver.build;
            console.log('----------------------[', tv, "]---", ver);
            ver.text = tv;
            self.write({ type: 'text', file: self.file }, ver, callback);
        });
    });

};

module.exports = BuildAutoInc;
