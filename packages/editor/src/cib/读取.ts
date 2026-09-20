import * as Blockly from 'blockly';
import type { CIB文件 } from './类型';

export function 校验CIB(数据: unknown): CIB文件 {
    if (typeof 数据 !== 'object' || 数据 === null) {
        throw new Error('文件内容不是合法 JSON 对象');
    }
    const d = 数据 as any;
    if (d.格式 !== 'cib') {
        throw new Error('不是 CI Blocks 文件（格式字段不是 cib）');
    }
    if (!d.工作区) {
        throw new Error('文件缺少 工作区 字段');
    }
    return d as CIB文件;
}

export function 读取CIB文件(file: File): Promise<CIB文件> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const 数据 = JSON.parse(String(reader.result));
                resolve(校验CIB(数据));
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsText(file, 'utf-8');
    });
}

export function 应用CIB到工作区(文件: CIB文件, workspace: Blockly.Workspace) {
    workspace.clear();
    Blockly.serialization.workspaces.load(文件.工作区, workspace);
}