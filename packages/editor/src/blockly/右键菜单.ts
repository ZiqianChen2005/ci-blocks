import * as Blockly from 'blockly';
import type { 语言包 } from '@cib/i18n';

let 当前语言包: 语言包 | null = null;

export function 设置右键菜单语言(包: 语言包) {
    当前语言包 = 包;
}

export function 初始化右键菜单() {
    const w = window as any;
    if (w.__cib右键已注册) return;
    w.__cib右键已注册 = true;

    const 注册 = (项: any) => {
        try {
            Blockly.ContextMenuRegistry.registry.register(项);
        } catch (e) {
            console.warn(`右键菜单项 ${项.id} 已存在，跳过`);
        }
    };

    注册({
        id: 'cib_copy_json',
        scopeType: Blockly.ContextMenuRegistry.ScopeType.BLOCK,
        displayText: () => 当前语言包?.工具栏.右键菜单.复制为JSON ?? '复制为 JSON',
        preconditionFn: () => 'enabled',
        callback: (scope: any) => {
            const block = scope.block;
            if (!block) return;
            try {
                const json = Blockly.serialization.blocks.save(block);
                navigator.clipboard.writeText(JSON.stringify(json, null, 2));
            } catch (e) {
                console.warn('复制 JSON 失败：', e);
            }
        },
        weight: 100,
    });

    注册({
        id: 'cib_clear_canvas',
        scopeType: Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,
        displayText: () => 当前语言包?.工具栏.右键菜单.清空画布 ?? '清空画布',
        preconditionFn: () => 'enabled',
        callback: () => {
            const msg = 当前语言包?.工具栏.右键菜单.清空确认 ?? '清空画布会丢失所有积木，确定？';
            if (!confirm(msg)) return;
            const ws = Blockly.getMainWorkspace();
            if (ws) ws.clear();
        },
        weight: 100,
    });
}

export const 设置右键菜单 = 初始化右键菜单;
export const 注册自定义右键项 = 初始化右键菜单;