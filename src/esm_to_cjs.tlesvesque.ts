import { window, commands, Range, TextDocument } from "vscode";

function getAllIndexes(
  arr: string[],
  func: (item: string) => unknown
): number[] {
  let indexes: number[] = [];
  arr.forEach((line, i) => {
    if (func(line)) indexes.push(i);
  });
  return indexes;
}

function splitString(str: string) {
  const trimString = str.trim();
  const lineArr = trimString.split("\n").map((line) => line.trim());
  const importIndex = getAllIndexes(lineArr, (line) => line === "import {");
  const fromIndex = getAllIndexes(
    lineArr,
    (line) =>
      line.match(/} from/) && !line.match(/import {/) && !line.match(/, {/)
  );

  if (importIndex.length > 0 && fromIndex.length > 0) {
    const indexList = importIndex
      .map((importInd, i) => [importInd, fromIndex[i]])
      .map((arr) => {
        const indexes = [];
        let i = +arr[0];
        while (i <= +arr[1]) {
          indexes.push(i);
          i++;
        }
        return indexes;
      })
      .reduce((prev, curr) => prev.concat(curr));
    const arrays = importIndex
      .map((index, i) => lineArr.slice(index, fromIndex[i] + 1))
      .map((arr) => arr.join(""));
    lineArr.forEach((line, i) => {
      if (!indexList.includes(i)) arrays.push(line);
    });
    return arrays;
  } else {
    return lineArr.filter((line) => line.length !== 0);
  }
}

function extractPath(str: string) {
  const matchedText = str.match(/(\"|\')(.+?)(\"|\')/i);
  return matchedText && matchedText[0].trim();
}

function extractName(str: string): string | null {
  const matchedText = str.match(/import(.*?)from/);
  return matchedText && matchedText[1].trim();
}

function createRequireString(str: string): string {
  const path = extractPath(str);
  const name = extractName(str);

  if (!name && path) return `require(${path});`;

  if (
    name &&
    name.match(/\{/i) &&
    name.match(/\}/i) &&
    path &&
    !path.match(/\.\//i)
  ) {
    const nameString = str.match(/{(.+?)}/i)?.[1].trim();
    const extraName =
      str
        .match(/import(.+?){/i)?.[1]
        .trim()
        .replace(",", "") ||
      str
        .match(/}(.+?)from/i)?.[1]
        .trim()
        .replace(",", "") ||
      null;

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
          } else {
            returnedString = `${returnedString}const ${newName} = require(${path}).${originalName};\n`;
          }
        } else {
          if (i === names.length - 1) {
            returnedString = `${returnedString}const ${name} = require(${path}).${name};`;
          } else {
            returnedString = `${returnedString}const ${name} = require(${path}).${name};\n`;
          }
        }
      });
      return returnedString;
    } else {
      if (nameString?.includes(" as ")) {
        const [originalName, newName] = nameString
          .split(" as ")
          .map((name) => name.trim());
        return extraName
          ? `const ${extraName} = require(${path});\nconst ${newName} = require(${path}).${originalName};`
          : `const ${newName} = require(${path}).${originalName};`;
      } else {
        return extraName
          ? `const ${extraName} = require(${path});\nconst ${nameString} = require(${path}).${nameString};`
          : `const ${nameString} = require(${path}).${nameString};`;
      }
    }
  }

  if (name?.match(/\{/i) && name?.match(/\}/i) && path?.match(/\.\//i)) {
    const nameSring = str.match(/{(.+?)}/i)?.[1].trim();

    if (nameSring && nameSring.includes(",")) {
      const names = nameSring
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name.length !== 0);
      let returnedString = "";
      names.forEach((name, i) => {
        if (i === names.length - 1) {
          returnedString = `${returnedString}const ${name} = require(${path}).${name};`;
        } else {
          returnedString = `${returnedString}const ${name} = require(${path}).${name};\n`;
        }
      });
      return returnedString;
    } else {
      return `const ${nameSring} = require(${path}).${nameSring};`;
    }
  }

  if (
    name &&
    !name.match(/\{/i) &&
    !name.match(/\}/i) &&
    path &&
    path.match(/\.\//i)
  ) {
    if (name.includes(" * as ")) {
      const modifiedName = name.replace(" * as ", "").trim();
      return `const ${modifiedName} = require(${path});`;
    } else {
      return `const ${name} = require(${path});`;
    }
  }

  return `const ${name} = require(${path});`;
}

export function parseString(str: string) {
  const arrayedString = splitString(str);
  if (arrayedString.length === 1) {
    return createRequireString(arrayedString[0].trim());
  } else {
    const convertedStrings = arrayedString
      .filter((line) => line.length !== 0)
      .map((line) => createRequireString(line.trim()));
    let returnedString = "";
    convertedStrings.forEach((line, i) => {
      if (i === arrayedString.length - 1) {
        returnedString = `${returnedString}${line}`;
      } else {
        returnedString = `${returnedString}${line}\n`;
      }
    });
    return returnedString;
  }
}

// --- vscode ---

export function insertText(val: string) {
  const editor = window.activeTextEditor;
  if (!editor) {
    window.showErrorMessage("Can't insert log because no document is open");
    return;
  }

  const selection = editor.selection;

  const range = new Range(selection.start, selection.end);
  const returnedString = parseString(val);

  editor.edit((editBuilder) => {
    editBuilder.replace(range, returnedString);
  });
}

function getAllExports(document: TextDocument, documentText: string) {
  let exportStrings = [];

  const exportRegex = /^export const /gm;
  let match;
  while ((match = exportRegex.exec(documentText))) {
    let matchRange = new Range(
      document.positionAt(match.index),
      document.positionAt(match.index + match[0].length)
    );
    if (!matchRange.isEmpty) exportStrings.push(matchRange);
  }
  return exportStrings;
}

function getAllExportDefaults(document: TextDocument, documentText: string) {
  let exportDefaultStrings = [];

  const exportDefaultRegex = /^export default |^export /gm;
  let match;
  while ((match = exportDefaultRegex.exec(documentText))) {
    let matchRange = new Range(
      document.positionAt(match.index),
      document.positionAt(match.index + match[0].length)
    );
    if (!matchRange.isEmpty) exportDefaultStrings.push(matchRange);
  }
  return exportDefaultStrings;
}

function replaceAllFoundExports(
  exportStrings: Range[],
  exportDefaultStrings: Range[]
) {
  const editor = window.activeTextEditor;
  if (!editor) return;

  if (exportStrings.length > 0) {
    const exportStringList = Array.of(exportStrings)[0];
    let counter = 0;

    const convertString = (exportStringList: Range[], counter: number) => {
      const exportReplacement = "exports.";
      editor
        .edit((editBuilder) => {
          const convertedExportString = Object.entries(
            exportStringList[counter]
          );
          const start = convertedExportString[0][1];
          const end = convertedExportString[1][1];
          const range = new Range(start, end);
          editBuilder.replace(range, exportReplacement);
        })
        .then(() => {
          counter++;
          if (counter < exportStringList.length) {
            convertString(exportStringList, counter);
          }
        });
    };

    if (counter < exportStringList.length) {
      convertString(exportStringList, counter);
    }
  }

  if (exportDefaultStrings.length > 0) {
    const exportDefaultStringList = Array.of(exportDefaultStrings)[0];
    let counterDefault = 0;
    const exportDefaultReplacement = "module.exports = ";

    const convertString = (
      exportDefaultStringList: Range[],
      counterDefault: number
    ) => {
      editor
        .edit((editBuilder) => {
          const convertedExportString = Object.entries(
            exportDefaultStringList[counterDefault]
          );
          const start = convertedExportString[0][1];
          const end = convertedExportString[1][1];
          const range = new Range(start, end);
          editBuilder.replace(range, exportDefaultReplacement);
        })
        .then(() => {
          counterDefault++;
          if (counterDefault < exportDefaultStringList.length) {
            convertString(exportDefaultStringList, counterDefault);
          }
        });
    };

    if (counterDefault < exportDefaultStringList.length) {
      convertString(exportDefaultStringList, counterDefault);
    }
  }
}

const replaceAllExports = () => {
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const documentText = editor.document.getText();

  const exportStrings = getAllExports(document, documentText);
  const exportDefaultStrings = getAllExportDefaults(document, documentText);

  replaceAllFoundExports(exportStrings, exportDefaultStrings);
};
