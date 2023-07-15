export default function esmToCjs(code) {
    const importRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
    const transformedCode = code.replace(importRegex, 'const $1 = require("$2")');
    return transformedCode;
}
//# sourceMappingURL=esm_to_cjs.chatgpt.js.map