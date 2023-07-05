import { readFileSync } from "node:fs";
import { basename } from "node:path";
import convert from "../out/esm_to_top_level_await.js";

let data = "";

// read from file
if (process.argv.length > 2) {
  const inputFilepath = process.argv[2];
  // print Usage and exit
  if (inputFilepath === "-h" || inputFilepath === "--help") {
    const appName = basename(process.argv[1]);
    console.log(
      "Convert code with ESM import statements into dynamic import expressions."
    );
    console.log();
    console.log(`    Usage: node ${appName} FILENAME`);
    console.log();
    process.exit(0);
  }

  data = readFileSync(inputFilepath, "utf-8");
  convertToDynamicExpression(data);
}
// read from stdin
else {
  const stdin = process.openStdin();
  stdin.on("data", function (chunk) {
    data += chunk;
  });
  stdin.on("end", function () {
    convertToDynamicExpression(data);
  });
}

/**
 * @param {string} data
 */
function convertToDynamicExpression(data) {
  //console.log("DATA:\n" + data + "\nEND DATA");
  const data1 = convert(data);
  console.log(data1);
}
