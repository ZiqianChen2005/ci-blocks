import * as Blockly from 'blockly';
import type { CIB文件 } from './类型';
import { CIB格式版本 } from './类型';

export function 导出CIB(
    workspace: Blockly.Workspace,
    语言: string,
    工作流名称: string,
): CIB文件 {
    const 工作区 = Blockly.serialization.workspaces.save(workspace);
    return {
        格式: 'cib',
        版本: CIB格式版本,
        保存时间: new Date().toISOString(),
        语言,
        工作流名称,
        工作区,
    };
}

export function 下载CIB(文件: CIB文件, 文件名: string) {
    const 文本 = JSON.stringify(文件, null, 2);
    const blob = new Blob([文本], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 文件名.endsWith('.cib') ? 文件名 : `${文件名}.cib`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}