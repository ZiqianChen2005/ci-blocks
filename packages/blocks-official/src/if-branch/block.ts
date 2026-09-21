import { 定义积木, type IRNode } from '@cib/block-sdk';

export interface 分支条件输入 {
    过滤键: 'branches' | 'paths' | 'tags';
    过滤值: string;
}

export const 分支条件 = 定义积木<分支条件输入>({
    id: 'cib/if-branch',
    keyword: '分支条件',
    aliases: ['过滤', '分支过滤'],
    version: '0.1.0',
    category: '基础',
    meta: {
        icon: '🌿',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '限制哪些分支 / 路径 / 标签触发工作流',
        tags: ['过滤', '分支', '路径'],
    },
    schema: [
        {
            键: '过滤键',
            类型: '枚举',
            选项: ['branches', 'paths', 'tags'],
            默认: 'branches',
        },
        {
            键: '过滤值',
            类型: '文本',
            必填: true,
            说明: '多个值用英文逗号分隔，如 main,dev',
        },
    ],
    生成IR: (输入): IRNode[] => [
        {
            kind: '过滤',
            keyword: '分支条件',
            键: 输入.过滤键,
            值: (输入.过滤值 ?? '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
        },
    ],
});