import * as vscode from "vscode";

export class Config
{
	static get section(): vscode.WorkspaceConfiguration & TypedConfig
	{
		return vscode.workspace.getConfiguration("altervista-thesaurus");
	}
}

interface TypedConfig
{
	get(item: "key"): string | null;

	get(item: "lang"): Language;

	update(section: "key", value: string | null, configurationTarget?: vscode.ConfigurationTarget | boolean): Thenable<void>;
}

export type Language = "it_IT" | "fr_FR" | "de_DE" | "en_US" | "el_GR" | "es_ES" | "no_NO" | "pt_PT" | "ro_RO" | "ru_RU" | "sk_SK";