import { useState, useRef, useEffect } from 'react';
import * as Blockly from 'blockly';
import {
    导出CIB,
    保存CIB文件,
    导出YAML文件,
    导出JSON文件,
} from '../cib/保存';
import { 读取CIB文件, 应用CIB到工作区 } from '../cib/读取';
import { use语言 } from '../store/语言状态';
import type { 语言 } from '@cib/i18n';

interface Props {
    工作区: React.MutableRefObject<Blockly.WorkspaceSvg | null>;
    工作流名称: string;
    设置工作流名称: (n: string) => void;
}

type 菜单名 = '文件' | '编辑' | '视图' | '工具' | '帮助' | null;

export function 菜单栏({ 工作区, 工作流名称, 设置工作流名称 }: Props) {
    const [当前菜单, set当前菜单] = useState<菜单名>(null);
    const [提示, set提示] = useState('');
    const [显示关于, set显示关于] = useState(false);
    const [显示快捷键, set显示快捷键] = useState(false);
    const [显示加载外部积木, set显示加载外部积木] = useState(false);
    const [外部积木URL, set外部积木URL] = useState('');
    const 文件输入 = useRef<HTMLInputElement>(null);
    const 语言 = use语言((s) => s.语言);
    const 设置语言 = use语言((s) => s.设置语言);
    const 语言包 = use语言((s) => s.语言包);
    const 菜单容器 = useRef<HTMLDivElement>(null);

    const 工具 = 语言包.工具栏;

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

    const 切换菜单 = (名: '文件' | '编辑' | '视图' | '工具' | '帮助') => {
        set当前菜单((v) => (v === 名 ? null : 名));
    };

    // ========== 文件 ==========
    const 新建 = () => {
        if (!工作区.current) return;
        if (!confirm(工具.新建确认)) return;
        工作区.current.clear();
        设置工作流名称(语言包.通用.未命名工作流);
        set当前菜单(null);
        显示提示(工具.已新建);
    };

    const 保存 = async () => {
        if (!工作区.current) return;
        const 文件 = 导出CIB(工作区.current, 语言, 工作流名称);
        const 结果 = await 保存CIB文件(文件, 工作流名称 || 语言包.通用.未命名工作流);
        set当前菜单(null);
        if (结果.成功) {
            显示提示(工具.已保存);
        } else if (结果.用户取消) {
            显示提示(工具.取消保存);
        } else {
            alert(`${工具.保存失败}：${结果.错误}`);
        }
    };

    const 另存为 = async () => {
        if (!工作区.current) return;
        const 文件 = 导出CIB(工作区.current, 语言, 工作流名称);
        const 结果 = await 保存CIB文件(文件, `${工作流名称 || 语言包.通用.未命名工作流}-副本`);
        set当前菜单(null);
        if (结果.成功) {
            显示提示(工具.已另存为);
        } else if (结果.用户取消) {
            显示提示(工具.取消保存);
        } else {
            alert(`${工具.保存失败}：${结果.错误}`);
        }
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
            显示提示(`${工具.已打开}：${file.name}`);
        } catch (err) {
            alert(`${工具.打开失败}：${(err as Error).message}`);
        }
        e.target.value = '';
    };

    const 生成YAML = (): string | null => {
        const yaml = document.querySelector('pre')?.textContent ?? '';
        return yaml || null;
    };

    const 导出为 = async (格式: 'github' | 'gitlab' | 'circleci' | 'jenkins' | 'generic') => {
        set当前菜单(null);
        if (格式 !== 'github' && 格式 !== 'generic') {
            alert(`${工具.暂未实现}：${格式}`);
            return;
        }
        const yaml = 生成YAML();
        if (!yaml) {
            显示提示(工具.工具菜单.无YAML);
            return;
        }
        const 名 = 工作流名称 || 'workflow';
        const 结果 = await 导出YAML文件(yaml, 名);
        if (结果.成功) {
            显示提示(工具.已导出);
        } else if (结果.用户取消) {
            显示提示(工具.取消保存);
        } else {
            alert(`${工具.保存失败}：${结果.错误}`);
        }
    };

    const 导出积木JSON = async () => {
        if (!工作区.current) return;
        const json = Blockly.serialization.workspaces.save(工作区.current);
        const 名 = `${工作流名称 || 'workflow'}.blocks`;
        const 结果 = await 导出JSON文件(JSON.stringify(json, null, 2), 名);
        set当前菜单(null);
        if (结果.成功) {
            显示提示(工具.已导出);
        } else if (结果.用户取消) {
            显示提示(工具.取消保存);
        } else {
            alert(`${工具.保存失败}：${结果.错误}`);
        }
    };

    // ========== 编辑 ==========
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
            (Blockly.clipboard as any).copy([选中]);
            显示提示(工具.已复制);
        } else {
            显示提示(工具.未选中积木);
        }
        set当前菜单(null);
    };

    const 剪切 = () => {
        if (!工作区.current) return;
        const 选中 = 工作区.current.getSelected() as Blockly.BlockSvg | null;
        if (选中) {
            (Blockly.clipboard as any).copy([选中]);
            选中.dispose(true);
            显示提示(工具.已剪切);
        } else {
            显示提示(工具.未选中积木);
        }
        set当前菜单(null);
    };

    const 粘贴 = () => {
        if (!工作区.current) return;
        try {
            (Blockly.clipboard as any).paste();
            显示提示(工具.已粘贴);
        } catch (e) {
            显示提示(工具.粘贴失败);
        }
        set当前菜单(null);
    };

    const 删除选中 = () => {
        if (!工作区.current) return;
        const 选中 = 工作区.current.getSelected() as Blockly.BlockSvg | null;
        if (选中) {
            选中.dispose(true);
            显示提示(工具.已删除);
        } else {
            显示提示(工具.未选中积木);
        }
        set当前菜单(null);
    };

    const 全选 = () => {
        if (!工作区.current) return;
        const 所有块 = 工作区.current.getAllBlocks(false) as Blockly.BlockSvg[];
        工作区.current.setSelected?.(所有块[0] ?? null);
        显示提示(工具.已选中.replace('%1', String(所有块.length)));
        set当前菜单(null);
    };

    const 清空画布 = () => {
        if (!工作区.current) return;
        if (!confirm(工具.清空确认)) return;
        工作区.current.clear();
        set当前菜单(null);
        显示提示(工具.已清空);
    };

    // ========== 视图 ==========
    const 放大 = () => {
        if (!工作区.current) return;
        工作区.current.zoomCenter(1);
        set当前菜单(null);
    };

    const 缩小 = () => {
        if (!工作区.current) return;
        工作区.current.zoomCenter(-1);
        set当前菜单(null);
    };

    const 重置缩放 = () => {
        if (!工作区.current) return;
        工作区.current.setScale(0.9);
        set当前菜单(null);
    };

    const 折叠所有 = () => {
        if (!工作区.current) return;
        const 所有块 = 工作区.current.getAllBlocks(false);
        for (const b of 所有块) {
            if (b.isCollapsible?.()) b.setCollapsed(true);
        }
        set当前菜单(null);
    };

    const 展开所有 = () => {
        if (!工作区.current) return;
        const 所有块 = 工作区.current.getAllBlocks(false);
        for (const b of 所有块) {
            if (b.isCollapsible?.()) b.setCollapsed(false);
        }
        set当前菜单(null);
    };

    const 整理积木 = () => {
        if (!工作区.current) return;
        工作区.current.cleanUp();
        set当前菜单(null);
        显示提示(工具.视图菜单.已整理);
    };

    // ========== 工具 ==========
    const 复制YAML = async () => {
        const yaml = 生成YAML();
        if (!yaml) {
            显示提示(工具.工具菜单.无YAML);
            set当前菜单(null);
            return;
        }
        await navigator.clipboard.writeText(yaml);
        显示提示(工具.工具菜单.已复制YAML);
        set当前菜单(null);
    };

    const 执行加载外部积木 = async () => {
        const urls = 外部积木URL.split(',').map((s) => s.trim()).filter(Boolean);
        if (urls.length === 0) return;
        try {
            const { 加载外部积木 } = await import('../blocks/加载器');
            const { 积木: 外部积木, 错误 } = await 加载外部积木(urls);
            if (错误.length > 0) {
                alert(
                    `${工具.工具菜单.加载失败}：\n${错误.map((e) => `${e.url}: ${e.消息}`).join('\n')}`,
                );
            }
            显示提示(工具.工具菜单.已加载外部积木.replace('%1', String(外部积木.length)));
            set显示加载外部积木(false);
            set外部积木URL('');
        } catch (e) {
            alert(`${工具.工具菜单.加载失败}：${(e as Error).message}`);
        }
    };

    // ========== 帮助 ==========
    const 打开文档 = () => {
        window.open('https://github.com/ZiqianChen2005/ci-blocks#readme', '_blank');
        set当前菜单(null);
    };

    const 打开仓库 = () => {
        window.open('https://github.com/ZiqianChen2005/ci-blocks', '_blank');
        set当前菜单(null);
    };

    // ========== 快捷键 ==========
    useEffect(() => {
        const 处理 = (e: KeyboardEvent) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (!ctrl) return;

            if (e.key === 's') {
                e.preventDefault();
                if (e.shiftKey) {
                    另存为();
                } else {
                    保存();
                }
                return;
            }
            if (e.key === 'o') { e.preventDefault(); 打开(); return; }
            if (e.key === 'n') { e.preventDefault(); 新建(); return; }
        };
        window.addEventListener('keydown', 处理);
        return () => window.removeEventListener('keydown', 处理);
    }, [工作流名称, 语言]);

    return (
        <>
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
                <strong>{工具.品牌}</strong>

                <div ref={菜单容器} style={{ display: 'flex', gap: 4 }}>
                    {/* 文件 */}
                    <菜单按钮 名={工具.文件} 开={当前菜单 === '文件'} onClick={() => 切换菜单('文件')} />
                    {当前菜单 === '文件' && (
                        <下拉菜单>
                            <菜单项 onClick={新建} 快捷键="Ctrl+N">{工具.新建}</菜单项>
                            <菜单项 onClick={打开} 快捷键="Ctrl+O">{工具.打开}</菜单项>
                            <分隔线 />
                            <菜单项 onClick={保存} 快捷键="Ctrl+S">{工具.保存}</菜单项>
                            <菜单项 onClick={另存为} 快捷键="Ctrl+Shift+S">{工具.另存为}</菜单项>
                            <分隔线 />
                            <子菜单 名={工具.导出为}>
                                <菜单项 onClick={() => 导出为('github')}>{工具.导出GitHubYAML}</菜单项>
                                <菜单项 onClick={() => 导出为('gitlab')}>{工具.导出GitLabYAML}</菜单项>
                                <菜单项 onClick={() => 导出为('circleci')}>{工具.导出CircleCI}</菜单项>
                                <菜单项 onClick={() => 导出为('jenkins')}>{工具.导出Jenkinsfile}</菜单项>
                                <菜单项 onClick={() => 导出为('generic')}>{工具.导出通用YAML}</菜单项>
                            </子菜单>
                            <分隔线 />
                            <菜单项 onClick={导出积木JSON}>{工具.导出积木JSON}</菜单项>
                        </下拉菜单>
                    )}

                    {/* 编辑 */}
                    <菜单按钮 名={工具.编辑} 开={当前菜单 === '编辑'} onClick={() => 切换菜单('编辑')} />
                    {当前菜单 === '编辑' && (
                        <下拉菜单>
                            <菜单项 onClick={撤销} 快捷键="Ctrl+Z">{工具.撤销}</菜单项>
                            <菜单项 onClick={重做} 快捷键="Ctrl+Y">{工具.重做}</菜单项>
                            <分隔线 />
                            <菜单项 onClick={复制} 快捷键="Ctrl+C">{工具.复制}</菜单项>
                            <菜单项 onClick={剪切} 快捷键="Ctrl+X">{工具.剪切}</菜单项>
                            <菜单项 onClick={粘贴} 快捷键="Ctrl+V">{工具.粘贴}</菜单项>
                            <分隔线 />
                            <菜单项 onClick={删除选中} 快捷键="Del">{工具.删除}</菜单项>
                            <菜单项 onClick={全选} 快捷键="Ctrl+A">{工具.全选}</菜单项>
                            <分隔线 />
                            <菜单项 onClick={清空画布}>{工具.清空画布}</菜单项>
                        </下拉菜单>
                    )}

                    {/* 视图 */}
                    <菜单按钮 名={工具.视图} 开={当前菜单 === '视图'} onClick={() => 切换菜单('视图')} />
                    {当前菜单 === '视图' && (
                        <下拉菜单>
                            <菜单项 onClick={放大} 快捷键="Ctrl+=">{工具.视图菜单.放大}</菜单项>
                            <菜单项 onClick={缩小} 快捷键="Ctrl+-">{工具.视图菜单.缩小}</菜单项>
                            <菜单项 onClick={重置缩放} 快捷键="Ctrl+0">{工具.视图菜单.重置缩放}</菜单项>
                            <分隔线 />
                            <菜单项 onClick={折叠所有}>{工具.视图菜单.折叠所有}</菜单项>
                            <菜单项 onClick={展开所有}>{工具.视图菜单.展开所有}</菜单项>
                            <菜单项 onClick={整理积木}>{工具.视图菜单.整理积木}</菜单项>
                        </下拉菜单>
                    )}

                    {/* 工具 */}
                    <菜单按钮 名={工具.工具} 开={当前菜单 === '工具'} onClick={() => 切换菜单('工具')} />
                    {当前菜单 === '工具' && (
                        <下拉菜单>
                            <菜单项 onClick={() => { set显示加载外部积木(true); set当前菜单(null); }}>
                                {工具.工具菜单.加载外部积木}
                            </菜单项>
                            <分隔线 />
                            <菜单项 onClick={复制YAML}>{工具.工具菜单.复制YAML}</菜单项>
                        </下拉菜单>
                    )}

                    {/* 帮助 */}
                    <菜单按钮 名={工具.帮助} 开={当前菜单 === '帮助'} onClick={() => 切换菜单('帮助')} />
                    {当前菜单 === '帮助' && (
                        <下拉菜单>
                            <菜单项 onClick={打开文档}>{工具.帮助菜单.文档}</菜单项>
                            <菜单项 onClick={() => { set显示快捷键(true); set当前菜单(null); }}>
                                {工具.帮助菜单.快捷键}
                            </菜单项>
                            <分隔线 />
                            <菜单项 onClick={() => { set显示关于(true); set当前菜单(null); }}>
                                {工具.帮助菜单.关于}
                            </菜单项>
                            <菜单项 onClick={打开仓库}>{工具.帮助菜单.GitHub仓库}</菜单项>
                        </下拉菜单>
                    )}
                </div>

                <div style={{ flex: 1 }} />

                <input
                    value={工作流名称}
                    onChange={(e) => 设置工作流名称(e.target.value)}
                    placeholder={工具.工作流名称占位}
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
                    {工具.语言}
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

            {显示加载外部积木 && (
                <弹窗 标题={工具.工具菜单.加载外部积木标题} onClose={() => set显示加载外部积木(false)}>
                    <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
                        {工具.工具菜单.加载外部积木说明}
                    </div>
                    <input
                        value={外部积木URL}
                        onChange={(e) => set外部积木URL(e.target.value)}
                        placeholder="https://example.com/my-block.js"
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: 4,
                            marginBottom: 16,
                            boxSizing: 'border-box',
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                            onClick={() => set显示加载外部积木(false)}
                            style={{
                                padding: '6px 16px',
                                border: '1px solid #ccc',
                                borderRadius: 4,
                                cursor: 'pointer',
                                background: 'white',
                            }}
                        >
                            {工具.工具菜单.加载 === '加载' ? '取消' : 'Cancel'}
                        </button>
                        <button
                            onClick={执行加载外部积木}
                            style={{
                                padding: '6px 16px',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                background: '#2c3e50',
                                color: 'white',
                            }}
                        >
                            {工具.工具菜单.加载}
                        </button>
                    </div>
                </弹窗>
            )}

            {显示关于 && (
                <弹窗 标题={工具.帮助菜单.关于标题} onClose={() => set显示关于(false)}>
                    <div style={{ lineHeight: 1.8 }}>
                        <div><strong>CI Blocks</strong></div>
                        <div>{工具.帮助菜单.关于描述}</div>
                        <div style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
                            {工具.帮助菜单.版本}：0.1.0
                        </div>
                    </div>
                </弹窗>
            )}

            {显示快捷键 && (
                <弹窗 标题={工具.帮助菜单.快捷键标题} onClose={() => set显示快捷键(false)}>
                    <div style={{ lineHeight: 1.8, fontSize: 13 }}>
                        <div><strong>{工具.帮助菜单.分组编辑器}</strong></div>
                        <div>Ctrl+S：{工具.帮助菜单.快捷键保存}</div>
                        <div>Ctrl+Shift+S：{工具.另存为}</div>
                        <div>Ctrl+O：{工具.帮助菜单.快捷键打开}</div>
                        <div>Ctrl+N：{工具.帮助菜单.快捷键新建}</div>
                        <div style={{ marginTop: 12 }}><strong>{工具.帮助菜单.分组画布}</strong></div>
                        <div>Ctrl+Z：{工具.帮助菜单.快捷键撤销}</div>
                        <div>Ctrl+Y：{工具.帮助菜单.快捷键重做}</div>
                        <div>Ctrl+C：{工具.帮助菜单.快捷键复制}</div>
                        <div>Ctrl+X：{工具.帮助菜单.快捷键剪切}</div>
                        <div>Ctrl+V：{工具.帮助菜单.快捷键粘贴}</div>
                        <div>Delete：{工具.帮助菜单.快捷键删除}</div>
                        <div>Ctrl+A：{工具.帮助菜单.快捷键全选}</div>
                        <div style={{ marginTop: 12 }}><strong>{工具.帮助菜单.分组缩放}</strong></div>
                        <div>Ctrl+滚轮：{工具.帮助菜单.快捷键滚轮缩放}</div>
                        <div>Ctrl+=：{工具.帮助菜单.快捷键放大}</div>
                        <div>Ctrl+-：{工具.帮助菜单.快捷键缩小}</div>
                    </div>
                </弹窗>
            )}
        </>
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
                minWidth: 260,
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

function 子菜单({ 名, children }: { 名: string; children: React.ReactNode }) {
    const [悬停, set悬停] = useState(false);
    return (
        <div
            style={{ position: 'relative' }}
            onMouseEnter={() => set悬停(true)}
            onMouseLeave={() => set悬停(false)}
        >
            <div
                style={{
                    padding: '8px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13,
                    background: 悬停 ? '#f0f0f0' : 'white',
                }}
            >
                <span>{名}</span>
                <span style={{ color: '#999' }}>▶</span>
            </div>
            {悬停 && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: '100%',
                        marginLeft: 2,
                        background: 'white',
                        border: '1px solid #ccc',
                        borderRadius: 4,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        minWidth: 260,
                        padding: '4px 0',
                        zIndex: 300,
                    }}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

function 弹窗({
                  标题,
                  children,
                  onClose,
              }: {
    标题: string;
    children: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: 8,
                    padding: 24,
                    minWidth: 400,
                    maxWidth: 600,
                    maxHeight: '80vh',
                    overflow: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <strong style={{ fontSize: 16 }}>{标题}</strong>
                    <button
                        onClick={onClose}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: 20,
                            cursor: 'pointer',
                            color: '#999',
                        }}
                    >
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}