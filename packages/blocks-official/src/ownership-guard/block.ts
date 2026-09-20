import { 定义积木, type IRNode } from '@cib/core';

export interface 越权控制输入 {
    负责人表: string;
    操作类型: 'force push' | '任意 push' | 'PR 合并';
    违规动作: '拒绝合并' | '仅告警' | '记录审计';
    豁免者?: string;
}

export const 越权控制 = 定义积木<越权控制输入>({
    id: 'cib/ownership-guard',
    keyword: '越权控制',
    aliases: ['权限门禁', '目录锁'],
    version: '0.1.0',
    category: '门禁',
    meta: {
        icon: '🔒',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '按用户 ID 和文件路径确定负责范围，越权拒绝合并',
        tags: ['权限', '越权', 'CODEOWNERS'],
    },
    schema: [
        {
            键: '负责人表',
            类型: '文本',
            必填: true,
            说明: '每行 "用户ID: 路径模式"，如 alice: frontend/**',
        },
        {
            键: '操作类型',
            类型: '枚举',
            选项: ['force push', '任意 push', 'PR 合并'],
            默认: 'PR 合并',
        },
        {
            键: '违规动作',
            类型: '枚举',
            选项: ['拒绝合并', '仅告警', '记录审计'],
            默认: '拒绝合并',
        },
        {
            键: '豁免者',
            类型: '文本',
            说明: '逗号分隔的用户名，如 admin,ci-bot',
        },
    ],
    生成IR: (输入): IRNode[] => [
        {
            kind: '门禁',
            keyword: '越权控制',
            blockId: 'cib/ownership-guard',
            拦截时机: '合并前',
            参数: {
                负责人表: 输入.负责人表 ?? '',
                操作类型: 输入.操作类型 ?? 'PR 合并',
                违规动作: 输入.违规动作 ?? '拒绝合并',
                豁免者: 输入.豁免者 ?? '',
            },
        },
    ],
    校验: (输入) => {
        const 问题 = [];
        if (!输入.负责人表?.trim()) {
            问题.push({ 级别: '错误' as const, 消息: '负责人表不能为空' });
        } else {
            const 行列表 = 输入.负责人表.split('\n').filter((l) => l.trim());
            for (let i = 0; i < 行列表.length; i++) {
                const 行 = 行列表[i].trim();
                if (!行.includes(':')) {
                    问题.push({
                        级别: '错误' as const,
                        消息: `第 ${i + 1} 行格式不对（缺少冒号）：${行}`,
                    });
                }
            }
        }
        return 问题;
    },
});