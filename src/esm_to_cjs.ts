import { walk } from "estree-walker";

import { buildSource, parseSource, stripPosition } from "./est_helper.js";
import {
  assignmentExpression,
  assignmentProperty,
  callExpression,
  expressionStatement,
  memberExpression,
  objectExpression,
  objectPattern,
  variableDeclaration,
  variableDeclarator,
} from "./est_builder.js";
import type {
  AssignmentExpression,
  Directive,
  ExportAllDeclaration,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  MemberExpression,
  ModuleDeclaration,
  Node,
  Program,
  Statement,
} from "estree";

type Body = Directive | Statement | ModuleDeclaration;

export default function esmToCjs(source: string): string {
  let tree = parseSource(source, { sourceType: "module" });
  tree = convert_ImportDeclaration_to_VariableDeclaration(tree);
  tree = convert_ExportDeclaration(tree);

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
      ///console.log("Enter:", node.type, prop, index, parent?.type);

      if (check_ImportDeclaration(node)) {
        // case: "import foo from 'mod';"
        // NOTE this can be also done by `check_single_ImportDefaultSpecifier_with_ImportSpecifiers` block below
        if (check_only_ImportDefaultSpecifier(node)) {
          const { source } = node;
          const [{ local: ident }] = node.specifiers;

          // "const { default: foo } = require('mod')"
          const replacement = variableDeclaration("const", [
            variableDeclarator(
              objectPattern([
                assignmentProperty("default", ident, { shorthand: false }),
              ]),
              callExpression("require", [source])
            ),
          ]);

          this.replace(replacement);
        }

        // case: "import { foo as foo1, bar as bar2 } from 'mod';"
        else if (node.specifiers.every(check_ImportSpecifier)) {
          const { source, specifiers } = node;

          // "const { foo: foo1, bar: bar2 } = require('mod')"
          const replacement = variableDeclaration("const", [
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
          this.replace(replacement);
        }

        // case: "import foo, { bar } from 'mod';"
        else if (
          check_single_ImportDefaultSpecifier_with_ImportSpecifiers(node)
        ) {
          const { source, specifiers } = node;

          // "const { default: foo, bar } = require('mod')"
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
              callExpression("require", [source])
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

          // "const foo = require('mod')"
          const replacement = variableDeclaration("const", [
            variableDeclarator(ident, callExpression("require", [source])),
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

/**
 *
 */
function convert_ExportDeclaration(tree: Program) {
  // we cannot use estree-walk currently, because
  //   - we need to 'insert' new nodes
  //   - but estree-walk does not support that
  //     (see pending PR: https://github.com/Rich-Harris/estree-walker/pull/32)
  //   - we can't *replace* the entire Program because estree checks whether the node has parent.

  const { body: bodyNodes } = tree;

  const targetIndex = bodyNodes.findIndex(check_Export_any_Declaration);
  const result =
    targetIndex !== -1 ? processBodyNode(bodyNodes[targetIndex]) : [];

  //console.log( "🚀 ~ file: esm_to_cjs.ts:165 ~ convert_ExportDeclaration ~ result:");
  //console.dir(result.map(stripPosition), { depth: null });

  //
  const newBody = [
    ...bodyNodes.slice(0, targetIndex),
    ...result,
    ...bodyNodes.slice(targetIndex + 1),
  ];
  //console.log("🚀 ~ file: esm_to_cjs.ts:168 ~ newBody:", { targetIndex });
  //console.dir(newBody.map(stripPosition), { depth: null });

  return {
    ...tree,
    body: newBody,
  };

  function processBodyNode(node: Body): Body[] {
    const result: Body[] = [];

    //console.log("Enter 184:", node);

    // named export
    if (check_ExportNamedDeclaration(node)) {
      // case: "export const foo = 1"
      if (
        node.specifiers.length === 0 &&
        node.declaration?.type === "VariableDeclaration"
      ) {
        // "const foo = 1"
        result.push(node.declaration);

        // "module.exports = {}"
        const moduleExportsAssignment = buildEmptyModuleExportsObject();
        result.push(moduleExportsAssignment);

        // "module.exports.foo = foo;"
        node.declaration.declarations.map((decl) => {
          if (decl.id.type === "Identifier") {
            const assignment = buildModuleExpressionAssigment(decl.id, decl.id);
            result.push(assignment);
          }
        });
      }
      // case: "const foo = 1; export { foo }"
      else if (node.specifiers.length === 1 && !node.declaration) {
        // "module.exports = {}"
        const moduleExportsAssignment = buildEmptyModuleExportsObject();

        // "module.exports.foo = foo;"
        const [spec] = node.specifiers;
        //const assignment = expressionStatement(
        //  assignmentExpression(
        //    memberExpression(
        //      memberExpression("module", "exports"),
        //      spec.exported
        //    ),
        //    "=",
        //    spec.local
        //  )
        //);
        const assignment = buildModuleExpressionAssigment(
          spec.exported,
          spec.local
        );

        //
        result.push(moduleExportsAssignment);
        result.push(assignment);
      }
    }

    // default export
    else if (check_ExportDefaultDeclaration(node)) {
      const { declaration: decl } = node;
      // "export default fooFunc;"
      if (decl.type === "Identifier") {
        // "module.exports = {}"
        const moduleExportsAssignment = buildEmptyModuleExportsObject();

        // "module.exports.default = fooFunc;"
        const assignment = buildModuleExpressionAssigment("default", decl);

        //
        result.push(moduleExportsAssignment);
        result.push(assignment);
      }
      // "export default 1"
      else if (decl.type === "Literal") {
        // "module.exports = {}"
        const moduleExportsAssignment = buildEmptyModuleExportsObject();

        // "module.exports.default = 1;"
        const assignment = buildModuleExpressionAssigment("default", decl);

        //
        result.push(moduleExportsAssignment);
        result.push(assignment);
      }

      // "export default function fooFunc() { return 1 }"
      else if (decl.type === "FunctionDeclaration") {
        // "module.exports = {}"
        const moduleExportsAssignment = buildEmptyModuleExportsObject();

        //
        const _funcExpr =
          convert_FunctionDeclaration_to_FunctionExpression(decl);
        const assignment = buildModuleExpressionAssigment("default", _funcExpr);

        //
        result.push(moduleExportsAssignment);
        result.push(assignment);
      }
    }

    return result;
  }

  // "module.exports = {}"
  function buildEmptyModuleExportsObject() {
    return expressionStatement(
      assignmentExpression(
        memberExpression("module", "exports"),
        "=",
        objectExpression()
      )
    );
  }
  // "module.exports.foo = bar;"
  function buildModuleExpressionAssigment(
    memberProperty: MemberExpression["property"] | string,
    right: AssignmentExpression["right"] | string
  ) {
    return expressionStatement(
      assignmentExpression(
        memberExpression(memberExpression("module", "exports"), memberProperty),
        "=",
        right
      )
    );
  }
}

function convert_FunctionDeclaration_to_FunctionExpression(
  node: FunctionDeclaration
): FunctionExpression {
  return {
    ...structuredClone(node),
    type: "FunctionExpression",
  };
}

// ImportDeclaration

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
