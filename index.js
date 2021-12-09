import postcss from "postcss";
import fs from 'fs';

export default postcss.plugin("minify-css-selectors", (options = {
    jsDirectoryPath: ''
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

        const files = fs.readdirSync(dirPath)
        files.filter(v => (/.+\.js/gm).test(v)).forEach(file => {
            let rf = fs.readFileSync(`${dirPath}\\${file}`, { encoding: 'utf8' });

            const classesToReplace = selectors['.'];
            const funcGetClassName = rf.match(/get\ ?[Cc]lass[Nn]ame\(\)\{.*\}/gm);
            const inlineClassName = rf.match(/(class|className)\=\"[A-Za-z0-9\_\-\ ]+\"/gm);
            const objClassName = rf.match(/(class|className)\:\"[A-Za-z0-9\_\-\ ]+\"/gm);
            const objClassNameCondition = rf.match(/(class|className)\:[a-zA-Z0-9\.]+\?(\"[a-zA-Z0-9\_\-\ \0]*?\")\:(\"[a-zA-Z0-9\_\-\ \0]*?\")/gm);

            let originalClasses = Object.entries(classesToReplace);
            let orignKeys = originalClasses.map(k => k[0]);
            let orignValues = originalClasses.map(k => k[1]);

            let orIndex = -1;
            let exist = false;
            funcGetClassName?.forEach(v => {
                orIndex = -1;
                exist = orignKeys.some((or, i) => {
                    orIndex = i;
                    return v.includes(or);
                });
                if (exist) {
                    rf = rf.replace(v, v.replace(new RegExp(`\\b${orignKeys[orIndex]}\\b`), orignValues[orIndex]));
                }
            });
            inlineClassName?.forEach(v => {
                orIndex = -1;
                exist = orignKeys.some((or, i) => {
                    orIndex = i;
                    return v.split('class=').filter(val => val != '').map(val => val.replaceAll(`"`, ``)).map(val => val.split(' ')).flat().includes(or);
                });
                if (exist) {
                    rf = rf.replace(v, v.replace(new RegExp(`\\b${orignKeys[orIndex]}\\b`), orignValues[orIndex]));
                }
            });

            objClassName?.forEach(v => {
                orIndex = -1;
                exist = orignKeys.some((or, i) => {
                    orIndex = i;
                    return v.split(`className:`).filter(val => val != '').map(val => val.replaceAll(`"`, ``)).map(val => val.split(' ')).flat().includes(or);
                });
                if (exist) {
                    rf = rf.replace(v, v.replace(new RegExp(`\\b${orignKeys[orIndex]}\\b`), orignValues[orIndex]));
                }
            });
            objClassNameCondition?.forEach(v => {
                orIndex = -1;
                exist = orignKeys.some((or, i) => {
                    orIndex = i;
                    return v.split('?').filter((val, i) => i != 0).map(val => val.split(':').map(c => c.replaceAll('"', ''))).flat().includes(or);
                });
                if (exist) {
                    rf = rf.replace(v, v.replace(new RegExp(`\\b${orignKeys[orIndex]}\\b`), orignValues[orIndex]));
                }
            });

            fs.writeFileSync(`./dist/${file}`, rf);
        });
    };
});
