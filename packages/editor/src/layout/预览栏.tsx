import { useMemo } from 'react';
import { use编辑器 } from '../store/编辑器状态';
import { 生成GitHubYAML, type IR工作流 } from '@cib/core';

export function 预览栏() {
    const IR = use编辑器((s) => s.IR);

    const yaml = useMemo(() => {
        try {
            const 工作流: IR工作流 = {
                名称: '未命名工作流',
                触发器: [
                    { kind: '触发器', keyword: '推送', 事件: 'push', 过滤: { branches: ['main'] } },
                ],
                节点: IR,
            };
            return 生成GitHubYAML(工作流);
        } catch (e) {
            return `# 生成失败：${(e as Error).message}`;
        }
    }, [IR]);

    return (
        <div style={{ background: '#1e1e1e', color: '#ddd', padding: 12, overflow: 'auto' }}>
            <h3 style={{ margin: '0 0 12px', color: '#fff' }}>YAML 预览</h3>
            <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
        {yaml}
      </pre>
        </div>
    );
}