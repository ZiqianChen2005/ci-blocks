import { 定义积木, type IRNode, type IR步骤 } from '@cib/core';

export interface 追根溯源输入 {
    校验命令: string;
    工作目录?: string;
    超时分钟?: string;
    上传证据: '是' | '否';
    证据路径?: string;
    失败动作: '拒绝' | '仅告警';
}

export const 追根溯源 = 定义积木<追根溯源输入>({
    id: 'cib/provenance',
    keyword: '追根溯源',
    aliases: ['数据溯源', '复现校验', 'provenance'],
    version: '0.1.0',
    category: '科研',
    meta: {
        icon: '🔬',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '跑你自己的校验脚本，并留存证据，防"数据对不上、结果复现不了"',
        tags: ['科研', '溯源', '复现', '证据'],
    },
    schema: [
        {
            键: '校验命令',
            类型: '文本',
            必填: true,
            默认: 'python scripts/verify_data.py',
            说明: '需要已有校验脚本，如 python scripts/verify.py',
        },
        {
            键: '工作目录',
            类型: '文本',
            默认: '.',
            说明: '仓库根填 .，子目录填 path/to',
        },
        {
            键: '超时分钟',
            类型: '文本',
            默认: '30',
            说明: '校验超时时间',
        },
        {
            键: '上传证据',
            类型: '枚举',
            选项: ['是', '否'],
            默认: '是',
        },
        {
            键: '证据路径',
            类型: '文本',
            默认: 'evidence/',
            说明: '证据目录，如 results/、reports/',
        },
        {
            键: '失败动作',
            类型: '枚举',
            选项: ['拒绝', '仅告警'],
            默认: '拒绝',
        },
    ],
    生成IR: (输入): IRNode[] => {
        const 命令 = 输入.校验命令 ?? 'python scripts/verify_data.py';
        const 目录 = 输入.工作目录 ?? '.';
        const 超时 = parseInt(输入.超时分钟 ?? '30', 10) || 30;
        const 上传 = 输入.上传证据 ?? '是';
        const 证据路径 = 输入.证据路径 ?? 'evidence/';
        const 失败动作 = 输入.失败动作 ?? '拒绝';

        const 步骤: IR步骤[] = [];

        // 1. checkout
        步骤.push({
            kind: '步骤',
            keyword: '检出代码',
            name: '检出代码',
            uses: 'actions/checkout@v4',
            with: { 'fetch-depth': 0 },
        });

        // 2. 校验
        步骤.push({
            kind: '步骤',
            keyword: '追根溯源校验',
            name: '追根溯源校验',
            'working-directory': 目录,
            timeout: 超时,
            env: {
                CIB_FAIL_ACTION: 失败动作,
            },
            run: [
                'set +e',
                `(${命令})`,
                'RC=$?',
                'set -e',
                '',
                'if [ "$RC" -ne 0 ]; then',
                '  if [ "$CIB_FAIL_ACTION" = "仅告警" ]; then',
                '    echo "::warning::追根溯源校验失败（退出码 $RC），仅告警"',
                '    exit 0',
                '  fi',
                '  echo "::error::追根溯源校验失败（退出码 $RC）"',
                '  exit 1',
                'fi',
                '',
                'echo "追根溯源校验通过"',
            ].join('\n'),
        });

        // 3. 上传证据
        if (上传 === '是') {
            步骤.push({
                kind: '步骤',
                keyword: '上传证据',
                name: '上传证据',
                if: 'always()',
                uses: 'actions/upload-artifact@v4',
                with: {
                    name: 'provenance-evidence',
                    path: 证据路径,
                    'retention-days': 30,
                    'if-no-files-found': 'ignore',
                },
            });
        }

        return [
            {
                kind: '作业',
                id: 'provenance',
                keyword: '追根溯源',
                运行环境: 'ubuntu-latest',
                步骤,
            },
        ];
    },
    校验: (输入) => {
        const 问题 = [];
        if (!输入.校验命令?.trim()) {
            问题.push({ 级别: '错误' as const, 消息: '校验命令不能为空' });
        }
        const 超时 = parseInt(输入.超时分钟 ?? '30', 10);
        if (Number.isNaN(超时) || 超时 <= 0) {
            问题.push({ 级别: '错误' as const, 消息: '超时分钟必须是正整数' });
        }
        if (输入.上传证据 === '是' && !输入.证据路径?.trim()) {
            问题.push({ 级别: '错误' as const, 消息: '上传证据时，证据路径不能为空' });
        }
        return 问题;
    },
});