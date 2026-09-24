import { useMemo } from 'react';
import { use编辑器 } from '../store/编辑器状态';
import { use语言 } from '../store/语言状态';
import { 生成GitHubYAML, type IR工作流 } from '@cib/core';

interface Props {
    工作流名称?: string;
    平台?: 'github' | 'gitlab' | 'circleci' | 'jenkins';
}

export function 预览栏({ 工作流名称, 平台 = 'github' }: Props) {
    const IR = use编辑器((s) => s.IR);
    const 语言包 = use语言((s) => s.语言包);

    const 平台名 = useMemo(() => {
        switch (平台) {
            case 'github': return 语言包.预览栏.平台GitHub;
            case 'gitlab': return 语言包.预览栏.平台GitLab;
            case 'circleci': return 语言包.预览栏.平台CircleCI;
            case 'jenkins': return 语言包.预览栏.平台Jenkins;
            default: return 语言包.预览栏.平台GitHub;
        }
    }, [平台, 语言包]);

    const 代码 = useMemo(() => {
        try {
            const 工作流: IR工作流 = {
                名称: 工作流名称 || 语言包.通用.未命名工作流,
                触发器: [
                    { kind: '触发器', keyword: '推送', 事件: 'push', 过滤: { branches: ['main'] } },
                ],
                节点: IR,
            };

            // 未来：按平台选 emitter
            switch (平台) {
                case 'github':
                default:
                    return 生成GitHubYAML(工作流);
            }
        } catch (e) {
            return `# ${语言包.预览栏.生成失败}：${(e as Error).message}`;
        }
    }, [IR, 工作流名称, 语言包, 平台]);

    return (
        <div style={{ background: '#1e1e1e', color: '#ddd', padding: 12, overflow: 'auto' }}>
            <h3 style={{ margin: '0 0 12px', color: '#fff' }}>
                {语言包.预览栏.标题}：{平台名}
            </h3>
            <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
        {代码}
      </pre>
        </div>
    );
}