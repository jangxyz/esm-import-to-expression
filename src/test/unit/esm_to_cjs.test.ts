import * as assert from "assert";

import esmToCjs from "../../esm_to_cjs.js";
//import esmToCjs from "../../esm_to_cjs.chatgpt";
//import { convertImportStatements as esmToCjs } from "../../esm_to_cjs.tlesvesque";

import { stripIndent as code } from "common-tags";
import {
  prettifySource as defaultPrettifySource,
  //parseSourceBody,
} from "../../est_helper.js";

// helpers

const stringify = (...args: Parameters<typeof JSON.stringify>) =>
  JSON.stringify(...args);

function prettifySource(source: string): string {
  try {
    return defaultPrettifySource(source, { sourceType: "module" });
  } catch (err) {
    console.warn("failed parsing string", typeof source, stringify(source));
    return source;
  }
}

function assertSameCode(
  code1: string,
  expectedCode: string,
  msg: string | Error = undefined
) {
  assert.equal(prettifySource(code1), prettifySource(expectedCode), msg);
  return true;
}

function assertSameCodeOneOf(code1: string, expectedCodes: string[]) {
  const hasAny = expectedCodes.some(
    (expCode) => prettifySource(code1) === prettifySource(expCode)
  );
  if (hasAny) {
    assert.ok(hasAny);
  } else {
    const msg = `${stringify(code1)} should match one of: [${expectedCodes.map(
      (code) => stringify(code)
    )}]`;
    assert.deepEqual(
      prettifySource(code1),
      expectedCodes.map(prettifySource),
      msg
    );
  }
}

function assertCodeMatchingInPairs(pairs: [string, string | string[]][]) {
  pairs.forEach(([sourceCode, expectedCode]) => {
    const actualCode = esmToCjs(sourceCode);
    if (typeof expectedCode === "string") {
      const msg = `${stringify(sourceCode)} does not convert to ${stringify(
        expectedCode
      )}`;
      assertSameCode(actualCode, expectedCode, msg);
    } else {
      assertSameCodeOneOf(actualCode, expectedCode);
    }
  });
}

describe("basic test suite", () => {
  it("1 + 1 = 2", () => {
    assert.strictEqual(1 + 1, 2);
  });
});

describe("esmToCsv", () => {
  it("interface", () => {
    const sourceCode = code`
      const a = 1 + 1;
      console.log(a * 2);
    `;
    assert.strictEqual(esmToCjs(sourceCode), sourceCode);
  });
});

describe("import statements", () => {
  describe("ImportDeclaration", () => {
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
        code`
          const bar1 = require("mod").foo\n
          const foo2 = require("mod").bar
        `,
      ]);

      //
      const sourceCode4 = `import {foo, bar as bar2} from "mod";`;
      assertSameCodeOneOf(esmToCjs(sourceCode4), [
        `const { foo, bar: bar2 } = require("mod")`,
        code`
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

describe.only("export statements", () => {
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
    const pairs: [string, string | string[]][] = [
      [
        code`
          const foo = 1;
          export { foo };
        `,
        code`
          const foo = 1;
          module.exports = {};
          module.exports.foo = foo;
        `,
      ],

      // export as declaration
      [
        code`
          export const foo = 1;
        `,
        code`
          const foo = 1;
          module.exports = {};
          module.exports.foo = foo;
        `,
      ],
      [
        code`
          export const foo = 1, bar = 2;
        `,

        [
          code`
            const foo = 1;
            const bar = 2;
            module.exports = {};
            module.exports.foo = foo;
            module.exports.bar = bar;
          `,
          code`
            const foo = 1, bar = 2;
            module.exports = {};
            module.exports.foo = foo;
            module.exports.bar = bar;
          `,
        ],
      ],

      // export function
      [
        code`
          function foo() { return 1 };
          export { foo };
        `,
        code`
          function foo() { return 1 };
          module.exports = {};
          module.exports.foo = foo;
        `,
      ],

      // export function as declaration
      [
        code`
          export function foo() { return 1 };
        `,
        code`
          function foo() { return 1 };
          module.exports = {};
          module.exports.foo = foo;
        `,
      ],

      //// multiple exports
      //[
      //  code`
      //    const foo = 1;
      //    const bar = 2;
      //    export {foo, bar as bar2};
      //    export let baz = 3;
      //  `,
      //  code`
      //    const foo = 1;
      //    const bar = 2;
      //    module.exports = {};
      //    module.exports.foo = foo;
      //    module.exports.bar = bar;
      //  `,
      //],

      //[ `export {bar as foo};`, code` module.exports = {}; module.exports.foo = bar; `, ],
    ];

    assertCodeMatchingInPairs(pairs);
  });

  describe.only("ExportDefaultDeclaration", () => {
    it("anonymouse function", () => {
      const pairs: [string, string | string[]][] = [
        [
          `export default function () { return 1 }`,
          code`
            module.exports = {};
            module.exports.default = function () { return 1};
          `,
        ],
      ];
      assertCodeMatchingInPairs(pairs);
    });

    it("named function", () => {
      const pairs: [string, string | string[]][] = [
        // named function
        [
          `export default function fooFunc() { return 1 }`,
          code`
          module.exports = {};
          module.exports.default = function fooFunc() { return 1 };
        `,
        ],
        [
          code`
          function fooFunc() { 
            return 1 
          }
          export default fooFunc;
        `,
          [
            code`
            module.exports = {};
            module.exports.default = function fooFunc() { 
              return 1 
            };
          `,
            code`
            function fooFunc() { 
              return 1 
            }
            module.exports = {};
            module.exports.default = fooFunc;
          `,
          ],
        ],
      ];
      assertCodeMatchingInPairs(pairs);
    });

    it("constants", () => {
      const pairs: [string, string | string[]][] = [
        [
          `export default 1;`,
          code`
            module.exports = {};
            module.exports.default = 1;
          `,
        ],
      ];
      assertCodeMatchingInPairs(pairs);
    });
  });

  it.skip("ExportAllDeclaration", () => {
    const pairs = [
      [`export * from "mod";`, `module.exports = require("mod");`],
      [`export * as foo from "mod";`, `module.exports.foo = require("mod");`],
    ];
    pairs.forEach(([sourceCode, expectedCode]) => {
      assertSameCode(esmToCjs(sourceCode), expectedCode);
    });
  });
});
