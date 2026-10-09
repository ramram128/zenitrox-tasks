import * as vscode from 'vscode'

/** The small "Account" section under My Tasks showing who is signed in. */
export class AccountView implements vscode.TreeDataProvider<string> {
	private readonly changed = new vscode.EventEmitter<void>()
	readonly onDidChangeTreeData = this.changed.event

	private account: string | undefined

	setAccount(account: string | undefined) {
		this.account = account
		this.changed.fire()
	}

	getChildren(element?: string): string[] {
		return element || !this.account ? [] : [this.account]
	}

	getTreeItem(account: string): vscode.TreeItem {
		const item = new vscode.TreeItem(account, vscode.TreeItemCollapsibleState.None)
		item.id = 'account'
		item.description = 'signed in'
		item.tooltip = `Signed in to Zenitrox as ${account}`
		item.contextValue = 'account'
		item.iconPath = new vscode.ThemeIcon('account')
		return item
	}
}
