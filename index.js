var fs = require('fs');

var BuildAutoInc = function (file, config) {
    this.file = file;
    this.config = config || {};
};

BuildAutoInc.prototype.read = function (file, callback) {
    var self = this;
    var ver = { major: 0, minor: 0, patch: 0, build: 0 };
    fs.readFile(this.file, function (err, buf) {
        if (err) {
            callback(ver);
        }
        var v = buf.toString().split('.');
        ver.major = v[0];
        ver.minor = v[1];
        ver.patchmj = v[2];
        ver.build = v[3];
        callback(version);
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
    }
};

BuildAutoInc.prototype.apply = function (compiler) {
    var self = this;
    compiler.plugin('run', function (compilation, callback) {
        self.read(self.file, function (ver) {
            ver.build++;
            ver.text = ver.major + '.' + ver.minor + '.' + ver.patch + '.' + ver.build;
            if (this.config.output) {
                for (var i = 0; i < this.config.output.length; i++) {
                    self.write(this.config.output[i], ver, callback);
                }
            }
        });
    });
};
module.exports = BuildAutoInc;
