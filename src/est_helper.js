import { parse } from "acorn";
import { generate } from "escodegen";
import { walk } from "estree-walker";

/**
 * @typedef {import("estree").Node} ESTreeNode
 * @typedef {import("estree").Program} Program
 * @typedef {import("estree").Pattern} Pattern
 */

/**
 * @typedef { import("acorn").Options & {position: false} } ParseOptions
 */

/**
 * Parse string into ESTree.
 *
 * Checkout the [spec](https://github.com/estree/estree).
 * Check the result at https://astexplorer.net/
 *
 * @param {string} source
 * @param { Partial<ParseOptions>? } options
 * @returns { Program }
 */
export function parseSource(source, options = {}) {
  const tree = parse(source, { ecmaVersion: "latest", ...options });

  const { position } = { position: true, ...options };
  // remove 'start' and 'end' fields from every node
  if (position === false) {
    walk(tree, {
      enter(node) {
        if ("start" in node) {
          delete node["start"];
        }
        if ("end" in node) {
          delete node["end"];
        }
      },
    });
  }

  return /** @type {Program} */ (tree);
}

/**
 * Parse string, and return only the body of program.
 *
 * @param {string} source
 * @param { Partial<ParseOptions>? } options
 * @returns { Array<Directive | Statement | ModuleDeclaration> }
 */
export function parseSourceBody(source, options = {}) {
  return parseSource(source, options).body;
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
