import { parse } from "acorn";
import { generate } from "escodegen";

/**
 * @typedef {import("estree").Node} ESTreeNode
 * @typedef {import("estree").Program} Program
 * @typedef {import("estree").Pattern} Pattern
 */

/**
 * Parse string into ESTree.
 *
 * Checkout the [spec](https://github.com/estree/estree).
 * Check the result at https://astexplorer.net/
 *
 * @param {string} source
 * @param { Partial<import("acorn").Options>? } options
 * @returns { Program } Program
 */
export function parseSource(source, options = {}) {
  const tree = parse(source, { ecmaVersion: "latest", ...options });
  return /** @type {Program} */ (tree);
}

/**
 *
 * @param {ESTreeNode} node
 * @param { Partial<import("escodegen").GenerateOptions>? } options
 * @returns {string}
 */
export function buildSource(node, options = {}) {
  return generate(node, options);
}

/**
 *
 * @param {string} source
 * @param { Partial<import("acorn").Options>? } options
 * @param { import("escodegen").GenerateOptions } options
 */
export function prettifySource(
  source,
  parseOptions = {},
  generateOptions = {}
) {
  const tree = parseSource(source, parseOptions);
  return buildSource(tree, generateOptions);
}
