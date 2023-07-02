import * as assert from "assert";

import esmToCjs from "../../esm_to_cjs.js";
//import esmToCjs from "../../esm_to_cjs.chatgpt";
//import { convertImportStatements as esmToCjs } from "../../esm_to_cjs.tlesvesque";

import { stripIndent } from "common-tags";
import {
  prettifySource as defaultPrettifySource,
  parseSource,
  parseSourceBody,
} from "../../est_helper.js";

function prettifySource(source: string): string {
  return defaultPrettifySource(source, { sourceType: "module" });
}

function assertSameCode(
  code1: string,
  expectedCode: string,
  msg: string | Error = undefined
) {
  return assert.equal(prettifySource(code1), prettifySource(expectedCode), msg);
}

function assertSameCodeOneOf(code1: string, expectedCodes: string[]) {
  const hasAny = expectedCodes.some(
    (expCode) => prettifySource(code1) === prettifySource(expCode)
  );
  if (hasAny) {
    assert.ok(hasAny);
  } else {
    assert.deepEqual(prettifySource(code1), expectedCodes.map(prettifySource));
  }
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

describe.only("import statements", () => {
  describe.only("ImportDeclaration", () => {
    it("ImportSpecifier", () => {
      //
      const sourceCode1 = `import {foo} from "mod";`;
      assertSameCodeOneOf(esmToCjs(sourceCode1), [
        `const { foo } = require("mod")`,
        `const foo = require("mod").foo`,
      ]);

      //
      const sourceCode2 = `import {foo as bar} from "mod";`;
      assertSameCodeOneOf(esmToCjs(sourceCode2), [
        `const { foo: bar } = require("mod")`,
        `const bar = require("mod").foo`,
      ]);

      //
      const sourceCode3 = `import {foo as foo1, bar as bar2} from "mod";`;
      assertSameCodeOneOf(esmToCjs(sourceCode3), [
        `const { foo: foo1, bar: bar2 } = require("mod")`,
        stripIndent`
          const bar1 = require("mod").foo\n
          const foo2 = require("mod").bar
        `,
      ]);

      //
      const sourceCode4 = `import {foo, bar as bar2} from "mod";`;
      assertSameCodeOneOf(esmToCjs(sourceCode4), [
        `const { foo, bar: bar2 } = require("mod")`,
        stripIndent`
          const bar  = require("mod").foo\n
          const foo2 = require("mod").bar
        `,
      ]);
    });

    it("ImportDefaultSpecifier", () => {
      const sourceCode1 = `import foo from 'mod';`;
      assertSameCode(
        esmToCjs(sourceCode1),
        `const {default: foo} = require('mod')`
      );
    });

    it("ImportNamespaceSpecifier", () => {
      const sourceCode = `import * as foo from 'mod';`;
      assertSameCode(esmToCjs(sourceCode), `const foo = require('mod')`);
    });

    it("mixed", () => {
      const sourceCode = `import foo, { bar } from 'mod';`;
      //console.dir(parseSourceBody(sourceCode, { sourceType: "module", position: false }), { depth: null, });
      assertSameCode(
        esmToCjs(sourceCode),
        `const { default: foo, bar } = require("mod")`
      );
    });
  });
});

describe("export statements", () => {
  it("ExportNamedDeclaration", () => {
    const pairs = [
      [`export {foo};`, `module.exports = { foo };`],
      [`export {foo, bar};`, `module.exports = { foo, bar };`],
      [`export var foo = 1;`, `module.exports.foo = 1;`],
    ];
    pairs.forEach(([sourceCode, expectedCode]) => {
      assertSameCode(esmToCjs(sourceCode), expectedCode);
    });
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
