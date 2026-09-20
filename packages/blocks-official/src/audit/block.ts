import { 定义积木, type IRNode, type IR步骤 } from '@cib/core';

export interface 行为记录输入 {
    日志路径?: string;
    保留天数?: string;
    上传产物?: '是' | '否';
}

export const 行为记录 = 定义积木<行为记录输入>({
    id: 'cib/audit',
    keyword: '行为记录',
    aliases: ['审计', '日志', 'audit'],
    version: '0.1.0',
    category: '审计',
    meta: {
        icon: '📝',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '把 CI 运行的关键信息记录成日志，甩锅时不用吵',
        tags: ['审计', '日志', 'audit'],
    },
    schema: [
        {
            键: '日志路径',
            类型: '文本',
            默认: '.cib-audit/',
            说明: '日志写到哪个目录',
        },
        {
            键: '保留天数',
            类型: '文本',
            默认: '30',
            说明: 'artifact 保留天数（1~90）',
        },
        {
            键: '上传产物',
            类型: '枚举',
            选项: ['是', '否'],
            默认: '是',
        },
    ],
    生成IR: (输入): IRNode[] => {
        const 日志目录 = 输入.日志路径 ?? '.cib-audit/';
        const 保留 = parseInt(输入.保留天数 ?? '30', 10) || 30;
        const 上传 = 输入.上传产物 ?? '是';

        const 步骤: IR步骤[] = [];

        // 1. checkout（fetch-depth: 0 才能读 git 历史）
        步骤.push({
            kind: '步骤',
            keyword: '检出代码',
            name: '检出代码',
            uses: 'actions/checkout@v4',
            with: { 'fetch-depth': 0 },
        });

        // 2. 收集
        步骤.push({
            kind: '步骤',
            keyword: '收集行为记录',
            name: '收集行为记录',
            if: 'always()',
            run: [
                `mkdir -p "${日志目录}"`,
                `LOG="${日志目录}audit-$(date -u +%Y%m%dT%H%M%SZ).log"`,
                '{',
                '  echo "=== CI Blocks 行为记录 ==="',
                '  echo "时间: $(date -u +%Y-%m-%dT%H:%M:%SZ)"',
                '  echo "触发者: ${GITHUB_ACTOR}"',
                '  echo "事件: ${GITHUB_EVENT_NAME}"',
                '  echo "仓库: ${GITHUB_REPOSITORY}"',
                '  echo "分支: ${GITHUB_REF}"',
                '  echo "提交: ${GITHUB_SHA}"',
                '  echo "运行 ID: ${GITHUB_RUN_ID}"',
                '  echo "运行编号: ${GITHUB_RUN_NUMBER}"',
                '  echo "状态: ${CIB_STATUS:-unknown}"',
                '  echo "驳回原因: ${CIB_REJECT_REASON:-（无）}"',
                '  echo "绕过尝试: ${CIB_BYPASS_ATTEMPT:-（无）}"',
                '  echo "--- 改动文件 ---"',
                '  git diff --name-only HEAD~1 2>/dev/null || echo "（无法获取）"',
                '  echo "--- 上游作业结果 ---"',
                '  echo "gates: ${CIB_NEEDS_GATES:-unknown}"',
                '} > "$LOG"',
                'cat "$LOG"',
            ].join('\n'),
        });

        // 3. 上传
        if (上传 === '是') {
            步骤.push({
                kind: '步骤',
                keyword: '上传审计日志',
                name: '上传审计日志',
                if: 'always()',
                uses: 'actions/upload-artifact@v4',
                with: {
                    name: 'cib-audit',
                    path: 日志目录,
                    'retention-days': 保留,
                },
            });
        }

        return [
            {
                kind: '作业',
                id: 'audit',
                keyword: '行为记录',
                运行环境: 'ubuntu-latest',
                步骤,
            },
        ];
    },
    校验: (输入) => {
        const 问题 = [];
        if (!输入.日志路径?.trim()) {
            问题.push({ 级别: '错误' as const, 消息: '日志路径不能为空' });
        }
        const 保留 = parseInt(输入.保留天数 ?? '30', 10);
        if (Number.isNaN(保留) || 保留 < 1 || 保留 > 90) {
            问题.push({ 级别: '错误' as const, 消息: '保留天数必须是 1~90 的整数' });
        }
        return 问题;
    },
});