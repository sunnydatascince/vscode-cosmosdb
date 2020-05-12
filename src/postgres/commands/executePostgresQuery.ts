/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import { Client, ClientConfig, QueryResult } from 'pg';
import * as vscode from 'vscode';
import { IActionContext, IParsedError, parseError } from 'vscode-azureextensionui';
import { postgresFileExtension } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../utils/localize';
import { firewallNotConfiguredErrorType, invalidCredentialsErrorType, PostgresDatabaseTreeItem } from '../tree/PostgresDatabaseTreeItem';
import { configurePostgresFirewall } from './configurePostgresFirewall';
import { enterPostgresCredentials } from './enterPostgresCredentials';
import { loadPersistedPostgresDatabase } from './registerPostgresCommands';

export async function executePostgresQuery(context: IActionContext, treeItem?: PostgresDatabaseTreeItem): Promise<void> {
    await loadPersistedPostgresDatabase();

    if (!treeItem) {
        if (ext.connectedPostgresDB) {
            treeItem = ext.connectedPostgresDB;
        } else {
            treeItem = <PostgresDatabaseTreeItem>await ext.tree.showTreeItemPicker(PostgresDatabaseTreeItem.contextValue, context);
        }
    }

    let clientConfig: ClientConfig | undefined;
    while (!clientConfig) {
        try {
            clientConfig = await treeItem.getClientConfig();
        } catch (error) {
            const parsedError: IParsedError = parseError(error);

            if (parsedError.errorType === invalidCredentialsErrorType) {
                await enterPostgresCredentials(context, treeItem.parent);
            } else if (parsedError.errorType === firewallNotConfiguredErrorType) {
                await configurePostgresFirewall(context, treeItem.parent);
            } else {
                throw error;
            }
        }
    }

    const activeEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;

    if (!activeEditor?.document) {
        throw new Error(localize('openQueryBeforeExecuting', 'Open a PostgreSQL query before executing.'));
    }

    const query: string | undefined = activeEditor.document.getText();
    const client: Client = new Client(clientConfig);
    await client.connect();
    const queryResult: QueryResult = await client.query(query);

    let resultString: string = localize('executedQuery', 'Successfully executed "{0}" query.', queryResult.command);
    if (queryResult.rowCount) {
        const queryFileName = activeEditor.document.fileName;
        const fileExtensionIndex: number = queryFileName.endsWith(postgresFileExtension) ? queryFileName.length - postgresFileExtension.length : queryFileName.length;
        const outputFileName: string = `${queryFileName.slice(0, fileExtensionIndex)}-output.csv`;

        const fields: string[] = queryResult.fields.map(f => f.name);
        let csvData: string = `${fields.join(',')}\n`;

        for (const row of queryResult.rows) {
            for (const field of fields) {
                csvData += `${row[field]},`;
            }
            csvData += '\n';
        }

        await fse.writeFile(outputFileName, csvData);
        resultString += localize('resultsWrittenToFile', ' Results written to file "{0}"', outputFileName);
    }

    ext.outputChannel.show();
    ext.outputChannel.appendLine(resultString);
}
