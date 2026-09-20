import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import { 画布 } from './画布';
import { 预览栏 } from './预览栏';
import { 菜单栏 } from './菜单栏';
import {
    时间铡刀,
    次数铡刀,
    分支条件,
    行为条件,
    越权控制,
    异地容灾,
    工作流判定条件,
    自动编译,
    成品校验,
    行为记录,
    追根溯源,
} from '@cib/blocks-official';
import { 设置积木箱 } from '../store/编辑器状态';
import { use语言 } from '../store/语言状态';

export function 三栏布局() {
    const 工作区 = useRef<Blockly.WorkspaceSvg | null>(null);
    const 语言包 = use语言((s) => s.语言包);
    const [工作流名称, 设置工作流名称] = useState(语言包.通用.未命名工作流);
    const 用户改过 = useRef(false);

    useEffect(() => {
        if (!用户改过.current) {
            设置工作流名称(语言包.通用.未命名工作流);
        }
    }, [语言包]);

    useEffect(() => {
        设置积木箱([
            行为条件,
            分支条件,
            工作流判定条件,
            时间铡刀,
            次数铡刀,
            越权控制,
            异地容灾,
            自动编译,
            成品校验,
            行为记录,
            追根溯源,
        ]);
    }, []);

    const 包装设置工作流名称 = (n: string) => {
        用户改过.current = true;
        设置工作流名称(n);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
            <菜单栏
                工作区={工作区}
                工作流名称={工作流名称}
                设置工作流名称={包装设置工作流名称}
            />
            <div
                style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: '1fr 480px',
                    gap: '1px',
                    background: '#ddd',
                    overflow: 'hidden',
                }}
            >
                <div style={{ position: 'relative', overflow: 'hidden', height: '100%', minHeight: 0 }}>
                    <画布 工作区={工作区} />
                </div>
                <div style={{ position: 'relative', overflow: 'auto', height: '100%', minHeight: 0 }}>
                    <预览栏 工作流名称={工作流名称} />
                </div>
            </div>
        </div>
    );
}