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

export function 菜单栏({ 工作区, 工作流名称, 设置工作流名称 }: Props) {
    const [文件菜单开, set文件菜单开] = useState(false);
    const [提示, set提示] = useState('');
    const 文件输入 = useRef<HTMLInputElement>(null);
    const 语言 = use语言((s) => s.语言);
    const 设置语言 = use语言((s) => s.设置语言);
    const 语言包 = use语言((s) => s.语言包);
    const 菜单容器 = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const 关 = (e: MouseEvent) => {
            if (菜单容器.current && !菜单容器.current.contains(e.target as Node)) {
                set文件菜单开(false);
            }
        };
        document.addEventListener('mousedown', 关);
        return () => document.removeEventListener('mousedown', 关);
    }, []);

    const 显示提示 = (msg: string) => {
        set提示(msg);
        setTimeout(() => set提示(''), 2000);
    };

    const 新建 = () => {
        if (!工作区.current) return;
        if (!confirm(语言包.工具栏.新建确认)) return;
        工作区.current.clear();
        设置工作流名称(语言包.通用.未命名工作流);
        set文件菜单开(false);
        显示提示(语言包.工具栏.已新建);
    };

    const 保存 = () => {
        if (!工作区.current) return;
        const 文件 = 导出CIB(工作区.current, 语言, 工作流名称);
        下载CIB(文件, `${工作流名称 || 语言包.通用.未命名工作流}.cib`);
        set文件菜单开(false);
        显示提示(语言包.工具栏.已保存);
    };

    const 打开 = () => {
        文件输入.current?.click();
        set文件菜单开(false);
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

            <div ref={菜单容器} style={{ position: 'relative' }}>
                <button
                    onClick={() => set文件菜单开((v) => !v)}
                    style={{
                        padding: '4px 12px',
                        background: 文件菜单开 ? '#1a252f' : 'transparent',
                        border: '1px solid #4a5f75',
                        color: 'white',
                        borderRadius: 4,
                        cursor: 'pointer',
                    }}
                >
                    {语言包.工具栏.文件}
                </button>
                {文件菜单开 && (
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
                            minWidth: 180,
                            zIndex: 200,
                        }}
                    >
                        <菜单项 onClick={新建}>{语言包.工具栏.新建}</菜单项>
                        <菜单项 onClick={打开}>{语言包.工具栏.打开}</菜单项>
                        <菜单项 onClick={保存}>{语言包.工具栏.保存}</菜单项>
                    </div>
                )}
            </div>

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

            <div style={{ flex: 1 }} />

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

function 菜单项({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            style={{ padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
        >
            {children}
        </div>
    );
}