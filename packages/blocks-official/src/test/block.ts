import { 定义积木, type IRNode, type IR步骤 } from '@cib/core';

export interface 成品校验输入 {
    测试命令: string;
    工作目录?: string;
    超时分钟?: string;
    上传报告: '是' | '否';
    报告路径?: string;
}

export const 成品校验 = 定义积木<成品校验输入>({
    id: 'cib/test',
    keyword: '成品校验',
    aliases: ['测试', '校验', 'test'],
    version: '0.1.0',
    category: '校验',
    meta: {
        icon: '✅',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '在干净环境里跑测试，专治"我本地测过了"',
        tags: ['测试', 'test', '校验'],
    },
    schema: [
        {
            键: '测试命令',
            类型: '文本',
            必填: true,
            默认: 'npm test',
            说明: '如 npm test、./gradlew test、pytest',
        },
        {
            键: '工作目录',
            类型: '文本',
            默认: '.',
            说明: '仓库根填 .，子包填 packages/xxx',
        },
        {
            键: '超时分钟',
            类型: '文本',
            默认: '10',
            说明: '测试超时时间，防卡死',
        },
        {
            键: '上传报告',
            类型: '枚举',
            选项: ['是', '否'],
            默认: '是',
        },
        {
            键: '报告路径',
            类型: '文本',
            默认: 'build/reports/tests/',
            说明: '测试报告目录，如 build/reports/tests/',
        },
    ],
    生成IR: (输入): IRNode[] => {
        const 命令 = 输入.测试命令 ?? 'npm test';
        const 目录 = 输入.工作目录 ?? '.';
        const 超时 = parseInt(输入.超时分钟 ?? '10', 10) || 10;
        const 上传 = 输入.上传报告 ?? '是';
        const 报告路径 = 输入.报告路径 ?? 'build/reports/tests/';

        const 步骤: IR步骤[] = [];

        // 1. checkout
        步骤.push({
            kind: '步骤',
            keyword: '检出代码',
            name: '检出代码',
            uses: 'actions/checkout@v4',
        });

        // 2. 运行测试
        步骤.push({
            kind: '步骤',
            keyword: '运行测试',
            name: '运行测试',
            'working-directory': 目录,
            run: 命令,
            timeout: 超时,
        });

        // 3. 上传报告
        if (上传 === '是') {
            步骤.push({
                kind: '步骤',
                keyword: '上传测试报告',
                name: '上传测试报告',
                if: 'always()',
                uses: 'actions/upload-artifact@v4',
                with: {
                    name: 'test-report',
                    path: 报告路径,
                },
            });
        }

        return [
            {
                kind: '作业',
                id: 'test',
                keyword: '成品校验',
                运行环境: 'ubuntu-latest',
                步骤,
            },
        ];
    },
    校验: (输入) => {
        const 问题 = [];
        if (!输入.测试命令?.trim()) {
            问题.push({ 级别: '错误' as const, 消息: '测试命令不能为空' });
        }
        const 超时 = parseInt(输入.超时分钟 ?? '10', 10);
        if (Number.isNaN(超时) || 超时 <= 0) {
            问题.push({ 级别: '错误' as const, 消息: '超时分钟必须是正整数' });
        }
        if (输入.上传报告 === '是' && !输入.报告路径?.trim()) {
            问题.push({ 级别: '错误' as const, 消息: '上传报告时，报告路径不能为空' });
        }
        return 问题;
    },
});