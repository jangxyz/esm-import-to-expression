import * as assert from "node:assert";

export { stripIndent as code } from "common-tags";
import {
  prettifySource as defaultPrettifySource,
  //parseSourceBody,
} from "../../est_helper.js";

// helpers

export const stringify = (...args: Parameters<typeof JSON.stringify>) =>
  JSON.stringify(...args);

export function prettifySource(source: string): string {
  try {
    return defaultPrettifySource(source, { sourceType: "module" });
  } catch (err) {
    console.warn("failed parsing string", typeof source, stringify(source));
    return source;
  }
}

// assert helpers

export function assertSameCode(
  code1: string,
  expectedCode: string,
  msg: string | Error = undefined
) {
  assert.equal(prettifySource(code1), prettifySource(expectedCode), msg);
  return true;
}

export function assertSameCodeOneOf(code1: string, expectedCodes: string[]) {
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
