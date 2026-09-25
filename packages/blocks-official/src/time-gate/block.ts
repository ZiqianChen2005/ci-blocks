import { 定义积木, type IRNode } from '@cib/block-sdk';

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
    比较: '之前' | '之后';
    基准时间: string;
    时区: string;
}

export const 时间铡刀 = 定义积木<时间铡刀输入>({
    id: 'cib/time-gate',
    keyword: '时间铡刀',
    aliases: ['时间条件', '封仓', '开仓', '死线'],
    version: '0.5.0',
    category: '门禁',
    meta: {
        icon: '⏰',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '当前时间在基准时间之前/之后时，执行内嵌的积木',
        tags: ['时间', '条件', '封仓', '截止'],
    },
    schema: [
        {
            键: '比较',
            类型: '枚举',
            选项: ['之前', '之后'],
            默认: '之后',
            说明: '当前时间 vs 基准时间',
        },
        {
            键: '基准时间',
            类型: '日期时间',
            必填: true,
            说明: '比较的基准时刻',
        },
        {
            键: '时区',
            类型: '枚举',
            选项: 时区选项,
            默认: 'UTC+08:00',
        },
    ],
    生成IR: (输入): IRNode[] => [
        {
            kind: '条件',
            keyword: '时间铡刀',
            blockId: 'cib/time-gate',
            条件类型: '时间',
            参数: {
                比较: 输入.比较 ?? '之后',
                基准时间: 输入.基准时间,
                时区: 输入.时区 ?? 'UTC+08:00',
            },
            条件成立时执行: [],
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