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
    IR条件,
} from '../ir/types';

const 无过滤事件 = new Set(['workflow_dispatch', 'schedule']);

function 转PosixTZ(tz: string): string {
    if (tz === 'UTC+00:00') return 'UTC';
    const m = tz.match(/^UTC([+-])(\d{2}):(\d{2})$/);
    if (!m) return 'UTC';
    const 符号 = m[1] === '+' ? '-' : '+';
    const 时 = parseInt(m[2], 10);
    const 分 = parseInt(m[3], 10);
    return 分 === 0 ? `UTC${符号}${时}` : `UTC${符号}${时}:${分}`;
}

function 生成门禁步骤(门禁: IR门禁, 序号: number): IR步骤 {
    switch (门禁.blockId) {
        case 'cib/time-gate':
            return {
                kind: '步骤',
                keyword: 门禁.keyword,
                name: `门禁（${序号}）：${门禁.keyword}`,
                run: `echo "时间铡刀已改为条件积木"`,
            };

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
                    'if [ -n "$CIB_EXEMPT" ]; then',
                    '  for e in $(echo "$CIB_EXEMPT" | tr "," " "); do',
                    '    if [ "$e" = "$ACTOR" ]; then',
                    '      echo "豁免者 $ACTOR，跳过越权检查"',
                    '      exit 0',
                    '    fi',
                    '  done',
                    'fi',
                    '',
                    'CHANGED=$(git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only HEAD~1)',
                    '',
                    'ALLOWED=$(echo "$CIB_OWNERS" | awk -F: -v u="$ACTOR" \'$1==u {print $2}\')',
                    '',
                    'if [ -z "$ALLOWED" ]; then',
                    '  echo "::error::$ACTOR 不在负责人表中"',
                    '  exit 1',
                    'fi',
                    '',
                    '匹配() {',
                    '  local 文件="$1"',
                    '  local 模式="$2"',
                    '  local 正则=$(echo "$模式" | sed \'s/\\./\\\\./g; s/\\*\\*/.*/g; s/\\*/[^\\/]*/g\')',
                    '  正则="^${正则}$"',
                    '  echo "$文件" | grep -qE "$正则"',
                    '}',
                    '',
                    'FAIL=0',
                    'while IFS= read -r f; do',
                    '  [ -z "$f" ] && continue',
                    '  OK=0',
                    '  while IFS= read -r pat; do',
                    '    pat=$(echo "$pat" | xargs)',
                    '    [ -z "$pat" ] && continue',
                    '    for p in $(echo "$pat" | tr "," " "); do',
                    '      p=$(echo "$p" | xargs)',
                    '      [ -z "$p" ] && continue',
                    '      if 匹配 "$f" "$p"; then',
                    '        OK=1',
                    '        break 2',
                    '      fi',
                    '    done',
                    '  done <<< "$ALLOWED"',
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

        case 'cib/branch-protect': {
            const 保护分支 = (门禁.参数['保护分支'] as string) ?? 'main,master';
            const 要求CI = (门禁.参数['要求CI通过'] as string) ?? '是';
            const 要求Review = (门禁.参数['要求review数'] as string) ?? '0';
            const 禁止 = (门禁.参数['禁止操作'] as string) ?? '';

            return {
                kind: '步骤',
                keyword: '异地容灾',
                name: `异地容灾（${序号}）`,
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
                    'if [ "${GITHUB_EVENT_NAME}" = "push" ]; then',
                    '  if echo "$CIB_FORBID" | grep -q "直接 commit"; then',
                    '    if [ "${GITHUB_ACTOR}" != "github-actions[bot]" ] && [ "${GITHUB_ACTOR}" != "dependabot[bot]" ]; then',
                    '      echo "::warning::检测到 $GITHUB_ACTOR 直接 push 到保护分支 $TARGET"',
                    '    fi',
                    '  fi',
                    'fi',
                    '',
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

/** 递归生成条件检查步骤（支持嵌套） */
function 生成条件检查步骤(
    条件: IR条件,
    序号: number,
    父条件ID: string | null,
): { 步骤列表: IR步骤[]; 输出名: string | null; 检查ID: string | null } {
    const 父if = 父条件ID
        ? `steps.${父条件ID}.outputs.CIB_MATCH == 'true'`
        : undefined;

    if (条件.条件类型 === '时间') {
        const 比较 = (条件.参数['比较'] as string) ?? '之后';
        const 基准 = 条件.参数['基准时间'] as string;
        const 时区 = (条件.参数['时区'] as string) ?? 'UTC+08:00';

        const 纯时间 = 基准.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
        const posixTZ = 转PosixTZ(时区);
        const 运算符 = 比较 === '之后' ? '-gt' : '-lt';
        const 描述 =
            比较 === '之后' ? '当前时间在基准时间之后' : '当前时间在基准时间之前';

        const 检查ID = `cib_time_${序号}`;

        const 检查步骤: IR步骤 = {
            kind: '步骤',
            keyword: '时间检查',
            name: `时间检查（${序号}）`,
            id: 检查ID,
            ...(父if ? { if: 父if } : {}),
            env: { CIB_TZ: posixTZ, CIB_TZ_LABEL: 时区 },
            run: [
                `BASE_RAW="${纯时间}"`,
                'TZ_TARGET="${CIB_TZ}"',
                '',
                'if [ "$TZ_TARGET" = "UTC" ]; then',
                '  BASE="${BASE_RAW}Z"',
                'else',
                '  BASE="${BASE_RAW}"',
                'fi',
                '',
                'BASE_EPOCH=$(TZ="$TZ_TARGET" date -d "$BASE" +%s 2>/dev/null \\',
                '  || TZ="$TZ_TARGET" date -j -f "%Y-%m-%dT%H:%M:%S" "$BASE_RAW" +%s 2>/dev/null \\',
                '  || echo "")',
                '',
                'if [ -z "$BASE_EPOCH" ]; then',
                '  echo "::error::无法解析基准时间：$BASE_RAW（时区 $CIB_TZ_LABEL）"',
                '  exit 1',
                'fi',
                '',
                'NOW_EPOCH=$(date -u +%s)',
                '',
                `if [ "$NOW_EPOCH" ${运算符} "$BASE_EPOCH" ]; then`,
                `  echo "${描述}"`,
                `  echo "CIB_MATCH=true" >> $GITHUB_OUTPUT`,
                'else',
                `  echo "${描述} 不成立，跳过"`,
                `  echo "CIB_MATCH=false" >> $GITHUB_OUTPUT`,
                'fi',
            ].join('\n'),
        };

        return { 步骤列表: [检查步骤], 输出名: `CIB_MATCH_${序号}`, 检查ID };
    }

    if (条件.条件类型 === '次数') {
        const 来源 = (条件.参数['计数来源'] as string) ?? 'branch_total_commits';
        const 阈值 = (条件.参数['阈值'] as string) ?? '50';
        const 比较 = (条件.参数['比较'] as string) ?? 'gt';
        const 范围 = (条件.参数['计数范围'] as string) ?? 'all_time';
        const 模式 = (条件.参数['模式'] as string) ?? 'block';

        const 检查ID = `cib_count_${序号}`;

        const 检查步骤: IR步骤 = {
            kind: '步骤',
            keyword: '次数检查',
            name: `次数检查（${序号}）`,
            id: 检查ID,
            ...(父if ? { if: 父if } : {}),
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
                'MATCH=0',
                'case "$CIB_COMPARE" in',
                '  gt) [ "$COUNT" -gt "$CIB_THRESHOLD" ] && MATCH=1 ;;',
                '  lt) [ "$COUNT" -lt "$CIB_THRESHOLD" ] && MATCH=1 ;;',
                '  eq) [ "$COUNT" -eq "$CIB_THRESHOLD" ] && MATCH=1 ;;',
                'esac',
                '',
                'if [ "$MATCH" = "1" ]; then',
                '  echo "次数条件成立"',
                '  echo "CIB_MATCH=true" >> $GITHUB_OUTPUT',
                'else',
                '  echo "次数条件不成立，跳过"',
                '  echo "CIB_MATCH=false" >> $GITHUB_OUTPUT',
                'fi',
            ].join('\n'),
        };

        return { 步骤列表: [检查步骤], 输出名: `CIB_MATCH_${序号}`, 检查ID };
    }

    return {
        步骤列表: [
            {
                kind: '步骤',
                keyword: '未知条件',
                name: `未知条件（${序号}）`,
                run: 'echo "未知条件"',
            },
        ],
        输出名: null,
        检查ID: null,
    };
}

/** 收集条件里的所有 job（含嵌套） */
function 收集条件作业(
    条件: IR条件,
    条件序号: number,
    父条件链: { 序号: number; 检查ID: string }[],
    jobs: Record<string, unknown>,
    全局序号: { 值: number },
): void {
    // 当前条件的引用表达式
    const 条件引用 = [
        ...父条件链.map((p) => `needs.gates.outputs.CIB_MATCH_${p.序号} == 'true'`),
    ];

    for (const n of 条件.条件成立时执行) {
        if (n.kind === '作业') {
            const id = n.id || `cond_${条件序号}_${++全局序号.值}`;
            const if表达式 =
                条件引用.length > 0
                    ? `\${{ ${条件引用.join(' && ')} }}`
                    : undefined;
            jobs[id] = {
                needs: ['gates'],
                ...(if表达式 ? { if: if表达式 } : {}),
                ...(n.environment ? { environment: n.environment } : {}),
                'runs-on': n.运行环境,
                steps: n.步骤.map(步骤转YAML),
            };
        } else if (n.kind === '门禁') {
            // 门禁嵌条件：作为 gates job 的 step，加 if
            // 这个在 收集条件门禁 里处理
        } else if (n.kind === '条件') {
            // 嵌套条件：递归
            const 内序号 = ++全局序号.值;
            const { 检查ID } = 生成条件检查步骤(n, 内序号, null);
            const 内父链 = [
                ...父条件链,
                { 序号: 条件序号, 检查ID: 父条件链[父条件链.length - 1]?.检查ID ?? '' },
            ];
            收集条件作业(n, 内序号, 内父链, jobs, 全局序号);
        }
    }
}

/** 收集条件里的门禁 step（含嵌套） */
function 收集条件门禁步骤(
    条件: IR条件,
    条件序号: number,
    父条件链: number[],
    结果: IR步骤[],
): void {
    const 父if = 父条件链
        .map((s) => `steps.cib_time_${s}.outputs.CIB_MATCH == 'true'`)
        .join(' && ');

    for (const n of 条件.条件成立时执行) {
        if (n.kind === '门禁') {
            const 步骤 = 生成门禁步骤(n, 条件序号);
            结果.push({
                ...步骤,
                if: 父if ? `${父if} && steps.cib_time_${条件序号}.outputs.CIB_MATCH == 'true'` : `steps.cib_time_${条件序号}.outputs.CIB_MATCH == 'true'`,
            });
        } else if (n.kind === '条件') {
            // 嵌套条件里的门禁
            const 内序号 = 条件序号 + 1;
            收集条件门禁步骤(n, 内序号, [...父条件链, 条件序号], 结果);
        }
    }
}

/** 递归收集所有条件（含嵌套），返回扁平列表 */
function 扁平化条件(
    条件: IR条件,
    父链: number[],
    计数器: { 值: number },
): { 条件: IR条件; 序号: number; 父链: number[] }[] {
    const 结果: { 条件: IR条件; 序号: number; 父链: number[] }[] = [];
    const 当前序号 = ++计数器.值;
    结果.push({ 条件, 序号: 当前序号, 父链: [...父链] });

    for (const n of 条件.条件成立时执行) {
        if (n.kind === '条件') {
            结果.push(...扁平化条件(n, [...父链, 当前序号], 计数器));
        }
    }
    return 结果;
}

function 步骤转YAML(s: IR步骤): Record<string, unknown> {
    return {
        ...(s.if ? { if: s.if } : {}),
        ...(s.name ? { name: s.name } : {}),
        ...(s.id ? { id: s.id } : {}),
        ...(s.uses ? { uses: s.uses } : {}),
        ...(s['working-directory'] ? { 'working-directory': s['working-directory'] } : {}),
        ...(s.timeout ? { 'timeout-minutes': s.timeout } : {}),
        ...(s.env ? { env: s.env } : {}),
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
    const 条件节点 = 工作流.节点.filter((n) => n.kind === '条件') as IR条件[];
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

    // ========== 扁平化所有条件 ==========
    const 条件计数器 = { 值: 0 };
    const 所有条件: { 条件: IR条件; 序号: number; 父链: number[] }[] = [];
    for (const 条件 of 条件节点) {
        所有条件.push(...扁平化条件(条件, [], 条件计数器));
    }

    // ========== 生成 gates job ==========
    if (门禁节点.length > 0 || 所有条件.length > 0) {
        const 条件检查步骤: IR步骤[] = [];
        const gatesOutputs: Record<string, string> = {};

        for (const { 条件, 序号, 父链 } of 所有条件) {
            const 父条件ID =
                父链.length > 0 ? `cib_time_${父链[父链.length - 1]}` : null;
            const { 步骤列表, 输出名, 检查ID } = 生成条件检查步骤(条件, 序号, 父条件ID);
            条件检查步骤.push(...步骤列表);
            if (输出名 && 检查ID) {
                gatesOutputs[输出名] = `\${{ steps.${检查ID}.outputs.CIB_MATCH }}`;
            }
        }

        const 门禁步骤 = 门禁节点.map((门禁, i) => 生成门禁步骤(门禁, i + 1));

        // 收集条件里的门禁 step
        const 条件门禁步骤: IR步骤[] = [];
        for (const { 条件, 序号 } of 所有条件) {
            收集条件门禁步骤(条件, 序号, [], 条件门禁步骤);
        }

        jobs['gates'] = {
            'runs-on': 'ubuntu-latest',
            ...(Object.keys(gatesOutputs).length > 0 ? { outputs: gatesOutputs } : {}),
            steps: [
                { name: '检出代码', uses: 'actions/checkout@v4', with: { 'fetch-depth': 0 } },
                ...条件检查步骤.map(步骤转YAML),
                ...门禁步骤.map(步骤转YAML),
                ...条件门禁步骤.map(步骤转YAML),
            ],
        };
    }

    // ========== 条件里的作业 ==========
    const 作业计数器 = { 值: 0 };
    for (const { 条件, 序号, 父链 } of 所有条件) {
        const 父链完整 = [...父链, 序号];
        // 当前条件的引用
        const 条件引用 = 父链完整.map(
            (s) => `needs.gates.outputs.CIB_MATCH_${s} == 'true'`,
        );

        for (const [j, n] of 条件.条件成立时执行.entries()) {
            if (n.kind === '作业') {
                const id = n.id || `cond_${序号}_${j + 1}`;
                jobs[id] = {
                    needs: ['gates'],
                    if: `\${{ ${条件引用.join(' && ')} }}`,
                    ...(n.environment ? { environment: n.environment } : {}),
                    'runs-on': n.运行环境,
                    steps: n.步骤.map(步骤转YAML),
                };
            }
        }
    }

    // ========== 普通作业 ==========
    let 序号 = 0;
    for (const 节点 of 作业节点) {
        const id = 节点.id || `job_${++序号}`;
        jobs[id] = 作业转YAML(节点);
    }

    // ========== 判定 ==========
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