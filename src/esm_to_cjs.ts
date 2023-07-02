//import { selectAll } from "unist-util-select";
import { walk } from "estree-walker";

import { buildSource, parseSource } from "./est_helper.js";
import type {
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  Node,
  Program,
} from "estree";
import {
  assignmentProperty,
  callExpression,
  objectPattern,
  property,
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

      if (check_ImportDeclaration(node)) {
        // "import foo from 'mod';"
        if (check_only_ImportDefaultSpecifier(node)) {
          const { source } = node;
          const [{ local: ident }] = node.specifiers;

          // "const { default: foo } = require('mod')"
          const replacing = variableDeclaration("const", [
            variableDeclarator(
              objectPattern([
                assignmentProperty("default", ident, { shorthand: false }),
              ]),
              callExpression("require", [source])
            ),
          ]);

          this.replace(replacing);
        }

        // "import { foo as foo1, bar as bar2 } from 'mod';"
        else if (node.specifiers.every(check_ImportSpecifier)) {
          const { source, specifiers } = node;

          // "const { foo: foo1, bar: bar2 } = require('mod')"
          const replacing = variableDeclaration("const", [
            variableDeclarator(
              objectPattern(
                specifiers.map(({ local, imported }) =>
                  assignmentProperty(imported, local, {
                    shorthand: imported.name === local.name,
                  })
                )
              ),
              callExpression("require", [source])
            ),
          ]);
          this.replace(replacing);
        }

        // "import foo, { bar } from 'mod';"
        else if (
          check_single_ImportDefaultSpecifier_with_ImportSpecifiers(node)
        ) {
          const { source, specifiers } = node;
          // "const { default: foo, bar } = require('mod')"

          const replacing = variableDeclaration("const", [
            variableDeclarator(
              objectPattern(
                specifiers.map((spec) => {
                  const { local } = spec;
                  const key =
                    spec.type === "ImportSpecifier"
                      ? spec.imported.name
                      : "default";
                  return assignmentProperty(key, local, {
                    shorthand: key === local.name,
                  });
                })
              ),
              callExpression("require", [source])
            ),
          ]);
          this.replace(replacing);
        }

        // "import * as foo from 'mod';"
        else if (check_only_ImportNamespaceSpecifier(node)) {
          const {
            source,
            specifiers: [{ local: ident }],
          } = node;

          // "const foo = require('mod')"
          const replacing = variableDeclaration("const", [
            variableDeclarator(ident, callExpression("require", [source])),
          ]);
          this.replace(replacing);
        }
      }
    },

    //leave(node, parent, prop, index) {},
  });
  //console.dir(tree.body, { depth: null });

  return tree;
}

function check_ImportDeclaration(node: Node): node is ImportDeclaration {
  if (node.type !== "ImportDeclaration") return false;
  if (node.source.type !== "Literal") return false;
  return true;
}

function checkNodeStructureEvery_SpecifiersImportSpecifier(
  node: ImportDeclaration
): node is Omit<ImportDeclaration, "specifiers"> & {
  specifiers: ImportSpecifier[];
} {
  return node.specifiers.every(check_ImportSpecifier);
}

// check: ImportDeclaration

type PossibleImportSpecifier =
  | ImportSpecifier
  | ImportDefaultSpecifier
  | ImportNamespaceSpecifier;

// "import foo from 'mod';"
function check_only_ImportDefaultSpecifier(
  node: ImportDeclaration
): node is ImportDeclaration & {
  specifiers: [ImportDefaultSpecifier];
} {
  if (node.specifiers.length !== 1) return false;
  return check_ImportDefaultSpecifier(node.specifiers[0]);
}

function check_single_ImportDefaultSpecifier_with_ImportSpecifiers(
  node: ImportDeclaration
): node is Omit<ImportDeclaration, "specifiers"> & {
  specifiers: [ImportDefaultSpecifier, ...ImportSpecifier[]];
} {
  const { specifiers } = node;
  const indexes = specifiers
    .map((node, index) => [check_ImportDefaultSpecifier(node), index])
    .filter(([isImportDfaultSepcifier]) => isImportDfaultSepcifier)
    .map(([_, index]) => index);
  // there can be only one ImportDefaultSpecfieir
  if (indexes.length !== 1) return false;

  const otherSpecs = specifiers.filter((_, index) => !indexes.includes(index));
  return otherSpecs.every(check_ImportSpecifier);
}

// "import * as foo from 'mod';"
function check_only_ImportNamespaceSpecifier(
  node: ImportDeclaration
): node is ImportDeclaration & {
  specifiers: [ImportNamespaceSpecifier];
} {
  if (node.specifiers.length !== 1) return false;
  return check_ImportNameSpecifier(node.specifiers[0]);
}

// check specifier

// "import { foo as foo1, bar as bar2 } from 'mod';"
function check_ImportSpecifier(
  spec: PossibleImportSpecifier
): spec is ImportSpecifier {
  if (spec.type !== "ImportSpecifier") return false;
  if (spec.local.type !== "Identifier") return false;
  if (spec.imported.type !== "Identifier") return false;
  return true;
}

function check_ImportNameSpecifier(spec: PossibleImportSpecifier) {
  if (spec.type !== "ImportNamespaceSpecifier") return false;
  if (spec.local.type !== "Identifier") return false;
  return true;
}

function check_ImportDefaultSpecifier(spec: PossibleImportSpecifier) {
  if (spec.type !== "ImportDefaultSpecifier") return false;
  if (spec.local.type !== "Identifier") return false;
  return true;
}
