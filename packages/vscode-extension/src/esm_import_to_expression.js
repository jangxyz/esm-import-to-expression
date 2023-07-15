import { walk } from "estree-walker";
import { buildSource, parseSource } from "./est_helper.js";
import { assignmentProperty, awaitExpression, importExpression, objectPattern, variableDeclaration, variableDeclarator, } from "./est_builder.js";
export default function esmImportStatementsToDynamicExpressions(source) {
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
function convert_ImportDeclaration_to_VariableDeclaration(tree) {
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
                        variableDeclarator(objectPattern([
                            assignmentProperty("default", ident, { shorthand: false }),
                        ]), 
                        //callExpression("require", [source])
                        awaitExpression(importExpression(source))),
                    ]);
                    this.replace(replacement);
                }
                // case: "import { foo as foo1, bar as bar2 } from 'mod';"
                else if (node.specifiers.every(check_ImportSpecifier)) {
                    const { source, specifiers } = node;
                    // "const { foo: foo1, bar: bar2 } = await import('mod')"
                    const replacement = variableDeclaration("const", [
                        variableDeclarator(objectPattern(specifiers.map(({ local, imported }) => assignmentProperty(imported, local, {
                            shorthand: imported.name === local.name,
                        }))), 
                        //callExpression("require", [source])
                        awaitExpression(importExpression(source))),
                    ]);
                    this.replace(replacement);
                }
                // case: "import foo, { bar } from 'mod';"
                else if (check_single_ImportDefaultSpecifier_with_ImportSpecifiers(node)) {
                    const { source, specifiers } = node;
                    // "const { default: foo, bar } = await import('mod')"
                    const replacement = variableDeclaration("const", [
                        variableDeclarator(objectPattern(specifiers.map((spec) => {
                            const { local } = spec;
                            const key = spec.type === "ImportSpecifier"
                                ? spec.imported.name
                                : "default";
                            return assignmentProperty(key, local, {
                                shorthand: key === local.name,
                            });
                        })), 
                        //callExpression("require", [source])
                        awaitExpression(importExpression(source))),
                    ]);
                    this.replace(replacement);
                }
                // "import * as foo from 'mod';"
                else if (check_only_ImportNamespaceSpecifier(node)) {
                    const { source, specifiers: [{ local: ident }], } = node;
                    // "const foo = await import('mod')"
                    const replacement = variableDeclaration("const", [
                        variableDeclarator(ident, 
                        //callExpression("require", [source])
                        awaitExpression(importExpression(source))),
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
function check_ImportDeclaration(node) {
    if (node.type !== "ImportDeclaration")
        return false;
    if (node.source.type !== "Literal")
        return false;
    return true;
}
// "import foo from 'mod';"
function check_only_ImportDefaultSpecifier(node) {
    if (node.specifiers.length !== 1)
        return false;
    return check_ImportDefaultSpecifier(node.specifiers[0]);
}
function check_single_ImportDefaultSpecifier_with_ImportSpecifiers(node) {
    const { specifiers } = node;
    const indexes = specifiers
        .map((node, index) => [check_ImportDefaultSpecifier(node), index])
        .filter(([isImportDfaultSepcifier]) => isImportDfaultSepcifier)
        .map(([_, index]) => index);
    // there can be only one ImportDefaultSpecfieir
    if (indexes.length !== 1)
        return false;
    const otherSpecs = specifiers.filter((_, index) => !indexes.includes(index));
    return otherSpecs.every(check_ImportSpecifier);
}
// "import * as foo from 'mod';"
function check_only_ImportNamespaceSpecifier(node) {
    if (node.specifiers.length !== 1)
        return false;
    return check_ImportNameSpecifier(node.specifiers[0]);
}
// check specifier
// "import { foo as foo1, bar as bar2 } from 'mod';"
function check_ImportSpecifier(spec) {
    if (spec.type !== "ImportSpecifier")
        return false;
    if (spec.local.type !== "Identifier")
        return false;
    if (spec.imported.type !== "Identifier")
        return false;
    return true;
}
function check_ImportNameSpecifier(spec) {
    if (spec.type !== "ImportNamespaceSpecifier")
        return false;
    if (spec.local.type !== "Identifier")
        return false;
    return true;
}
function check_ImportDefaultSpecifier(spec) {
    if (spec.type !== "ImportDefaultSpecifier")
        return false;
    if (spec.local.type !== "Identifier")
        return false;
    return true;
}
// ExporttDeclaration
function check_Export_any_Declaration(node) {
    const { type } = node;
    return type.startsWith("Export") && type.endsWith("Declaration");
}
function check_ExportNamedDeclaration(node) {
    if (node.type !== "ExportNamedDeclaration")
        return false;
    if (node.source)
        return false;
    return true;
}
function check_ExportDefaultDeclaration(node) {
    if (node.type !== "ExportDefaultDeclaration")
        return false;
    return true;
}
// main
//# sourceMappingURL=esm_import_to_expression.js.map