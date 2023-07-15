import { window, Range } from "vscode";
function splitString(source) {
    const sourceLines = source
        .trim()
        .split("\n")
        .map((line) => line.trim());
    // lines matching "import {" (exact)
    const importIndexes = getAllIndexes(sourceLines, (line) => line === "import {");
    // lines matching "...} from..." but not "...import {..." and "..., {..."
    const fromIndexes = getAllIndexes(sourceLines, (line) => line.match(/} from/) && !line.match(/import {/) && !line.match(/, {/));
    // has matching indexes
    if (importIndexes.length > 0 && fromIndexes.length > 0) {
        // collect lines between range importIndex and fromIndex range.
        const targetLines = importIndexes
            .map((index, i) => sourceLines.slice(index, fromIndexes[i] + 1))
            .map((arr) => arr.join(""));
        // collect all indexes between importIndex and fromIndex range.
        const targetIndexes = importIndexes
            .map((importInd, i) => [importInd, fromIndexes[i]])
            .map((arr) => {
            const [startIndex, endIndex] = arr;
            //const indexes = [];
            //let i = +arr[0];
            //while (i <= +arr[1]) {
            //  indexes.push(i);
            //  i++;
            //}
            const indexes = [];
            for (let i = startIndex; i <= endIndex; i += 1) {
                indexes.push(i);
            }
            return indexes;
        })
            .reduce((prev, curr) => prev.concat(curr));
        // append rest
        sourceLines.forEach((line, i) => {
            if (!targetIndexes.includes(i)) {
                targetLines.push(line);
            }
        });
        return targetLines;
    }
    return sourceLines.filter((line) => line.length !== 0);
    //
    /**
     * @returns Array of indexes that matches the given filter.
     */
    function getAllIndexes(lines, filter) {
        //let indexes: number[] = [];
        //lines.forEach((line, i) => {
        //  if (filter(line)) indexes.push(i);
        //});
        //return indexes;
        return lines.reduce((indexes, line, index) => {
            if (filter(line))
                indexes.push(index);
            return indexes;
        }, []);
    }
}
/** Create a 'require' string */
function createRequireString(line) {
    line = line.trim();
    // extract PATH and NAME part (eg. 'import esmToCjs from "esm_to_cjs.js"')
    const path = extractPathPart(line);
    const name = extractNamePart(line);
    // no name part (eg. 'import "esm_to_cjs.js"')
    if (!name && path)
        return `require(${path});`;
    // import without any relative paths
    // eg.      'import { foo } from "bar"'
    // but not: 'import { foo } from "./bar"'
    if (name?.match(/\{/i) &&
        name?.match(/\}/i) &&
        //
        path &&
        !path.match(/[.]\//i)) {
        const nameString = line.match(/{(.+?)}/i)?.[1].trim();
        const extraName = line
            .match(/import(.+?){/i)?.[1]
            .trim()
            .replace(",", "") ||
            line
                .match(/}(.+?)from/i)?.[1]
                .trim()
                .replace(",", "") ||
            null;
        //
        if (nameString?.includes(",")) {
            const names = nameString.split(",").map((name) => name.trim());
            let returnedString = extraName
                ? `const ${extraName} = require(${path});\n`
                : "";
            names.forEach((name, i) => {
                if (name.includes(" as ")) {
                    const [originalName, newName] = name
                        .split(" as ")
                        .map((name) => name.trim());
                    if (i === names.length - 1) {
                        returnedString = `${returnedString}const ${newName} = require(${path}).${originalName};`;
                    }
                    else {
                        returnedString = `${returnedString}const ${newName} = require(${path}).${originalName};\n`;
                    }
                }
                else {
                    if (i === names.length - 1) {
                        returnedString = `${returnedString}const ${name} = require(${path}).${name};`;
                    }
                    else {
                        returnedString = `${returnedString}const ${name} = require(${path}).${name};\n`;
                    }
                }
            });
            return returnedString;
        }
        //
        else {
            if (nameString?.includes(" as ")) {
                const [originalName, newName] = nameString
                    .split(" as ")
                    .map((name) => name.trim());
                return extraName
                    ? `const ${extraName} = require(${path});\nconst ${newName} = require(${path}).${originalName};`
                    : `const ${newName} = require(${path}).${originalName};`;
            }
            else {
                return extraName
                    ? `const ${extraName} = require(${path});\nconst ${nameString} = require(${path}).${nameString};`
                    : `const ${nameString} = require(${path}).${nameString};`;
            }
        }
    }
    //
    if (name?.match(/\{/i) && name?.match(/\}/i) && path?.match(/\.\//i)) {
        const nameSring = line.match(/{(.+?)}/i)?.[1].trim();
        if (nameSring && nameSring.includes(",")) {
            const names = nameSring
                .split(",")
                .map((name) => name.trim())
                .filter((name) => name.length !== 0);
            let returnedString = "";
            names.forEach((name, i) => {
                if (i === names.length - 1) {
                    returnedString = `${returnedString}const ${name} = require(${path}).${name};`;
                }
                else {
                    returnedString = `${returnedString}const ${name} = require(${path}).${name};\n`;
                }
            });
            return returnedString;
        }
        //
        else {
            return `const ${nameSring} = require(${path}).${nameSring};`;
        }
    }
    //
    if (name &&
        !name.match(/\{/i) &&
        !name.match(/\}/i) &&
        path &&
        path.match(/\.\//i)) {
        if (name.includes(" * as ")) {
            const modifiedName = name.replace(" * as ", "").trim();
            return `const ${modifiedName} = require(${path});`;
        }
        else {
            return `const ${name} = require(${path});`;
        }
    }
    // default
    return `const ${name} = require(${path});`;
    //
    /**
     * Extract path part from import statement.
     * @example 'import esmToCjs from "esm_to_cjs.js"'
     */
    function extractPathPart(line) {
        const matchedText = line.match(/(\"|\')(.+?)(\"|\')/i);
        return matchedText?.[0].trim();
    }
    /**
     * Extract name part from import statement.
     * @example 'import esmToCjs from "esm_to_cjs.js"'
     */
    function extractNamePart(line) {
        const matchedText = line.match(/import(.*?)from/);
        return matchedText?.[1].trim();
    }
}
/** */
export function convertImportStatements(soureCode) {
    const lines = splitString(soureCode);
    if (lines.length === 1) {
        return createRequireString(lines[0]);
    }
    const convertedStrings = lines
        .filter((line) => line.length !== 0)
        .map((line) => {
        return createRequireString(line);
    });
    //let returnedString = "";
    //convertedStrings.forEach((line, i) => {
    //  if (i === lines.length - 1) {
    //    returnedString = `${returnedString}${line}`;
    //  } else {
    //    returnedString = `${returnedString}${line}\n`;
    //  }
    //});
    //return returnedString;
    return convertedStrings.reduce((stringSoFar, line, i) => {
        //if (i === lines.length - 1) {
        //  return stringSoFar + line;
        //} else {
        //  return stringSoFar + `${line}\n`;
        //}
        stringSoFar += line;
        if (i !== lines.length - 1) {
            stringSoFar += "\n";
        }
        return stringSoFar;
    }, "");
}
//// --- vscode ---
//export function insertText(val: string) {
//  const editor = window.activeTextEditor;
//  if (!editor) {
//    window.showErrorMessage("Can't insert log because no document is open");
//    return;
//  }
//
//  const returnedString = convertImportStatements(val);
//
//  const selection = editor.selection;
//  const range = new Range(selection.start, selection.end);
//
//  editor.edit((editBuilder) => {
//    editBuilder.replace(range, returnedString);
//  });
//}
function replaceAllFoundExports(exportStrings, exportDefaultStrings) {
    const editor = window.activeTextEditor;
    if (!editor)
        return;
    if (exportStrings.length > 0) {
        const exportStringList = Array.of(exportStrings)[0];
        let counter = 0;
        const convertStringA = (exportStringList, counter) => {
            const exportReplacement = "exports.";
            editor
                .edit((editBuilder) => {
                const _range = exportStringList[counter];
                const convertedExportString = Object.entries(_range);
                const start = convertedExportString[0][1];
                const end = convertedExportString[1][1];
                const range = new Range(start, end);
                editBuilder.replace(range, exportReplacement);
            })
                .then(() => {
                counter++;
                if (counter < exportStringList.length) {
                    convertStringA(exportStringList, counter);
                }
            });
        };
        if (counter < exportStringList.length) {
            convertStringA(exportStringList, counter);
        }
    }
    if (exportDefaultStrings.length > 0) {
        const exportDefaultStringList = Array.of(exportDefaultStrings)[0];
        let counterDefault = 0;
        const exportDefaultReplacement = "module.exports = ";
        const convertStringB = (exportDefaultStringList, counterDefault) => {
            editor
                .edit((editBuilder) => {
                const convertedExportString = Object.entries(exportDefaultStringList[counterDefault]);
                const start = convertedExportString[0][1];
                const end = convertedExportString[1][1];
                const range = new Range(start, end);
                editBuilder.replace(range, exportDefaultReplacement);
            })
                .then(() => {
                counterDefault++;
                if (counterDefault < exportDefaultStringList.length) {
                    convertStringB(exportDefaultStringList, counterDefault);
                }
            });
        };
        if (counterDefault < exportDefaultStringList.length) {
            convertStringB(exportDefaultStringList, counterDefault);
        }
    }
}
export function replaceAllExports() {
    const editor = window.activeTextEditor;
    if (!editor)
        return;
    const document = editor.document;
    const documentText = editor.document.getText();
    const exportStrings = getAllExports(document, documentText);
    const exportDefaultStrings = getAllExportDefaults(document, documentText);
    replaceAllFoundExports(exportStrings, exportDefaultStrings);
    //
    function getAllExports(document, documentText) {
        let exportStrings = [];
        const exportRegex = /^export const /gm;
        let match;
        while ((match = exportRegex.exec(documentText))) {
            let matchRange = new Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length));
            if (!matchRange.isEmpty)
                exportStrings.push(matchRange);
        }
        return exportStrings;
    }
    function getAllExportDefaults(document, documentText) {
        let exportDefaultStrings = [];
        const exportDefaultRegex = /^export default |^export /gm;
        let match;
        while ((match = exportDefaultRegex.exec(documentText))) {
            let matchRange = new Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length));
            if (!matchRange.isEmpty)
                exportDefaultStrings.push(matchRange);
        }
        return exportDefaultStrings;
    }
}
//# sourceMappingURL=esm_to_cjs.tlesvesque.js.map