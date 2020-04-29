/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from "vscode-azureextensionui";
import { IPostgresFunctionQueryWizardContext } from "./IPostgresFunctionQueryWizardContext";

export class FunctionQueryCreateStep extends AzureWizardExecuteStep<IPostgresFunctionQueryWizardContext> {
    public priority: number = 100;

    public async execute(wizardContext: IPostgresFunctionQueryWizardContext): Promise<void> {
        wizardContext.query = defaultFunctionQuery(wizardContext.name, wizardContext.returnType);
    }

    public shouldExecute(): boolean {
        return true;
    }
}

const defaultFunctionQuery = (name: string, returnType: string) => `CREATE OR REPLACE FUNCTION ${name}()
 RETURNS ${returnType}
 LANGUAGE plpgsql
AS $function$
	BEGIN
	END;
$function$
`;
