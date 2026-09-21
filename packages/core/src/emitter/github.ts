import { stringify } from 'yaml';
import type {
    IRNode,
    IR工作流,
    IR门禁,
    IR步骤,
    IR作业,
    IR触发器,
    IR过滤,
    IR判定,
} from '../ir/types';

const 无过滤事件 = new Set(['workflow_dispatch', 'schedule']);

function 生成门禁步骤(门禁: IR门禁, 序号: number): IR步骤 {
    switch (门禁.blockId) {
        case 'cib/time-gate': {
            const 基准 = 门禁.参数['基准时间'] as string;
            const 时区 = (门禁.参数['时区'] as string) ?? 'UTC+08:00';
            const 模式 = (门禁.参数['模式'] as string) ?? '超时封仓';

            const 纯时间 = 基准.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');

            const 转PosixTZ = (tz: string): string => {
                if (tz === 'UTC+00:00') return 'UTC';
                const m = tz.match(/^UTC([+-])(\d{2}):(\d{2})$/);
                if (!m) return 'UTC';
                const 符号 = m[1] === '+' ? '-' : '+';
                const 时 = parseInt(m[2], 10);
                const 分 = parseInt(m[3], 10);
                return 分 === 0 ? `UTC${符号}${时}` : `UTC${符号}${时}:${分}`;
            };

            const posixTZ = 转PosixTZ(时区);

            if (模式 === '开仓冻结') {
                return {
                    kind: '步骤',
                    keyword: '时间铡刀',
                    name: `检查开仓时间（${序号}）`,
                    env: { CIB_TZ: posixTZ, CIB_TZ_LABEL: 时区 },
                    run: [
                        `OPEN_AT_RAW="${纯时间}"`,
                        'TZ_TARGET="${CIB_TZ}"',
                        '',
                        'if [ "$TZ_TARGET" = "UTC" ]; then',
                        '  OPEN_AT="${OPEN_AT_RAW}Z"',
                        'else',
                        '  OPEN_AT="${OPEN_AT_RAW}"',
                        'fi',
                        '',
                        'OPEN_EPOCH=$(TZ="$TZ_TARGET" date -d "$OPEN_AT" +%s 2>/dev/null \\',
                        '  || TZ="$TZ_TARGET" date -j -f "%Y-%m-%dT%H:%M:%S" "$OPEN_AT_RAW" +%s 2>/dev/null \\',
                        '  || echo "")',
                        '',
                        'if [ -z "$OPEN_EPOCH" ]; then',
                        '  echo "::error::无法解析开仓时间：$OPEN_AT_RAW（时区 $CIB_TZ_LABEL）"',
                        '  exit 1',
                        'fi',
                        '',
                        'NOW_EPOCH=$(date -u +%s)',
                        '',
                        'if [ "$NOW_EPOCH" -lt "$OPEN_EPOCH" ]; then',
                        '  echo "::error::尚未开仓，拒绝提交（时区 $CIB_TZ_LABEL）"',
                        '  exit 1',
                        'fi',
                    ].join('\n'),
                };
            }

            return {
                kind: '步骤',
                keyword: '时间铡刀',
                name: `检查封仓时间（${序号}）`,
                env: { CIB_TZ: posixTZ, CIB_TZ_LABEL: 时区 },
                run: [
                    `DEADLINE_RAW="${纯时间}"`,
                    'TZ_TARGET="${CIB_TZ}"',
                    '',
                    'if [ "$TZ_TARGET" = "UTC" ]; then',
                    '  DEADLINE="${DEADLINE_RAW}Z"',
                    'else',
                    '  DEADLINE="${DEADLINE_RAW}"',
                    'fi',
                    '',
                    'DEADLINE_EPOCH=$(TZ="$TZ_TARGET" date -d "$DEADLINE" +%s 2>/dev/null \\',
                    '  || TZ="$TZ_TARGET" date -j -f "%Y-%m-%dT%H:%M:%S" "$DEADLINE_RAW" +%s 2>/dev/null \\',
                    '  || echo "")',
                    '',
                    'if [ -z "$DEADLINE_EPOCH" ]; then',
                    '  echo "::error::无法解析封仓时间：$DEADLINE_RAW（时区 $CIB_TZ_LABEL）"',
                    '  exit 1',
                    'fi',
                    '',
                    'NOW_EPOCH=$(date -u +%s)',
                    '',
                    'if [ "$NOW_EPOCH" -gt "$DEADLINE_EPOCH" ]; then',
                    '  echo "::error::封仓时间已过，拒绝提交（时区 $CIB_TZ_LABEL）"',
                    '  exit 1',
                    'fi',
                ].join('\n'),
            };
        }

        case 'cib/ownership-guard': {
            const 负责人表 = (门禁.参数['负责人表'] as string) ?? '';
            const 操作类型 = (门禁.参数['操作类型'] as string) ?? 'PR 合并';
            const 违规动作 = (门禁.参数['违规动作'] as string) ?? '拒绝合并';
            const 豁免者 = (门禁.参数['豁免者'] as string) ?? '';

            return {
                kind: '步骤',
                keyword: '越权控制',
                name: `越权检查（${操作类型}）（${序号}）`,
                env: {
                    CIB_OWNERS: 负责人表,
                    CIB_EXEMPT: 豁免者,
                    CIB_ACTION: 违规动作,
                },
                run: [
                    'ACTOR="${GITHUB_ACTOR}"',
                    '',
                    '# 豁免者直接放行',
                    'if [ -n "$CIB_EXEMPT" ]; then',
                    '  for e in $(echo "$CIB_EXEMPT" | tr "," " "); do',
                    '    if [ "$e" = "$ACTOR" ]; then',
                    '      echo "豁免者 $ACTOR，跳过越权检查"',
                    '      exit 0',
                    '    fi',
                    '  done',
                    'fi',
                    '',
                    '# 取改动文件',
                    'CHANGED=$(git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only HEAD~1)',
                    '',
                    '# 从负责人表找 ACTOR 允许的路径',
                    'ALLOWED=$(echo "$CIB_OWNERS" | awk -F: -v u="$ACTOR" \'$1==u {print $2}\')',
                    '',
                    'if [ -z "$ALLOWED" ]; then',
                    '  echo "::error::$ACTOR 不在负责人表中"',
                    '  exit 1',
                    'fi',
                    '',
                    '# 检查每个改动文件',
                    'FAIL=0',
                    'while IFS= read -r f; do',
                    '  [ -z "$f" ] && continue',
                    '  OK=0',
                    '  for pat in $(echo "$ALLOWED" | tr "," " "); do',
                    '    pat=$(echo "$pat" | xargs)',
                    '    case "$f" in',
                    '      $pat) OK=1; break ;;',
                    '    esac',
                    '    if [[ "$f" == $pat ]]; then OK=1; break; fi',
                    '  done',
                    '  if [ "$OK" = "0" ]; then',
                    '    echo "::error::$ACTOR 无权修改 $f"',
                    '    FAIL=1',
                    '  fi',
                    'done <<< "$CHANGED"',
                    '',
                    'if [ "$FAIL" = "1" ]; then',
                    '  if [ "$CIB_ACTION" = "仅告警" ]; then',
                    '    echo "::warning::越权但仅告警"',
                    '    exit 0',
                    '  fi',
                    '  exit 1',
                    'fi',
                    '',
                    'echo "越权检查通过"',
                ].join('\n'),
            };
        }

        case 'cib/branch-protect': {
            const 保护分支 = (门禁.参数['保护分支'] as string) ?? 'main,master';
            const 要求CI = (门禁.参数['要求CI通过'] as string) ?? '是';
            const 要求Review = (门禁.参数['要求review数'] as string) ?? '0';
            const 禁止 = (门禁.参数['禁止操作'] as string) ?? '';
            const 镜像 = (门禁.参数['镜像分支'] as string) ?? '';

            const 步骤列表: IR步骤[] = [];

            步骤列表.push({
                kind: '步骤',
                keyword: '保护分支检查',
                name: `保护分支检查（${序号}）`,
                env: {
                    CIB_PROTECTED: 保护分支,
                    CIB_REQUIRE_CI: 要求CI === '是' ? 'true' : 'false',
                    CIB_MIN_REVIEW: 要求Review,
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
                    '# 直接 push 检测',
                    'if [ "${GITHUB_EVENT_NAME}" = "push" ]; then',
                    '  if echo "$CIB_FORBID" | grep -q "直接 commit"; then',
                    '    if [ "${GITHUB_ACTOR}" != "github-actions[bot]" ] && [ "${GITHUB_ACTOR}" != "dependabot[bot]" ]; then',
                    '      echo "::warning::检测到 $GITHUB_ACTOR 直接 push 到保护分支 $TARGET"',
                    '    fi',
                    '  fi',
                    'fi',
                    '',
                    '# review 数检测',
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
                    'echo "::notice::提醒：请在仓库 Settings → Branches 配置分支保护规则"',
                    '',
                    'echo "保护分支检查通过"',
                ].join('\n'),
            });

            if (镜像.trim()) {
                步骤列表.push({
                    kind: '步骤',
                    keyword: '镜像到备份分支',
                    name: `镜像到备份分支（${序号}）`,
                    if: "github.ref == 'refs/heads/main'",
                    run: [
                        'git config user.name "cib-bot"',
                        'git config user.email "cib-bot@users.noreply.github.com"',
                        `git push origin HEAD:refs/heads/${镜像} --force`,
                    ].join('\n'),
                });
            }

            // 多步骤合并：第一个作为主体，其余用特殊标记
            // 这里简化：branch-protect 只用一个 step 表示（多步骤由积木自己展开）
            // 但为了保持简单，把所有步骤合成一个
            const 合并步骤: IR步骤 = {
                kind: '步骤',
                keyword: '异地容灾',
                name: `异地容灾（${序号}）`,
                run: 步骤列表.map((s) => s.run ?? '').join('\n\n'),
                env: 步骤列表[0].env,
            };
            return 合并步骤;
        }

        case 'cib/count-gate': {
            const 来源 = (门禁.参数['计数来源'] as string) ?? 'branch_total_commits';
            const 阈值 = (门禁.参数['阈值'] as string) ?? '50';
            const 比较 = (门禁.参数['比较'] as string) ?? 'gt';
            const 范围 = (门禁.参数['计数范围'] as string) ?? 'all_time';
            const 模式 = (门禁.参数['模式'] as string) ?? 'block';

            return {
                kind: '步骤',
                keyword: '次数铡刀',
                name: `次数检查（${序号}）`,
                env: {
                    CIB_SOURCE: 来源,
                    CIB_THRESHOLD: 阈值,
                    CIB_COMPARE: 比较,
                    CIB_RANGE: 范围,
                    CIB_MODE: 模式,
                },
                run: [
                    'BASE="${GITHUB_BEFORE:-$(git rev-parse HEAD~1 2>/dev/null || echo "")}"',
                    'HEAD="${GITHUB_SHA:-HEAD}"',
                    '',
                    'echo "计数来源: $CIB_SOURCE"',
                    'echo "计数范围: $CIB_RANGE"',
                    '',
                    'COUNT=0',
                    '',
                    'case "$CIB_SOURCE" in',
                    '  repo_total_commits)',
                    '    COUNT=$(git rev-list --count HEAD 2>/dev/null || echo 0)',
                    '    ;;',
                    '  branch_total_commits)',
                    '    COUNT=$(git rev-list --count HEAD 2>/dev/null || echo 0)',
                    '    ;;',
                    '  files_modified)',
                    '    case "$CIB_RANGE" in',
                    '      in_push)',
                    '        COUNT=$(git diff --name-only "$BASE" "$HEAD" 2>/dev/null | wc -l | xargs)',
                    '        ;;',
                    '      all_time)',
                    '        COUNT=$(git ls-files | wc -l | xargs)',
                    '        ;;',
                    '      since)',
                    '        COUNT=$(git diff --name-only "$BASE" "$HEAD" 2>/dev/null | wc -l | xargs)',
                    '        ;;',
                    '    esac',
                    '    ;;',
                    '  custom)',
                    '    COUNT=0',
                    '    ;;',
                    'esac',
                    '',
                    'echo "实际值: $COUNT"',
                    'echo "阈值: $CIB_THRESHOLD"',
                    'echo "比较: $CIB_COMPARE"',
                    '',
                    'FAIL=0',
                    'case "$CIB_COMPARE" in',
                    '  gt) [ "$COUNT" -gt "$CIB_THRESHOLD" ] && FAIL=1 ;;',
                    '  lt) [ "$COUNT" -lt "$CIB_THRESHOLD" ] && FAIL=1 ;;',
                    '  eq) [ "$COUNT" -eq "$CIB_THRESHOLD" ] && FAIL=1 ;;',
                    'esac',
                    '',
                    'if [ "$FAIL" = "1" ]; then',
                    '  if [ "$CIB_MODE" = "warn" ]; then',
                    '    echo "::warning::次数检查未通过（$COUNT $CIB_COMPARE $CIB_THRESHOLD），仅告警"',
                    '    exit 0',
                    '  fi',
                    '  echo "::error::次数检查未通过（$COUNT $CIB_COMPARE $CIB_THRESHOLD）"',
                    '  exit 1',
                    'fi',
                    '',
                    'echo "次数检查通过"',
                ].join('\n'),
            };
        }

        default:
            return {
                kind: '步骤',
                keyword: 门禁.keyword,
                name: `门禁（${序号}）：${门禁.keyword}`,
                run: `echo "未实现的门禁 ${门禁.blockId}" && exit 1`,
            };
    }
}

function 步骤转YAML(s: IR步骤): Record<string, unknown> {
    return {
        ...(s.if ? { if: s.if } : {}),
        ...(s.name ? { name: s.name } : {}),
        ...(s.uses ? { uses: s.uses } : {}),
        ...(s.env ? { env: s.env } : {}),
        ...(s['working-directory'] ? { 'working-directory': s['working-directory'] } : {}),
        ...(s.timeout ? { 'timeout-minutes': s.timeout } : {}),
        ...(s['continue-on-error'] !== undefined ? { 'continue-on-error': s['continue-on-error'] } : {}),
        ...(s.run ? { run: s.run } : {}),
        ...(s.with ? { with: s.with } : {}),
    };
}

function 作业转YAML(
    作业: IR作业,
    额外?: { needs?: string[]; if?: string },
): Record<string, unknown> {
    return {
        ...((额外?.needs ?? 作业.needs) ? { needs: 额外?.needs ?? 作业.needs } : {}),
        ...(额外?.if ? { if: 额外.if } : {}),
        ...(作业.environment ? { environment: 作业.environment } : {}),
        'runs-on': 作业.运行环境,
        steps: 作业.步骤.map(步骤转YAML),
    };
}

function 展开判定(
    判定: IR判定,
    jobs: Record<string, unknown>,
    序号ref: { 值: number },
) {
    const 来源 = 判定.判定来源;
    if (!来源) {
        console.warn('判定来源为空（链上没有业务作业），跳过该判定');
        return;
    }

    for (const 节点 of 判定.通过时) {
        if (节点.kind === '作业') {
            const id = 节点.id || `通过_${++序号ref.值}`;
            jobs[id] = 作业转YAML(节点, {
                needs: [来源],
                if: `\${{ needs.${来源}.result == 'success' }}`,
            });
        }
    }

    for (const 节点 of 判定.失败时) {
        if (节点.kind === '作业') {
            const id = 节点.id || `失败_${++序号ref.值}`;
            jobs[id] = 作业转YAML(节点, {
                needs: [来源],
                if: `\${{ needs.${来源}.result == 'failure' }}`,
            });
        }
    }
}

export function 生成GitHubYAML(工作流: IR工作流): string {
    const 触发器节点 = 工作流.节点.filter((n) => n.kind === '触发器') as IR触发器[];
    const 过滤节点 = 工作流.节点.filter((n) => n.kind === '过滤') as IR过滤[];
    const 门禁节点 = 工作流.节点.filter((n) => n.kind === '门禁') as IR门禁[];
    const 作业节点 = 工作流.节点.filter((n) => n.kind === '作业') as IR作业[];
    const 判定节点 = 工作流.节点.filter((n) => n.kind === '判定') as IR判定[];

    const 合并过滤: Record<string, unknown> = {};
    for (const f of 过滤节点) 合并过滤[f.键] = f.值;

    const on: Record<string, unknown> = {};

    for (const t of 触发器节点) {
        const 事件 = t.事件;
        if (无过滤事件.has(事件)) {
            on[事件] = {};
            continue;
        }
        const 事件过滤 = t.过滤 ?? {};
        on[事件] =
            Object.keys(事件过滤).length > 0
                ? { ...事件过滤, ...合并过滤 }
                : { ...合并过滤 };
    }

    for (const t of 工作流.触发器) {
        const 事件 = t.事件;
        if (无过滤事件.has(事件)) {
            on[事件] = {};
            continue;
        }
        on[事件] = { ...(t.过滤 ?? {}), ...合并过滤 };
    }

    if (Object.keys(on).length === 0) {
        on['push'] = { branches: ['main'], ...合并过滤 };
    }

    const jobs: Record<string, unknown> = {};

    if (门禁节点.length > 0) {
        const 步骤列表 = 门禁节点.map((门禁, i) => 生成门禁步骤(门禁, i + 1));
        jobs['gates'] = {
            'runs-on': 'ubuntu-latest',
            steps: [
                {
                    name: '检出代码',
                    uses: 'actions/checkout@v4',
                    with: { 'fetch-depth': 0 },
                },
                ...步骤列表.map(步骤转YAML),
            ],
        };
    }

    let 序号 = 0;
    for (const 节点 of 作业节点) {
        const id = 节点.id || `job_${++序号}`;
        jobs[id] = 作业转YAML(节点);
    }

    const 判定序号 = { 值: 0 };
    for (const 判定 of 判定节点) {
        展开判定(判定, jobs, 判定序号);
    }

    return stringify(
        {
            name: 工作流.名称,
            on,
            jobs,
        },
        { lineWidth: 0 },
    );
}