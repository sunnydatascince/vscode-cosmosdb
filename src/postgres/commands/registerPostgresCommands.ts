/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands, languages } from "vscode";
import { callWithTelemetryAndErrorHandling, IActionContext, registerCommand } from "vscode-azureextensionui";
import { doubleClickDebounceDelay } from "../../constants";
import { ext } from "../../extensionVariables";
import { PostgresCodeLensProvider } from "../services/PostgresCodeLensProvider";
import { configurePostgresFirewall } from "./configurePostgresFirewall";
import { connectPostgresDatabase } from "./connectPostgresDatabase";
import { createPostgresDatabase } from "./createPostgresDatabase";
import { createPostgresQuery } from "./createPostgresQuery";
import { createPostgresServer } from "./createPostgresServer";
import { deletePostgresDatabase } from "./deletePostgresDatabase";
import { deletePostgresFunction } from "./deletePostgresFunction";
import { deletePostgresServer } from "./deletePostgresServer";
import { deletePostgresTable } from "./deletePostgresTable";
import { enterPostgresCredentials } from "./enterPostgresCredentials";
import { executePostgresQuery } from "./executePostgresQuery";
import { openPostgresFunction } from "./openPostgresFunction";

export const connectedDBKey: string = 'ms-azuretools.vscode-azuredatabases.connectedPostgresDB';
const postgresLanguageId: string = 'sql';

export function registerPostgresCommands(): void {
    ext.postgresCodeLensProvider = new PostgresCodeLensProvider();
    ext.context.subscriptions.push(languages.registerCodeLensProvider(postgresLanguageId, ext.postgresCodeLensProvider));

    // tslint:disable-next-line: no-floating-promises
    loadPersistedPostgresDatabase();

    registerCommand('postgreSQL.createServer', createPostgresServer);
    registerCommand('postgreSQL.deleteServer', deletePostgresServer);
    registerCommand('postgreSQL.enterCredentials', enterPostgresCredentials);
    registerCommand('postgreSQL.configureFirewall', configurePostgresFirewall);
    registerCommand('postgreSQL.createDatabase', createPostgresDatabase);
    registerCommand('postgreSQL.deleteDatabase', deletePostgresDatabase);
    registerCommand('postgreSQL.deleteTable', deletePostgresTable);
    registerCommand('postgreSQL.openFunction', openPostgresFunction, doubleClickDebounceDelay);
    registerCommand('postgreSQL.deleteFunction', deletePostgresFunction);
    registerCommand('postgreSQL.connectDatabase', connectPostgresDatabase);
    registerCommand('postgreSQL.createQuery', createPostgresQuery);
    registerCommand('postgreSQL.executeQuery', executePostgresQuery);
}

export async function loadPersistedPostgresDatabase(): Promise<void> {
    // NOTE: We want to make sure this function never throws or returns a rejected promise because it gets awaited multiple times
    await callWithTelemetryAndErrorHandling('postgreSQL.loadPersistedDatabase', async (context: IActionContext) => {
        context.errorHandling.suppressDisplay = true;
        context.telemetry.properties.isActivationEvent = 'true';

        try {
            const persistedTreeItemId: string | undefined = ext.context.globalState.get(connectedDBKey);
            if (persistedTreeItemId) {
                const persistedTreeItem = await ext.tree.findTreeItem(persistedTreeItemId, context);
                if (persistedTreeItem) {
                    await commands.executeCommand('postgreSQL.connectDatabase', persistedTreeItem);
                }
            }
        } finally {
            // Get code lens provider out of initializing state if there's no connected DB
            if (!ext.connectedPostgresDB && ext.postgresCodeLensProvider) {
                ext.postgresCodeLensProvider.setConnectedDatabase(undefined);
            }
        }
    });
}
