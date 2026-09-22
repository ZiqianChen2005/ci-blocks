import { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';
import * as zhHans from 'blockly/msg/zh-hans';
import * as en from 'blockly/msg/en';
import 'blockly/blocks';
import { 注册所有积木 } from '../blockly/注册积木';
import { 工作区转IR } from '../blockly/工作区转IR';
import { 初始化右键菜单, 设置右键菜单语言 } from '../blockly/右键菜单';
import { use编辑器 } from '../store/编辑器状态';
import { use语言 } from '../store/语言状态';
import type { CIBBlock } from '@cib/block-sdk';
import { type 语言包 } from '@cib/i18n';

// 模块加载时先设一次（默认中文）
Blockly.setLocale(zhHans as any);
初始化右键菜单();

interface Props {
    工作区: React.MutableRefObject<Blockly.WorkspaceSvg | null>;
}

export function 画布({ 工作区 }: Props) {
    const 容器 = useRef<HTMLDivElement>(null);
    const 快照ref = useRef<any>(null);
    const 积木箱 = use编辑器((s) => s.积木箱);
    const setIR = use编辑器((s) => s.setIR);
    const 语言包 = use语言((s) => s.语言包);
    const 语言 = use语言((s) => s.语言);

    useEffect(() => {
        if (积木箱.length === 0) return;
        if (!容器.current) return;

        // ========== 1. 根据语言设置 Blockly locale ==========
        const Blockly语言包 = 语言 === 'zh-CN' ? zhHans : en;
        Blockly.setLocale(Blockly语言包 as any);

        // ========== 2. 保存旧快照 ==========
        let 快照 = 快照ref.current;
        if (工作区.current) {
            try {
                快照 = Blockly.serialization.workspaces.save(工作区.current);
            } catch (e) {
                console.warn('保存工作区失败：', e);
            }
            工作区.current.dispose();
            工作区.current = null;
        }

        容器.current.innerHTML = '';

        设置右键菜单语言(语言包);

        注册所有积木(积木箱, 语言包);

        // ========== 3. 注入新 workspace ==========
        const ws = Blockly.inject(容器.current, {
            toolbox: 生成工具箱(积木箱, 语言包),
            grid: { spacing: 20, length: 3, colour: '#e0e0e0', snap: true },
            zoom: { controls: true, wheel: true, startScale: 0.9 },
            trashcan: true,
            renderer: 'zelos',
            media: '/blockly-media/',
        });

        工作区.current = ws;

        // ========== 4. 恢复内容 ==========
        if (快照) {
            try {
                Blockly.serialization.workspaces.load(快照, ws);
            } catch (e) {
                console.warn('恢复工作区失败：', e);
            }
            const 所有块 = ws.getAllBlocks(false);
            for (const b of 所有块) {
                if (b.type === 'cib/build' && typeof (b as any).updateShape_ === 'function') {
                    try {
                        const 工具链 = b.getFieldValue('工具链');
                        (b as any).updateShape_(工具链);
                    } catch {}
                }
            }
        }

        // ========== 5. 监听 ==========
        const 更新 = () => {
            const nodes = 工作区转IR(ws, (id) => 积木箱.find((b) => b.id === id));
            setIR(nodes);
            try {
                快照ref.current = Blockly.serialization.workspaces.save(ws);
            } catch {}
        };
        ws.addChangeListener(更新);
        更新();

        const 自适应 = () => Blockly.svgResize(ws);
        window.addEventListener('resize', 自适应);
        setTimeout(自适应, 100);

        return () => {
            window.removeEventListener('resize', 自适应);
        };
    }, [积木箱, 语言]);

    return (
        <div style={{ position: 'absolute', inset: 0, background: 'white' }}>
            <div ref={容器} style={{ position: 'absolute', inset: 0 }} />
        </div>
    );
}

const 分类顺序: CIBBlock<any>['category'][] = [
    '基础',
    '门禁',
    '构建',
    '校验',
    '科研',
    '项目',
    '审计',
    '环境',
    '部署',
];

const 分类颜色: Record<string, string> = {
    基础: '#3498db',
    门禁: '#c0392b',
    构建: '#27ae60',
    校验: '#2980b9',
    科研: '#8e44ad',
    项目: '#d35400',
    审计: '#16a085',
    环境: '#7f8c8d',
    部署: '#f39c12',
};

const 分类图标: Record<string, string> = {
    基础: '🧩',
    门禁: '🚧',
    构建: '🔨',
    校验: '✅',
    科研: '🔬',
    项目: '📦',
    审计: '📝',
    环境: '⚙️',
    部署: '🚀',
};

function 生成工具箱(积木箱: CIBBlock<any>[], 包: 语言包) {
    const 分类表 = new Map<string, CIBBlock<any>[]>();
    for (const 分类 of 分类顺序) 分类表.set(分类, []);
    for (const b of 积木箱) {
        if (!分类表.has(b.category)) 分类表.set(b.category, []);
        分类表.get(b.category)!.push(b);
    }

    const contents: any[] = [];
    for (const [分类, 列表] of 分类表) {
        if (列表.length === 0) continue;
        const 显示名 = 包.分类[分类 as keyof typeof 包.分类] ?? 分类;
        contents.push({
            kind: 'category',
            name: `${分类图标[分类] ?? ''} ${显示名}`.trim(),
            colour: 分类颜色[分类] ?? '#5b80a5',
            contents: 列表.map((b) => ({ kind: 'block', type: b.id })),
        });
    }

    return { kind: 'categoryToolbox', contents };
}