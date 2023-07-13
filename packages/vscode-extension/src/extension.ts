import * as vscode from "vscode";
import esmImportStatementsToDynamicExpressions from "./esm_import_to_expression.js";

export function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "jangxyz-esm-import-expression.copy-as-import-expression",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      // convert
      const transformedText = esmImportStatementsToDynamicExpressions(text);

      try {
        await vscode.env.clipboard.writeText(transformedText);
        vscode.window.showInformationMessage("Copied to clipboard.");
      } catch (err) {
        vscode.window.showErrorMessage(
          "Failed to copy selection: " + err.message
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
