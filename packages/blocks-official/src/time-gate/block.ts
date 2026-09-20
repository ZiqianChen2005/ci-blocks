import { 定义积木, type IRNode } from '@cib/core';

/** 生成 UTC-12:00 ~ UTC+12:00，步长 30 分钟 */
function 生成时区选项(): string[] {
    const 选项: string[] = [];
    for (let 分钟 = -12 * 60; 分钟 <= 12 * 60; 分钟 += 30) {
        const 符号 = 分钟 < 0 ? '-' : '+';
        const 绝对 = Math.abs(分钟);
        const 时 = Math.floor(绝对 / 60).toString().padStart(2, '0');
        const 分 = (绝对 % 60).toString().padStart(2, '0');
        选项.push(`UTC${符号}${时}:${分}`);
    }
    return 选项;
}

export const 时区选项 = 生成时区选项();

export interface 时间铡刀输入 {
    基准时间: string;
    时区: string;      // 'UTC-12:00' ~ 'UTC+12:00'
    模式: '开仓冻结' | '超时封仓';
}

export const 时间铡刀 = 定义积木<时间铡刀输入>({
    id: 'cib/time-gate',
    keyword: '时间铡刀',
    aliases: ['封仓门禁', '死线', '开仓', '封仓'],
    version: '0.3.0',
    category: '门禁',
    meta: {
        icon: '⏰',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '在合法时间窗口之外的提交都会被拒绝，支持时区',
        tags: ['封仓', '截止', '开仓', '门禁', '时区'],
    },
    schema: [
        {
            键: '基准时间',
            类型: '日期时间',
            必填: true,
            说明: '开仓或封仓的基准时刻',
        },
        {
            键: '时区',
            类型: '枚举',
            选项: 时区选项,
            默认: 'UTC+08:00',
        },
        {
            键: '模式',
            类型: '枚举',
            选项: ['开仓冻结', '超时封仓'],
            默认: '超时封仓',
        },
    ],
    生成IR: (输入): IRNode[] => [
        {
            kind: '门禁',
            keyword: '时间铡刀',
            blockId: 'cib/time-gate',
            拦截时机: '提交时',
            参数: {
                基准时间: 输入.基准时间,
                时区: 输入.时区 ?? 'UTC+08:00',
                模式: 输入.模式 ?? '超时封仓',
            },
        },
    ],
    校验: (输入) => {
        const 问题 = [];
        if (!输入.基准时间) {
            问题.push({ 级别: '错误' as const, 消息: '基准时间不能为空' });
        } else if (Number.isNaN(Date.parse(输入.基准时间))) {
            问题.push({ 级别: '错误' as const, 消息: `基准时间格式非法：${输入.基准时间}` });
        }
        return 问题;
    },
});