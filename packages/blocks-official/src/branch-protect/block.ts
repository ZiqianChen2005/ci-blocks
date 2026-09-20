import { 定义积木, type IRNode, type IR步骤 } from '@cib/core';

export interface 异地容灾输入 {
    保护分支: string;
    要求CI通过: '是' | '否';
    要求review数: string;
    禁止操作: string;
    镜像分支: string;
}

export const 异地容灾 = 定义积木<异地容灾输入>({
    id: 'cib/branch-protect',
    keyword: '异地容灾',
    aliases: ['分支保护', '镜像备份', '主分支守护'],
    version: '0.1.0',
    category: '门禁',
    meta: {
        icon: '🛡️',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '保护主分支，检测直接 push，镜像到备份分支',
        tags: ['分支保护', '镜像', '容灾'],
    },
    schema: [
        {
            键: '保护分支',
            类型: '文本',
            必填: true,
            默认: 'main,master',
            说明: '要保护的分支名，多个用逗号分隔，支持 * 通配',
        },
        {
            键: '要求CI通过',
            类型: '枚举',
            选项: ['是', '否'],
            默认: '是',
        },
        {
            键: '要求review数',
            类型: '文本',
            默认: '0',
            说明: 'PR 至少需要的 review 数（0 = 不检查）',
        },
        {
            键: '禁止操作',
            类型: '文本',
            默认: 'force push,直接 commit',
            说明: '多个用逗号分隔，CI 里能检测的会警告',
        },
        {
            键: '镜像分支',
            类型: '文本',
            默认: 'backup/main',
            说明: '备份到哪个分支，留空则不镜像',
        },
    ],
    生成IR: (输入): IRNode[] => {
        const 保护分支 = 输入.保护分支 ?? 'main,master';
        const 要求CI = 输入.要求CI通过 ?? '是';
        const 要求Review = parseInt(输入.要求review数 ?? '0', 10) || 0;
        const 禁止 = 输入.禁止操作 ?? '';
        const 镜像 = 输入.镜像分支 ?? '';

        const 步骤: IR步骤[] = [];

        // 1. checkout
        步骤.push({
            kind: '步骤',
            keyword: '检出代码',
            name: '检出代码',
            uses: 'actions/checkout@v4',
            with: { 'fetch-depth': 0 },
        });

        // 2. 保护检查
        步骤.push({
            kind: '步骤',
            keyword: '保护分支检查',
            name: '保护分支检查',
            env: {
                CIB_PROTECTED: 保护分支,
                CIB_REQUIRE_CI: 要求CI === '是' ? 'true' : 'false',
                CIB_MIN_REVIEW: String(要求Review),
                CIB_FORBID: 禁止,
            },
            run: [
                'TARGET="${GITHUB_BASE_REF:-${GITHUB_REF_NAME}}"',
                'PROTECTED="${CIB_PROTECTED}"',
                '',
                '# 判断当前分支是否在保护列表',
                'IS_PROTECTED=0',
                'for pat in $(echo "$PROTECTED" | tr "," " "); do',
                '  pat=$(echo "$pat" | xargs)',
                '  case "$TARGET" in',
                '    $pat) IS_PROTECTED=1; break ;;',
                '  esac',
                'done',
                '',
                'if [ "$IS_PROTECTED" = "0" ]; then',
                '  echo "分支 $TARGET 不在保护列表，跳过"',
                '  exit 0',
                'fi',
                '',
                'echo "分支 $TARGET 受保护，开始检查"',
                '',
                '# 直接 push 检测（push 事件 + 无 PR）',
                'if [ "${GITHUB_EVENT_NAME}" = "push" ]; then',
                '  if echo "$CIB_FORBID" | grep -q "直接 commit"; then',
                '    if [ "${GITHUB_ACTOR}" != "github-actions[bot]" ] && [ "${GITHUB_ACTOR}" != "dependabot[bot]" ]; then',
                '      echo "::warning::检测到 $GITHUB_ACTOR 直接 push 到保护分支 $TARGET"',
                '    fi',
                '  fi',
                'fi',
                '',
                '# review 数检测（PR 事件）',
                'if [ "${GITHUB_EVENT_NAME}" = "pull_request" ]; then',
                '  if [ "$CIB_MIN_REVIEW" -gt 0 ]; then',
                '    REVIEWS="${GITHUB_EVENT_PULL_REQUEST_REVIEWS:-0}"',
                '    if [ "$REVIEWS" -lt "$CIB_MIN_REVIEW" ]; then',
                '      echo "::error::PR 需要至少 $CIB_MIN_REVIEW 个 review，当前 $REVIEWS"',
                '      exit 1',
                '    fi',
                '  fi',
                'fi',
                '',
                '# 提示：真正的分支保护需要在 GitHub 仓库设置里配置',
                'echo "::notice::提醒：请在仓库 Settings → Branches 配置分支保护规则"',
                '',
                'echo "保护分支检查通过"',
            ].join('\n'),
        });

        // 3. 镜像备份
        if (镜像.trim()) {
            步骤.push({
                kind: '步骤',
                keyword: '镜像到备份分支',
                name: '镜像到备份分支',
                if: "github.ref == 'refs/heads/main'",
                run: [
                    'git config user.name "cib-bot"',
                    'git config user.email "cib-bot@users.noreply.github.com"',
                    `git push origin HEAD:refs/heads/${镜像} --force`,
                ].join('\n'),
            });
        }

        return [
            {
                kind: '作业',
                id: 'branch_protect',
                keyword: '异地容灾',
                运行环境: 'ubuntu-latest',
                步骤,
            },
        ];
    },
    校验: (输入) => {
        const 问题 = [];
        if (!输入.保护分支?.trim()) {
            问题.push({ 级别: '错误' as const, 消息: '保护分支不能为空' });
        }
        const review = parseInt(输入.要求review数 ?? '0', 10);
        if (Number.isNaN(review) || review < 0) {
            问题.push({ 级别: '错误' as const, 消息: 'review 数必须是非负整数' });
        }
        return 问题;
    },
});