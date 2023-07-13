import { describe, it, expect } from "vitest";
import * as assert from "node:assert";

import esmToTopLevelAwait from "../src/esm_import_to_expression.js";
import {
  code,
  stringify,
  assertSameCode,
  assertSameCodeOneOf,
} from "./helpers.js";

describe("basic test suite", () => {
  it("1 + 1 = 2", () => {
    assert.strictEqual(1 + 1, 2);
  });
});

describe("esmToTopLevelAwait", () => {
  it("interface", () => {
    const sourceCode = code`
      const a = 1 + 1;
      console.log(a * 2);
    `;
    assert.strictEqual(esmToTopLevelAwait(sourceCode), sourceCode);
  });
});

//describe("import statements", () => {
//  describe("ImportDeclaration", () => {
//    it("ImportSpecifier", () => {
//      //
//      const sourceCode1 = `import {foo} from 'mod';`;
//      assertSameCode(
//        esmToTopLevelAwait(sourceCode1),
//        `const { foo } = await import('mod')`
//      );

//      //
//      const sourceCode2 = `import {foo as bar} from "mod";`;
//      assertSameCode(
//        esmToTopLevelAwait(sourceCode2),
//        `const { foo: bar } = await import("mod")`
//      );

//      //
//      const sourceCode3 = `import {foo as foo1, bar as bar2} from "mod";`;
//      assertSameCode(
//        esmToTopLevelAwait(sourceCode3),
//        `const { foo: foo1, bar: bar2 } = await import("mod")`
//      );

//      //
//      const sourceCode4 = `import {foo, bar as bar2} from "mod";`;
//      assertSameCode(
//        esmToTopLevelAwait(sourceCode4),
//        `const { foo, bar: bar2 } = await import("mod")`
//      );
//    });

//    it("ImportDefaultSpecifier", () => {
//      const sourceCode1 = `import foo from 'mod';`;
//      assertSameCode(
//        esmToTopLevelAwait(sourceCode1),
//        `const {default: foo} = await import('mod')`
//      );
//    });

//    it("ImportNamespaceSpecifier", () => {
//      const sourceCode = `import * as foo from 'mod';`;
//      assertSameCode(
//        esmToTopLevelAwait(sourceCode),
//        `const foo = await import('mod')`
//      );
//    });

//    it("mixed", () => {
//      const sourceCode = `import foo, { bar } from 'mod';`;
//      assertSameCode(
//        esmToTopLevelAwait(sourceCode),
//        `const { default: foo, bar } = await import("mod")`
//      );
//    });
//  });
//});
