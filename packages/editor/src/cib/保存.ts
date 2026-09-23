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

/** 下载文件（回退方案） */
export function 下载文件(内容: string, 文件名: string, mime = 'application/json') {
    const blob = new Blob([内容], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 文件名;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** 检查浏览器是否支持 File System Access API */
export function 支持文件系统访问(): boolean {
    return typeof (window as any).showSaveFilePicker === 'function';
}

export interface 保存结果 {
    成功: boolean;
    用户取消?: boolean;
    错误?: string;
}

/** 用 File System Access API 保存（支持自选路径），回退到下载 */
export async function 保存文件(
    内容: string,
    建议文件名: string,
    文件类型: { description: string; accept: Record<string, string[]> },
): Promise<保存结果> {
    if (!支持文件系统访问()) {
        下载文件(内容, 建议文件名, Object.values(文件类型.accept)[0]?.[0] ?? 'application/json');
        return { 成功: true };
    }

    try {
        const handle = await (window as any).showSaveFilePicker({
            suggestedName: 建议文件名,
            types: [文件类型],
        });
        const writable = await handle.createWritable();
        await writable.write(内容);
        await writable.close();
        return { 成功: true };
    } catch (e: any) {
        if (e.name === 'AbortError') {
            return { 成功: false, 用户取消: true };
        }
        return { 成功: false, 错误: e.message };
    }
}

/** 保存 CIB 文件 */
export async function 保存CIB文件(
    文件: CIB文件,
    文件名: string,
): Promise<保存结果> {
    const 名 = 文件名.endsWith('.cib') ? 文件名 : `${文件名}.cib`;
    return 保存文件(JSON.stringify(文件, null, 2), 名, {
        description: 'CI Blocks 项目',
        accept: { 'application/json': ['.cib'] },
    });
}

/** 导出 YAML */
export async function 导出YAML文件(
    yaml: string,
    文件名: string,
): Promise<保存结果> {
    const 名 =
        文件名.endsWith('.yml') || 文件名.endsWith('.yaml') ? 文件名 : `${文件名}.yml`;
    return 保存文件(yaml, 名, {
        description: 'YAML 文件',
        accept: { 'text/yaml': ['.yml', '.yaml'] },
    });
}

/** 导出 JSON */
export async function 导出JSON文件(
    内容: string,
    文件名: string,
): Promise<保存结果> {
    const 名 = 文件名.endsWith('.json') ? 文件名 : `${文件名}.json`;
    return 保存文件(内容, 名, {
        description: 'JSON 文件',
        accept: { 'application/json': ['.json'] },
    });
}

/** 旧的下载 API（保留兼容） */
export function 下载CIB(文件: CIB文件, 文件名: string) {
    下载文件(
        JSON.stringify(文件, null, 2),
        文件名.endsWith('.cib') ? 文件名 : `${文件名}.cib`,
    );
}