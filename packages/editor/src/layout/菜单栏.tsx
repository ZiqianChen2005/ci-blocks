import { useState, useRef, useEffect } from 'react';
import * as Blockly from 'blockly';
import { 导出CIB, 下载CIB } from '../cib/保存';
import { 读取CIB文件, 应用CIB到工作区 } from '../cib/读取';
import { use语言 } from '../store/语言状态';
import type { 语言 } from '@cib/i18n';

interface Props {
    工作区: React.MutableRefObject<Blockly.WorkspaceSvg | null>;
    工作流名称: string;
    设置工作流名称: (n: string) => void;
}

type 菜单名 = '文件' | '编辑' | null;

export function 菜单栏({ 工作区, 工作流名称, 设置工作流名称 }: Props) {
    const [当前菜单, set当前菜单] = useState<菜单名>(null);
    const [提示, set提示] = useState('');
    const 文件输入 = useRef<HTMLInputElement>(null);
    const 语言 = use语言((s) => s.语言);
    const 设置语言 = use语言((s) => s.设置语言);
    const 语言包 = use语言((s) => s.语言包);
    const 菜单容器 = useRef<HTMLDivElement>(null);

    // 点击外部关闭菜单
    useEffect(() => {
        const 关 = (e: MouseEvent) => {
            if (菜单容器.current && !菜单容器.current.contains(e.target as Node)) {
                set当前菜单(null);
            }
        };
        document.addEventListener('mousedown', 关);
        return () => document.removeEventListener('mousedown', 关);
    }, []);

    const 显示提示 = (msg: string) => {
        set提示(msg);
        setTimeout(() => set提示(''), 2000);
    };

    const 切换菜单 = (名: '文件' | '编辑') => {
        set当前菜单((v) => (v === 名 ? null : 名));
    };

    // ========== 文件操作 ==========
    const 新建 = () => {
        if (!工作区.current) return;
        if (!confirm(语言包.工具栏.新建确认)) return;
        工作区.current.clear();
        设置工作流名称(语言包.通用.未命名工作流);
        set当前菜单(null);
        显示提示(语言包.工具栏.已新建);
    };

    const 保存 = () => {
        if (!工作区.current) return;
        const 文件 = 导出CIB(工作区.current, 语言, 工作流名称);
        下载CIB(文件, `${工作流名称 || 语言包.通用.未命名工作流}.cib`);
        set当前菜单(null);
        显示提示(语言包.工具栏.已保存);
    };

    const 打开 = () => {
        文件输入.current?.click();
        set当前菜单(null);
    };

    const 选择文件 = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const 数据 = await 读取CIB文件(file);
            if (!工作区.current) return;
            应用CIB到工作区(数据, 工作区.current);
            if (数据.工作流名称) 设置工作流名称(数据.工作流名称);
            if (数据.语言) 设置语言(数据.语言 as 语言);
            显示提示(`${语言包.工具栏.已打开}：${file.name}`);
        } catch (err) {
            alert(`${语言包.工具栏.打开失败}：${(err as Error).message}`);
        }
        e.target.value = '';
    };

    // ========== 编辑操作 ==========
    const 撤销 = () => {
        if (!工作区.current) return;
        工作区.current.undo(false);
        set当前菜单(null);
    };

    const 重做 = () => {
        if (!工作区.current) return;
        工作区.current.undo(true);
        set当前菜单(null);
    };

    const 复制 = () => {
        if (!工作区.current) return;
        const 选中 = 工作区.current.getSelected() as Blockly.BlockSvg | null;
        if (选中) {
            // 触发 Blockly 内置复制
            Blockly.clipboard.copy([选中]);
            显示提示('已复制');
        } else {
            显示提示('未选中积木');
        }
        set当前菜单(null);
    };

    const 剪切 = () => {
        if (!工作区.current) return;
        const 选中 = 工作区.current.getSelected() as Blockly.BlockSvg | null;
        if (选中) {
            Blockly.clipboard.copy([选中]);
            选中.dispose(true);
            显示提示('已剪切');
        } else {
            显示提示('未选中积木');
        }
        set当前菜单(null);
    };

    const 粘贴 = () => {
        if (!工作区.current) return;
        try {
            Blockly.clipboard.paste();
            显示提示('已粘贴');
        } catch (e) {
            显示提示('粘贴失败');
        }
        set当前菜单(null);
    };

    const 删除选中 = () => {
        if (!工作区.current) return;
        const 选中 = 工作区.current.getSelected() as Blockly.BlockSvg | null;
        if (选中) {
            选中.dispose(true);
            显示提示('已删除');
        } else {
            显示提示('未选中积木');
        }
        set当前菜单(null);
    };

    const 全选 = () => {
        if (!工作区.current) return;
        const 所有块 = 工作区.current.getAllBlocks(false) as Blockly.BlockSvg[];
        工作区.current.setSelected?.(所有块[0] ?? null);
        显示提示(`已选中 ${所有块.length} 个积木`);
        set当前菜单(null);
    };

    const 清空画布 = () => {
        if (!工作区.current) return;
        if (!confirm(语言包.工具栏.清空确认)) return;
        工作区.current.clear();
        set当前菜单(null);
        显示提示(语言包.工具栏.已清空);
    };

    // ========== 快捷键 ==========
    useEffect(() => {
        const 处理 = (e: KeyboardEvent) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (!ctrl) return;

            // Ctrl+S 保存
            if (e.key === 's') {
                e.preventDefault();
                保存();
                return;
            }
            // Ctrl+O 打开
            if (e.key === 'o') {
                e.preventDefault();
                打开();
                return;
            }
            // Ctrl+N 新建
            if (e.key === 'n') {
                e.preventDefault();
                新建();
                return;
            }
        };
        window.addEventListener('keydown', 处理);
        return () => window.removeEventListener('keydown', 处理);
    }, [工作流名称, 语言]);

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 16px',
                background: '#2c3e50',
                color: 'white',
                borderBottom: '1px solid #1a252f',
                position: 'relative',
                zIndex: 100,
            }}
        >
            <strong>{语言包.工具栏.品牌}</strong>

            <div ref={菜单容器} style={{ display: 'flex', gap: 4 }}>
                {/* 文件菜单 */}
                <菜单按钮
                    名={语言包.工具栏.文件}
                    开={当前菜单 === '文件'}
                    onClick={() => 切换菜单('文件')}
                />
                {当前菜单 === '文件' && (
                    <下拉菜单>
                        <菜单项 onClick={新建} 快捷键="Ctrl+N">{语言包.工具栏.新建}</菜单项>
                        <菜单项 onClick={打开} 快捷键="Ctrl+O">{语言包.工具栏.打开}</菜单项>
                        <菜单项 onClick={保存} 快捷键="Ctrl+S">{语言包.工具栏.保存}</菜单项>
                    </下拉菜单>
                )}

                {/* 编辑菜单 */}
                <菜单按钮
                    名={语言包.工具栏.编辑}
                    开={当前菜单 === '编辑'}
                    onClick={() => 切换菜单('编辑')}
                />
                {当前菜单 === '编辑' && (
                    <下拉菜单>
                        <菜单项 onClick={撤销} 快捷键="Ctrl+Z">{语言包.工具栏.撤销}</菜单项>
                        <菜单项 onClick={重做} 快捷键="Ctrl+Y">{语言包.工具栏.重做}</菜单项>
                        <分隔线 />
                        <菜单项 onClick={复制} 快捷键="Ctrl+C">{语言包.工具栏.复制}</菜单项>
                        <菜单项 onClick={剪切} 快捷键="Ctrl+X">{语言包.工具栏.剪切}</菜单项>
                        <菜单项 onClick={粘贴} 快捷键="Ctrl+V">{语言包.工具栏.粘贴}</菜单项>
                        <分隔线 />
                        <菜单项 onClick={删除选中} 快捷键="Del">{语言包.工具栏.删除}</菜单项>
                        <菜单项 onClick={全选} 快捷键="Ctrl+A">{语言包.工具栏.全选}</菜单项>
                        <分隔线 />
                        <菜单项 onClick={清空画布}>{语言包.工具栏.清空画布}</菜单项>
                    </下拉菜单>
                )}
            </div>

            <div style={{ flex: 1 }} />

            <input
                value={工作流名称}
                onChange={(e) => 设置工作流名称(e.target.value)}
                placeholder={语言包.工具栏.工作流名称占位}
                style={{
                    padding: '4px 8px',
                    border: '1px solid #4a5f75',
                    borderRadius: 4,
                    background: '#1a252f',
                    color: 'white',
                    width: 200,
                }}
            />

            {提示 && <span style={{ fontSize: 12, color: '#7fdbaf' }}>{提示}</span>}

            <label style={{ fontSize: 13 }}>
                {语言包.工具栏.语言}
                <select
                    value={语言}
                    onChange={(e) => 设置语言(e.target.value as 语言)}
                    style={{ marginLeft: 6, padding: '2px 6px' }}
                >
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                </select>
            </label>

            <input
                ref={文件输入}
                type="file"
                accept=".cib,application/json"
                style={{ display: 'none' }}
                onChange={选择文件}
            />
        </div>
    );
}

// ========== 子组件 ==========
function 菜单按钮({ 名, 开, onClick }: { 名: string; 开: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '4px 12px',
                background: 开 ? '#1a252f' : 'transparent',
                border: '1px solid #4a5f75',
                color: 'white',
                borderRadius: 4,
                cursor: 'pointer',
            }}
        >
            {名}
        </button>
    );
}

function 下拉菜单({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                background: 'white',
                color: '#222',
                border: '1px solid #ccc',
                borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                minWidth: 220,
                zIndex: 200,
                padding: '4px 0',
            }}
        >
            {children}
        </div>
    );
}

function 菜单项({
                    children,
                    onClick,
                    快捷键,
                }: {
    children: React.ReactNode;
    onClick: () => void;
    快捷键?: string;
}) {
    return (
        <div
            onClick={onClick}
            style={{
                padding: '8px 14px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
        >
            <span>{children}</span>
            {快捷键 && (
                <span style={{ color: '#999', fontSize: 12, marginLeft: 16 }}>{快捷键}</span>
            )}
        </div>
    );
}

function 分隔线() {
    return <div style={{ height: 1, background: '#eee', margin: '4px 0' }} />;
}