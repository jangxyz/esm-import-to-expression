/**
 * @typedef {import("estree").Identifier} Identifier
 * @typedef {import("estree").ObjectPattern} ObjectPattern
 * @typedef {import("estree").Property} Property
 * @typedef {import("estree").AssignmentProperty} AssignmentProperty
 * @typedef {import("estree").RestElement} RestElement
 * @typedef {import("estree").SpreadElement} SpreadElement
 * @typedef {import("estree").ExpressionStatement} ExpressionStatement
 * @typedef {import("estree").Expression} Expression
 * @typedef {import("estree").AssignmentExpression} AssignmentExpression
 * @typedef {import("estree").ObjectExpression} ObjectExpression
 * @typedef {import("estree").MemberExpression} MemberExpression
 * @typedef {import("estree").VariableDeclarator} VariableDeclarator
 * @typedef {import("estree").VariableDeclaration} VariableDeclaration
 * @typedef {import("estree").Super} Super
 */

/**
 *
 * @param {string} name
 * @returns {Identifier}
 */
export function identifier(name) {
  return { type: "Identifier", name };
}

/**
 * Normalize string into Identifier
 * @template T
 * @param {string | T} value
 * @returns {Identifier | T}
 */
function normIdent(value) {
  if (typeof value === "string") {
    return identifier(value);
  }
  return value;
}

/**
 * @param {Expression} expression
 * @returns {ExpressionStatement}
 */
export function expressionStatement(expression) {
  return {
    type: "ExpressionStatement",
    expression,
  };
}

/**
 *
 * @param   {(Property|SpreadElement)[]} properties
 * @returns {ObjectExpression}
 */
export function objectExpression(properties = []) {
  return {
    type: "ObjectExpression",
    properties,
  };
}

/**
 * @param {MemberExpression['object'] | string} object
 * @param {MemberExpression['property']| string} property
 * @param {{ computed?: boolean; optional?: boolean }?} [options = {}]
 * @returns {MemberExpression}
 */
export function memberExpression(object, property, options) {
  const { computed, optional } = {
    computed: false,
    optional: false,
    ...options,
  };
  return {
    type: "MemberExpression",
    object: normIdent(object),
    property: normIdent(property),
    computed,
    optional,
  };
}

/**
 * @param {AssignmentExpression['left']} left
 * @param {AssignmentExpression['operator']} operator
 * @param {AssignmentExpression['right'] | string} right
 * @returns {AssignmentExpression}
 */
export function assignmentExpression(left, operator, right) {
  return {
    type: "AssignmentExpression",
    left,
    operator,
    right: normIdent(right),
  };
}

/**
 * Build CallExpression object.
 *
 * @example
   {
     "type": "CallExpression",
     "callee": { "type": "Identifier", "name": "require" },
     "arguments": [
       { "type": "Literal", "value": "mod", "raw": "\"mod\"" }
     ],
     "optional": false
   }
 * 
 * @param {Expression|Super|string} callee
 * @param {(Expression|SpreadElement)[]} args
 * @param {{optional: boolean}?} options
 * @returns {import("estree").CallExpression}
 */
export function callExpression(callee, args, options = {}) {
  const { optional } = { optional: false, ...options };
  return {
    type: "CallExpression",
    callee: normIdent(callee),
    arguments: args,
    optional,
  };
}

/**
 * @param {Expression|string} source
 * @returns {import("estree").ImportExpression}
 */
export function importExpression(source) {
  return {
    type: "ImportExpression",
    source: normIdent(source),
  };
}

/**
 * @param {Expression|string} argument
 * @returns {import("estree").AwaitExpression}
 */
export function awaitExpression(argument) {
  return {
    type: "AwaitExpression",
    argument: normIdent(argument),
  };
}

/**
 *
 * @param {ObjectPattern['properties'] | ObjectPattern['properties'][number]} properties
 * @returns {ObjectPattern}
 */
export function objectPattern(properties) {
  if (!Array.isArray(properties)) {
    properties = [properties];
  }
  return {
    type: "ObjectPattern",
    properties,
  };
}

/**
 *
 * @param {Property['key'] | string} key
 * @param {Property['value'] | string} value
 * @param {Property['kind']} [kind='init']
 * @param {Partial<{ method: boolean; shorthand: boolean; computed: boolean }>} [options={}]
 * @returns {Property}
 */
export function property(key, value, kind = "init", options = {}) {
  const { shorthand, method, computed } = {
    shorthand: false,
    method: false,
    computed: false,
    ...options,
  };

  return {
    type: "Property",
    key: normIdent(key),
    value: normIdent(value),
    kind,
    shorthand,
    method,
    computed,
  };
}

/**
 * @example
 * {
     "kind"     : "init"
     "type"     : "Property",
     "key"      : { "type": "Identifier", "name": "foo" },
     "value"    : { "type": "Identifier", "name": "bar" },
     "method"   : false,
     "shorthand": false,
     "computed" : false
   }
 * @param {AssignmentProperty['key'] | string} key
 * @param {AssignmentProperty['value'] | string} value
 * @param {{ method?: boolean; shorthand?: boolean; computed?: boolean }} [options={}]
 * @returns {AssignmentProperty}
 */
export function assignmentProperty(key, value, options = {}) {
  return property(key, value, "init", options);
}

/**
 * Build VariableDeclarator object.
 * @param {VariableDeclarator['id'] | string} id
 * @param {(VariableDeclarator['init'] | string)?} init
 * @returns {VariableDeclarator}
 */
export function variableDeclarator(id, init) {
  return {
    type: "VariableDeclarator",
    id: normIdent(id),
    init: normIdent(init),
  };
}

/**
 * Build VariableDeclartion object.
 * @param {VariableDeclaration['kind']} kind
 * @param {VariableDeclarator[]} declarations
 * @returns {VariableDeclaration}
 */
export function variableDeclaration(kind, declarations) {
  return {
    type: "VariableDeclaration",
    kind,
    declarations,
  };
}
