import * as assert from "assert";

//import esmToCjs from "../../esm_to_cjs";
import esmToCjs from "../../esm_to_cjs.chatgpt";
import { stripIndent } from "common-tags";
import { prettifySource as deafultPrettifySource } from "../../est_helper.js";

function prettifySource(source: string): string {
  return deafultPrettifySource(source, { sourceType: "module" });
}

describe("basic test suite", () => {
  it("1 + 1 = 2", () => {
    assert.strictEqual(1 + 1, 2);
  });
});

describe("esmToCsv", () => {
  it("interface", () => {
    const sourceCode = stripIndent`
      const a = 1 + 1;
      console.log(a * 2);
    `;
    assert.strictEqual(esmToCjs(sourceCode), sourceCode);
  });
});

describe("import statements", () => {
  describe.only("ImportDeclaration", () => {
    it("ImportSpecifier", () => {
      //
      const sourceCode1 = `import {foo} from "mod";`;
      assert.strictEqual(
        esmToCjs(sourceCode1),
        `const { foo } = require("mod")`
      );
      //
      const sourceCode2 = `import {foo as bar} from "mod";`;
      assert.strictEqual(
        esmToCjs(sourceCode2),
        `const { foo: bar } = require("mod")`
      );
    });

    it.only("ImportDefaultSpecifier", () => {
      const sourceCode = `import foo from "mod";`;
      assert.strictEqual(
        prettifySource(esmToCjs(sourceCode)),
        prettifySource(`const foo = require("mod")`)
      );
    });

    it("ImportNamespaceSpecifier", () => {
      const sourceCode = `import * as foo from "mod";`;
      assert.strictEqual(esmToCjs(sourceCode), `const foo = require("mod")`);
    });
  });
});

describe.skip("export statements", () => {
  it("ExportNamedDeclaration", () => {
    const pairs = [
      [`export {foo};`, `module.exports = { foo };`],
      [`export {foo, bar};`, `module.exports = { foo, bar };`],
      [`export var foo = 1;`, `module.exports.foo = 1;`],
    ];
  });

  it("ExportSpecifier", () => {
    const pairs = [
      [
        `export {foo};`,
        stripIndent`
            module.exports = {};
            module.exports.foo = foo;
          `,
      ],
      [
        `export {foo, bar};`,
        stripIndent`
            module.exports = {};
            module.exports.foo = foo;
            module.exports.bar = bar;
          `,
      ],
      [
        `export {bar as foo};`,
        stripIndent`
            module.exports = {};
            module.exports.foo = bar;
          `,
      ],
    ];
  });

  it("ExportDefaultDeclaration", () => {
    const pairs = [
      [`export default function () {};`, ``],
      [`export default 1;`, ``],
    ];
  });

  it("ExportAllDeclaration", () => {
    const pairs = [
      [`export * from "mod";`, `module.exports = require("mod");`],
      [`export * as foo from "mod";`, `module.exports.foo = require("mod");`],
    ];
  });
});
