import { 定义积木, type IRNode } from '@cib/core';

export interface 行为条件输入 {
    事件: 'push' | 'pull_request' | 'schedule' | 'tag' | 'workflow_dispatch';
}

export const 行为条件 = 定义积木<行为条件输入>({
    id: 'cib/if-action',
    keyword: '行为条件',
    aliases: ['触发器', '事件', 'on'],
    version: '0.1.0',
    category: '基础',
    meta: {
        icon: '🎯',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '定义工作流的触发事件（on:）',
        tags: ['触发', '事件', 'on'],
    },
    schema: [
        {
            键: '事件',
            类型: '枚举',
            选项: ['push', 'pull_request', 'schedule', 'tag', 'workflow_dispatch'],
            默认: 'push',
        },
    ],
    生成IR: (输入): IRNode[] => [
        {
            kind: '触发器',
            keyword: '行为条件',
            事件: 输入.事件,
            过滤: {},
        },
    ],
});