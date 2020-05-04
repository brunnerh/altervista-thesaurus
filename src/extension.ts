'use strict';
import * as vscode from 'vscode';
import { Config, Language } from "./config-interface";
import { ConfigurationTarget } from 'vscode';
import fetch from 'node-fetch';

export function activate(context: vscode.ExtensionContext)
{
	const synonymsLang = vscode.commands.registerCommand('altervista-thesaurus.synonyms-lang', async () =>
	{
		const lang = await vscode.window.showQuickPick(<KeyedQuickPick<Language>[]>[
			{
				key: 'it_IT',
				label: 'Italian',
			},
			{
				key: 'fr_FR',
				label: 'French',
			},
			{
				key: 'de_DE',
				label: 'German (Germany)',
			},
			{
				key: 'en_US',
				label: 'English (US)',
			},
			{
				key: 'el_GR',
				label: 'Greek',
			},
			{
				key: 'es_ES',
				label: 'Spanish',
			},
			{
				key: 'no_NO',
				label: 'Norwegian',
			},
			{
				key: 'pt_PT',
				label: 'Portuguese',
			},
			{
				key: 'ro_RO',
				label: 'Romanian',
			},
			{
				key: 'ru_RU',
				label: 'Russian',
			},
			{
				key: 'sk_SK',
				label: 'Slovak',
			},
			{
				key: 'cs_CZ',
				label: 'Czech',
			},
			{
				key: 'da_DK',
				label: 'Danish',
			},
			{
				key: 'de_CH',
				label: 'German (Switzerland)',
			},
			{
				key: 'hu_HU',
				label: 'Hungarian',
			},
			{
				key: 'pl_PL',
				label: 'Polish',
			},
		].sort((a, b) => a.label < b.label ? -1 : (a.label === b.label ? 0 : 1)));

		if (lang)
			vscode.commands.executeCommand('altervista-thesaurus.synonyms', lang.key);
	});

	const synonyms = vscode.commands.registerCommand('altervista-thesaurus.synonyms', async (lang: Language) =>
	{
		let key = Config.section.get('key');
		if (key === null)
		{
			const url = 'http://thesaurus.altervista.org/mykey';
			vscode.window.showInformationMessage(
				`Get your API key here: ${url}`,
				<MessageAction>{ key: 'open', title: 'Open URL' }
			).then(item =>
			{
				if (item && item.key === 'open')
					vscode.env.openExternal(vscode.Uri.parse(url));
			});

			const input = await vscode.window.showInputBox({
				prompt: 'Paste your API key here to use the thesaurus service.',
				ignoreFocusOut: true,
			});
			if (input)
			{
				key = input;
				Config.section.update('key', key, ConfigurationTarget.Global);
			}
			else
			{
				vscode.window.showWarningMessage('No API key was provided. The thesaurus service cannot be accessed.');
				return;
			}
		}

		let word: string;
		const editor = vscode.window.activeTextEditor;
		const hasSelection = (e: vscode.TextEditor) => e.selections.length > 0 && e.selection.isEmpty === false;
		if (editor && hasSelection(editor))
		{
			word = editor.document.getText(editor.selection);
		}
		else
		{
			const input = await vscode.window.showInputBox({ prompt: 'Enter a word to look up.' });
			if (input === undefined)
				return;

			word = input;
		}

		if (typeof lang !== 'string')
			lang = Config.section.get('lang');

		const res = await fetch(`http://thesaurus.altervista.org/thesaurus/v1?word=${encodeURIComponent(word)}&language=${lang}&output=json&key=${key}`);
		switch (res.status)
		{
			case 400:
				vscode.window.showErrorMessage(`The server responded with "Bad Request". This might be a bug in the extension.`);
				return;
			case 403:
				vscode.window.showErrorMessage(`The server responded with "Forbidden". Check your API key. Alternatively, the request limit may be exceeded.`);
				return;
			case 404:
				vscode.window.showInformationMessage(`No matches found for word "${word}".`);
				return;
		}
		const data = <AltervistaResponse>await res.json();

		const flatList = data.response.map(group =>
			group.list.synonyms.split("|")
				.map(syn =>
				{
					const strip = (str: string) => str.substring(1, str.length - 1);
					// Terms may have additional specifier in parentheses, e.g. (Antonym)
					const match = syn.match(/([^(]*) ?(\(.*\))?/)!;
					return <vscode.QuickPickItem>{
						label: match[1].trim(),
						description: strip(group.list.category) + (match[2] ? `, ${strip(match[2])}` : "")
					};
				})
		).reduce((a, b) => a.concat(b));

		const pick = await vscode.window.showQuickPick(flatList);
		if (pick && editor)
			editor.edit(builder => builder.replace(editor.selection, pick.label));
	});

	context.subscriptions.push(synonymsLang, synonyms);
}

export function deactivate()
{
}

interface AltervistaResponse
{
	response: {
		list: {
			category: string,
			synonyms: string
		}
	}[];
}

interface MessageAction extends vscode.MessageItem
{
	key: string;
}

interface KeyedQuickPick<T> extends vscode.QuickPickItem
{
	key: T;
}