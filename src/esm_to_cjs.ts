//import { selectAll } from "unist-util-select";
import { walk } from "estree-walker";

import { buildSource, parseSource } from "./est_helper.js";
import type {
  ImportDeclaration,
  ImportDefaultSpecifier,
  Node,
  Program,
} from "estree";
import {
  callExpression,
  variableDeclaration,
  variableDeclarator,
} from "./est_builder.js";

export default function esmToCjs(source: string): string {
  let tree = parseSource(source, { sourceType: "module" });
  tree = convert_ImportDeclaration_to_VariableDeclaration(tree);
  const source2 = buildSource(tree);
  return source2;
}

/**
 *
 * @example
 *   'import foo from "mod";'
 *   => 'const foo = require("mod")'
 *
 */
function convert_ImportDeclaration_to_VariableDeclaration(
  tree: Program
): Program {
  walk(tree, {
    enter(node, parent, prop, index) {
      // some code happens
      //console.log("Enter:", node.type, prop, index, parent?.type);

      if (checkStructure_defaultImport(node)) {
        const {
          source,
          specifiers: [{ local }],
        } = node;

        const replace = variableDeclaration("const", [
          variableDeclarator(local, callExpression("require", [source])),
        ]);
        this.replace(replace);
      }
    },
    leave(node, parent, prop, index) {
      // some code happens
    },
  });
  //console.dir(tree.body, { depth: null });

  return tree;
}

function checkStructure_defaultImport(node: Node): node is ImportDeclaration & {
  specifiers: [ImportDefaultSpecifier];
} {
  if (node.type !== "ImportDeclaration") return false;
  if (node.source.type !== "Literal") return false;
  if (node.specifiers.length !== 1) return false;

  const spec1 = node.specifiers[0];
  if (spec1.type !== "ImportDefaultSpecifier") return false;
  if (spec1.local.type !== "Identifier") return false;

  return true;
}
