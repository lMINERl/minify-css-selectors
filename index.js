const postcss = require("postcss");
const fs = require('fs');

module.exports = postcss.plugin("minify-css-selectors", (options = {
    jsDirectoryPath: '',
    outPutPath: ''
}) => {
    // Work with options here

    return function (root) {
        // Transform each rule here

        let ruleSelector = [];
        let selectors = {
            ".": {},
        }
        let newSelector = "";
        let previous = '';

        root.walkRules((rule) => {
            ruleSelector = rule.selector.match(/([A-Za-z0-9\-\_]+)|\W?/gm).filter(v => v != '-' || v != '');

            previous = "";
            for (let current of ruleSelector) {
                if (Object.keys(selectors).includes(previous)) {
                    if (!selectors[previous][current]) {
                        selectors[previous][current] = `_${Object.keys(selectors[previous]).length.toString(36)}`;
                    }
                    newSelector = newSelector + selectors[previous][current];
                } else {
                    newSelector = newSelector + current;
                }
                previous = current;
            }
            rule.selector = newSelector;
            newSelector = "";
        });

        const properties = {};
        let fVal = [];
        let fProperty = [];
        root.walkDecls((decl) => {
            // Transform each property declaration here
            fVal = decl.value.match(/(--[A-Za-z0-9\-\_]+)/gm)
            fVal = fVal ? fVal.filter(v => v != '-') : [];

            fProperty = decl.prop.match(/(--[A-Za-z0-9\-\_]+)/gm);
            fProperty = fProperty ? fProperty.filter(v => v != '-') : [];

            if (fVal.length) {
                fVal.forEach(v => {
                    if (!properties[v]) {
                        properties[v] = `--${Object.keys(properties).length.toString(36)}`;
                    }
                    decl.value = decl.value.replace(v, properties[v]);
                })
            }
            if (fProperty.length) {
                fProperty.forEach(v => {
                    if (!properties[v]) {
                        properties[v] = `--${Object.keys(properties).length.toString(36)}`;
                    }
                    decl.prop = decl.prop.replace(v, properties[v]);
                })
            }
            //decl.prop = decl.prop.split("").reverse().join("");
        });

        const dirPath = options.jsDirectoryPath;

        fs.readdir(dirPath, { encoding: 'utf8' }, (dirErr, files) => {
            if (dirErr) {
                console.error(dirErr.message);
                return;
            }

            files.filter(v => (/.+\.js/gm).test(v)).forEach(file => {
                fs.readFile(`${dirPath}\\${file}`, { encoding: 'utf8' }, (fileErr, data) => {
                    if (fileErr) {
                        console.error(fileErr.message);
                        return;
                    }
                    let rf = data;
                    Object.keys(selectors['.']).forEach(key => {
                        rf = rf.replaceAll(new RegExp(`[\\'\\"]\\b${key}\\b[\\"\\']`, 'gm'), `"${selectors['.'][key]}"`);
                    })
                    Object.keys(properties).forEach(key => {
                        rf = rf.replaceAll(new RegExp(`var\\(${key}\\)`, 'gm'), `var(${properties[key]})`)
                    })

                    fs.writeFile(`${options.outPutPath}/${file}`, rf, () => {
                        console.log(`${file}:finished`);
                    });

                })



            });

        });


    };
});
