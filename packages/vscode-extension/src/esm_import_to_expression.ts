import { walk } from "estree-walker";

import { buildSource, parseSource } from "./est_helper.js";
import {
  assignmentProperty,
  awaitExpression,
  importExpression,
  objectPattern,
  variableDeclaration,
  variableDeclarator,
} from "./est_builder.js";
import type {
  Directive,
  ExportAllDeclaration,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  ModuleDeclaration,
  Node,
  Program,
  Statement,
} from "estree";

type Body = Directive | Statement | ModuleDeclaration;

export default function esmImportStatementsToDynamicExpressions(
  source: string
): string {
  let tree = parseSource(source, { sourceType: "module" });
  tree = convert_ImportDeclaration_to_VariableDeclaration(tree);

  const source2 = buildSource(tree);
  return source2;
}

/**
 *
 * @example
 *   'import foo from "mod";'
 *   => 'const foo = await import("mod")'
 *
 */
function convert_ImportDeclaration_to_VariableDeclaration(
  tree: Program
): Program {
  walk(tree, {
    enter(node, parent, prop, index) {
      // some code happens
      ///console.log("Enter:", node.type, prop, index, parent?.type);

      if (check_ImportDeclaration(node)) {
        // case: "import foo from 'mod';"
        // NOTE this can be also done by `check_single_ImportDefaultSpecifier_with_ImportSpecifiers` block below
        if (check_only_ImportDefaultSpecifier(node)) {
          const { source } = node;
          const [{ local: ident }] = node.specifiers;

          // "const { default: foo } = await import('mod')"
          const replacement = variableDeclaration("const", [
            variableDeclarator(
              objectPattern([
                assignmentProperty("default", ident, { shorthand: false }),
              ]),
              //callExpression("require", [source])
              awaitExpression(importExpression(source))
            ),
          ]);

          this.replace(replacement);
        }

        // case: "import { foo as foo1, bar as bar2 } from 'mod';"
        else if (node.specifiers.every(check_ImportSpecifier)) {
          const { source, specifiers } = node;

          // "const { foo: foo1, bar: bar2 } = await import('mod')"
          const replacement = variableDeclaration("const", [
            variableDeclarator(
              objectPattern(
                specifiers.map(({ local, imported }) =>
                  assignmentProperty(imported, local, {
                    shorthand: imported.name === local.name,
                  })
                )
              ),
              //callExpression("require", [source])
              awaitExpression(importExpression(source))
            ),
          ]);
          this.replace(replacement);
        }

        // case: "import foo, { bar } from 'mod';"
        else if (
          check_single_ImportDefaultSpecifier_with_ImportSpecifiers(node)
        ) {
          const { source, specifiers } = node;

          // "const { default: foo, bar } = await import('mod')"
          const replacement = variableDeclaration("const", [
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
              //callExpression("require", [source])
              awaitExpression(importExpression(source))
            ),
          ]);
          this.replace(replacement);
        }

        // "import * as foo from 'mod';"
        else if (check_only_ImportNamespaceSpecifier(node)) {
          const {
            source,
            specifiers: [{ local: ident }],
          } = node;

          // "const foo = await import('mod')"
          const replacement = variableDeclaration("const", [
            variableDeclarator(
              ident,
              //callExpression("require", [source])
              awaitExpression(importExpression(source))
            ),
          ]);
          this.replace(replacement);
        }
      }
    },

    //leave(node, parent, prop, index) {},
  });
  //console.dir(tree.body, { depth: null });

  return tree;
}

// ImportDeclaration

function check_ImportDeclaration(node: Node): node is ImportDeclaration {
  if (node.type !== "ImportDeclaration") return false;
  if (node.source.type !== "Literal") return false;
  return true;
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

// ExporttDeclaration

function check_Export_any_Declaration(
  node: Node
): node is
  | ExportNamedDeclaration
  | ExportDefaultDeclaration
  | ExportAllDeclaration {
  const { type } = node;
  return type.startsWith("Export") && type.endsWith("Declaration");
}

function check_ExportNamedDeclaration(
  node: Node
): node is ExportNamedDeclaration {
  if (node.type !== "ExportNamedDeclaration") return false;
  if (node.source) return false;

  return true;
}

function check_ExportDefaultDeclaration(
  node: Node
): node is ExportDefaultDeclaration {
  if (node.type !== "ExportDefaultDeclaration") return false;

  return true;
}

// main
