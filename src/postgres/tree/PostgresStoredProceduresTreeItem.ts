/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Client, ClientConfig, QueryResult } from "pg";
import { AzureParentTreeItem, ISubscriptionContext, TreeItemIconPath } from "vscode-azureextensionui";
import { getThemeAgnosticIconPath } from "../../constants";
import { IPostgresProceduresQueryRow } from "../IPostgresProceduresQueryRow";
import { PostgresDatabaseTreeItem } from "./PostgresDatabaseTreeItem";
import { PostgresStoredProcedureTreeItem } from "./PostgresStoredProcedureTreeItem";

export class PostgresStoredProceduresTreeItem extends AzureParentTreeItem<ISubscriptionContext> {
    public static contextValue: string = 'postgresStoredProcedures';
    public readonly contextValue: string = PostgresStoredProceduresTreeItem.contextValue;
    public readonly label: string = 'Stored Procedures';
    public readonly childTypeLabel: string = 'Stored Procedure';
    public readonly parent: PostgresDatabaseTreeItem;
    public clientConfig: ClientConfig;

    constructor(parent: PostgresDatabaseTreeItem, clientConfig: ClientConfig) {
        super(parent);
        this.clientConfig = clientConfig;
    }

    public get iconPath(): TreeItemIconPath {
        return getThemeAgnosticIconPath('stored procedures.svg');
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(): Promise<PostgresStoredProcedureTreeItem[]> {
        const client = new Client(this.clientConfig);
        await client.connect();

        // Adapted from https://aka.ms/AA83fg8
        // Only applicable to Postgres versions 11+
        const storedProceduresQuery: string = `select n.nspname as schema,
            p.proname as name,
            case when l.lanname = 'internal' then p.prosrc
                else pg_get_functiondef(p.oid)
                end as definition
            from pg_proc p
            left join pg_namespace n on p.pronamespace = n.oid
            left join pg_language l on p.prolang = l.oid
            where p.prokind = 'p'
            order by name;`;

        const queryResult: QueryResult = await client.query(storedProceduresQuery);
        const rows: IPostgresProceduresQueryRow[] = queryResult.rows || [];

        // TODO: Unify w/ functions, move to same file as query row (how to name it?)
        const allNames: Set<string> = new Set();
        const duplicateNames: Set<string> = new Set();
        for (const row of rows) {
            if (allNames.has(row.name)) {
                duplicateNames.add(row.name);
            } else {
                allNames.add(row.name);
            }
        }

        return rows.map(row => new PostgresStoredProcedureTreeItem(
            this,
            row,
            duplicateNames.has(row.name)
        ));
    }
}
