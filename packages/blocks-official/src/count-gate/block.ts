import { 定义积木, type IRNode } from '@cib/block-sdk';

export interface 次数铡刀输入 {
    计数来源: '仓库总提交数' | '分支提交数' | '文件修改次数' | '自定义';
    阈值: string;
    比较: '超过' | '未达' | '等于';
    计数范围: '本次 push 内' | '从仓库创建至今' | '指定时间之后';
    模式: '硬拦截' | '仅告警';
}

function 来源转英文(来源: string): string {
    switch (来源) {
        case '仓库总提交数': return 'repo_total_commits';
        case '分支提交数': return 'branch_total_commits';
        case '文件修改次数': return 'files_modified';
        case '自定义': return 'custom';
        default: return 'branch_total_commits';
    }
}

function 比较转英文(比较: string): string {
    switch (比较) {
        case '超过': return 'gt';
        case '未达': return 'lt';
        case '等于': return 'eq';
        default: return 'gt';
    }
}

function 范围转英文(范围: string): string {
    switch (范围) {
        case '本次 push 内': return 'in_push';
        case '从仓库创建至今': return 'all_time';
        case '指定时间之后': return 'since';
        default: return 'all_time';
    }
}

export const 次数铡刀 = 定义积木<次数铡刀输入>({
    id: 'cib/count-gate',
    keyword: '次数铡刀',
    aliases: ['次数条件', '提交计数'],
    version: '0.2.0',
    category: '门禁',
    meta: {
        icon: '🔢',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '计数满足条件时，执行内嵌的积木',
        tags: ['次数', '条件', '计数'],
    },
    schema: [
        {
            键: '计数来源',
            类型: '枚举',
            选项: ['仓库总提交数', '分支提交数', '文件修改次数', '自定义'],
            默认: '分支提交数',
        },
        {
            键: '比较',
            类型: '枚举',
            选项: ['超过', '未达', '等于'],
            默认: '超过',
        },
        {
            键: '阈值',
            类型: '文本',
            必填: true,
            默认: '50',
            说明: '数字阈值',
        },
        {
            键: '计数范围',
            类型: '枚举',
            选项: ['本次 push 内', '从仓库创建至今', '指定时间之后'],
            默认: '从仓库创建至今',
        },
        {
            键: '模式',
            类型: '枚举',
            选项: ['硬拦截', '仅告警'],
            默认: '硬拦截',
        },
    ],
    生成IR: (输入): IRNode[] => [
        {
            kind: '条件',
            keyword: '次数铡刀',
            blockId: 'cib/count-gate',
            条件类型: '次数',
            参数: {
                计数来源: 来源转英文(输入.计数来源 ?? '分支提交数'),
                阈值: 输入.阈值 ?? '50',
                比较: 比较转英文(输入.比较 ?? '超过'),
                计数范围: 范围转英文(输入.计数范围 ?? '从仓库创建至今'),
                模式: 输入.模式 === '仅告警' ? 'warn' : 'block',
            },
            条件成立时执行: [],
        },
    ],
    校验: (输入) => {
        const 问题 = [];
        const 阈值 = parseInt(输入.阈值 ?? '', 10);
        if (Number.isNaN(阈值) || 阈值 < 0) {
            问题.push({ 级别: '错误' as const, 消息: '阈值必须是非负整数' });
        }
        return 问题;
    },
});