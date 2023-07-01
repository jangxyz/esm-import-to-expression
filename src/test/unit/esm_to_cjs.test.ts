import * as assert from "assert";
import esmToCjs from "../../esm_to_cjs";

describe("basic test suite", () => {
  it("1 + 1 = 2", () => {
    assert.strictEqual(1 + 1, 2);
  });
});

describe("import statements", () => {
  it("interface", () => {
    assert.strictEqual(esmToCjs("1 + 1"), "1 + 1");
  });
});
