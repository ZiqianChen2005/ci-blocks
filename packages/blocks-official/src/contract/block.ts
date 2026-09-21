import { 定义积木, type IRNode, type IR步骤 } from '@cib/block-sdk';

export interface 契约对应输入 {
    契约类型: 'OpenAPI' | 'Protobuf' | 'GraphQL' | 'JSON Schema' | 'TypeScript';
    契约文件: string;
    校验命令: string;
    工作目录?: string;
    超时分钟?: string;
    上传差异报告: '是' | '否';
    报告路径?: string;
    失败动作: '拒绝' | '仅告警';
}

export const 契约对应 = 定义积木<契约对应输入>({
    id: 'cib/contract',
    keyword: '契约对应',
    aliases: ['接口校验', '契约检查', 'contract'],
    version: '0.1.0',
    category: '项目',
    meta: {
        icon: '📦',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '校验前后端字段对齐，防"userName vs user_name"式联调灾难',
        tags: ['契约', '接口', 'OpenAPI'],
    },
    schema: [
        {
            键: '契约类型',
            类型: '枚举',
            选项: ['OpenAPI', 'Protobuf', 'GraphQL', 'JSON Schema', 'TypeScript'],
            默认: 'OpenAPI',
        },
        {
            键: '契约文件',
            类型: '文本',
            必填: true,
            默认: 'api/openapi.yaml',
            说明: '契约文件路径，如 api/openapi.yaml',
        },
        {
            键: '校验命令',
            类型: '文本',
            必填: true,
            默认: 'npx openapi-diff api/openapi.yaml api/openapi.yaml',
            说明: '校验命令，失败退出码非 0',
        },
        {
            键: '工作目录',
            类型: '文本',
            默认: '.',
        },
        {
            键: '超时分钟',
            类型: '文本',
            默认: '10',
        },
        {
            键: '上传差异报告',
            类型: '枚举',
            选项: ['是', '否'],
            默认: '是',
        },
        {
            键: '报告路径',
            类型: '文本',
            默认: 'contract-diff/',
        },
        {
            键: '失败动作',
            类型: '枚举',
            选项: ['拒绝', '仅告警'],
            默认: '拒绝',
        },
    ],
    生成IR: (输入): IRNode[] => {
        const 类型 = 输入.契约类型 ?? 'OpenAPI';
        const 契约文件 = 输入.契约文件 ?? 'api/openapi.yaml';
        const 命令 = 输入.校验命令 ?? 'npx openapi-diff api/openapi.yaml api/openapi.yaml';
        const 目录 = 输入.工作目录 ?? '.';
        const 超时 = parseInt(输入.超时分钟 ?? '10', 10) || 10;
        const 上传 = 输入.上传差异报告 ?? '是';
        const 报告路径 = 输入.报告路径 ?? 'contract-diff/';
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

        // 2. 契约校验
        步骤.push({
            kind: '步骤',
            keyword: '契约校验',
            name: '契约校验',
            'working-directory': 目录,
            timeout: 超时,
            env: {
                CIB_CONTRACT_TYPE: 类型,
                CIB_CONTRACT_FILE: 契约文件,
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
                '    echo "::warning::契约校验失败（退出码 $RC），仅告警"',
                '    exit 0',
                '  fi',
                '  echo "::error::契约校验失败（退出码 $RC）"',
                '  exit 1',
                'fi',
                '',
                'echo "契约校验通过"',
            ].join('\n'),
        });

        // 3. 上传差异报告
        if (上传 === '是') {
            步骤.push({
                kind: '步骤',
                keyword: '上传差异报告',
                name: '上传差异报告',
                if: 'always()',
                uses: 'actions/upload-artifact@v4',
                with: {
                    name: 'contract-diff',
                    path: 报告路径,
                    'retention-days': 30,
                    'if-no-files-found': 'ignore',
                },
            });
        }

        return [
            {
                kind: '作业',
                id: 'contract',
                keyword: '契约对应',
                运行环境: 'ubuntu-latest',
                步骤,
            },
        ];
    },
    校验: (输入) => {
        const 问题 = [];
        if (!输入.契约文件?.trim()) {
            问题.push({ 级别: '错误' as const, 消息: '契约文件不能为空' });
        }
        if (!输入.校验命令?.trim()) {
            问题.push({ 级别: '错误' as const, 消息: '校验命令不能为空' });
        }
        const 超时 = parseInt(输入.超时分钟 ?? '10', 10);
        if (Number.isNaN(超时) || 超时 <= 0) {
            问题.push({ 级别: '错误' as const, 消息: '超时分钟必须是正整数' });
        }
        if (输入.上传差异报告 === '是' && !输入.报告路径?.trim()) {
            问题.push({ 级别: '错误' as const, 消息: '上传差异报告时，报告路径不能为空' });
        }
        return 问题;
    },
});