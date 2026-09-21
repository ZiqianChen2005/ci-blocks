import { describe, it, expect } from 'vitest';
import { 生成GitHubYAML, type IR工作流, type IR门禁 } from '../index.js';

// ========== 工具函数 ==========
function 造工作流(门禁列表: IR门禁[], 名称 = '测试工作流'): IR工作流 {
    return {
        名称,
        触发器: [
            { kind: '触发器', keyword: '推送', 事件: 'push', 过滤: { branches: ['main'] } },
        ],
        节点: 门禁列表,
    };
}

function 造时间铡刀(
    基准时间: string,
    模式: '开仓冻结' | '超时封仓',
    时区 = 'UTC+08:00',
): IR门禁 {
    return {
        kind: '门禁',
        keyword: '时间铡刀',
        blockId: 'cib/time-gate',
        拦截时机: '提交时',
        参数: { 基准时间, 时区, 模式 },
    };
}

function 造越权控制(
    负责人表: string,
    操作类型 = 'PR 合并',
    违规动作 = '拒绝合并',
    豁免者 = 'admin,ci-bot',
): IR门禁 {
    return {
        kind: '门禁',
        keyword: '越权控制',
        blockId: 'cib/ownership-guard',
        拦截时机: '合并前',
        参数: { 负责人表, 操作类型, 违规动作, 豁免者 },
    };
}

// ========== 时间铡刀 ==========
describe('时间铡刀', () => {
    it('单个超时封仓', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间铡刀('2026-09-20T20:00:00', '超时封仓')]),
        );
        expect(yaml).toContain('DEADLINE_RAW="2026-09-20T20:00:00"');
        expect(yaml).toContain('封仓时间已过');
        expect(yaml).toContain('gates:');
    });

    it('单个开仓冻结', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间铡刀('2026-09-20T09:00:00', '开仓冻结')]),
        );
        expect(yaml).toContain('OPEN_AT_RAW="2026-09-20T09:00:00"');
        expect(yaml).toContain('尚未开仓');
    });

    it('开仓 + 封仓双铡刀共存', () => {
        const yaml = 生成GitHubYAML(
            造工作流([
                造时间铡刀('2026-09-20T09:00:00', '开仓冻结'),
                造时间铡刀('2026-09-20T20:00:00', '超时封仓'),
            ]),
        );
        expect(yaml).toContain('OPEN_AT_RAW="2026-09-20T09:00:00"');
        expect(yaml).toContain('DEADLINE_RAW="2026-09-20T20:00:00"');
        expect(yaml).toContain('尚未开仓');
        expect(yaml).toContain('封仓时间已过');
        expect((yaml.match(/gates:/g) ?? []).length).toBe(1);
    });

    it('三个铡刀，全部在同一个 gates job', () => {
        const yaml = 生成GitHubYAML(
            造工作流([
                造时间铡刀('2026-09-20T09:00:00', '开仓冻结'),
                造时间铡刀('2026-09-20T15:00:00', '超时封仓'),
                造时间铡刀('2026-09-20T20:00:00', '超时封仓'),
            ]),
        );
        expect((yaml.match(/gates:/g) ?? []).length).toBe(1);
        expect(yaml).toContain('（1）');
        expect(yaml).toContain('（2）');
        expect(yaml).toContain('（3）');
    });

    it('时区：UTC+08:00 → POSIX UTC-8', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间铡刀('2026-09-20T20:00:00', '超时封仓', 'UTC+08:00')]),
        );
        expect(yaml).toContain('CIB_TZ: UTC-8');
        expect(yaml).toContain('CIB_TZ_LABEL: UTC+08:00');
    });

    it('时区：UTC-12:00 → POSIX UTC+12', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间铡刀('2026-09-20T20:00:00', '开仓冻结', 'UTC-12:00')]),
        );
        expect(yaml).toContain('CIB_TZ: UTC+12');
        expect(yaml).toContain('CIB_TZ_LABEL: UTC-12:00');
    });

    it('时区：半小时 UTC+05:30 → POSIX UTC-5:30', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间铡刀('2026-09-20T20:00:00', '超时封仓', 'UTC+05:30')]),
        );
        expect(yaml).toContain('CIB_TZ: UTC-5:30');
        expect(yaml).toContain('CIB_TZ_LABEL: UTC+05:30');
    });

    it('时区：UTC+00:00 → POSIX UTC', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间铡刀('2026-09-20T20:00:00', '超时封仓', 'UTC+00:00')]),
        );
        expect(yaml).toContain('CIB_TZ: UTC');
        expect(yaml).toContain('CIB_TZ_LABEL: UTC+00:00');
    });

    it('解析失败保护：有 [ -z ... ] 校验', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间铡刀('2026-09-20T20:00:00', '超时封仓')]),
        );
        expect(yaml).toContain('[ -z "$DEADLINE_EPOCH" ]');
        expect(yaml).toContain('无法解析封仓时间');
    });

    it('解析失败保护：开仓版也有校验', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间铡刀('2026-09-20T09:00:00', '开仓冻结')]),
        );
        expect(yaml).toContain('[ -z "$OPEN_EPOCH" ]');
        expect(yaml).toContain('无法解析开仓时间');
    });
});

// ========== 越权控制 ==========
describe('越权控制', () => {
    it('生成 CIB_OWNERS / CIB_EXEMPT / CIB_ACTION 三个 env', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造越权控制('alice: frontend/**\nbob: backend/**')]),
        );
        expect(yaml).toContain('CIB_OWNERS');
        expect(yaml).toContain('alice: frontend/**');
        expect(yaml).toContain('bob: backend/**');
        expect(yaml).toContain('CIB_EXEMPT');
        expect(yaml).toContain('admin,ci-bot');
        expect(yaml).toContain('CIB_ACTION');
        expect(yaml).toContain('拒绝合并');
    });

    it('生成关键 shell 逻辑', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造越权控制('alice: frontend/**')]),
        );
        expect(yaml).toContain('ACTOR="${GITHUB_ACTOR}"');
        expect(yaml).toContain('豁免者');
        expect(yaml).toContain('CHANGED=$(git diff --name-only');
        expect(yaml).toContain('ALLOWED=$(echo "$CIB_OWNERS"');
        expect(yaml).toContain('无权修改');
        expect(yaml).toContain('越权检查通过');
    });

    it('仅告警模式：CIB_ACTION = 仅告警', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造越权控制('alice: frontend/**', 'PR 合并', '仅告警')]),
        );
        expect(yaml).toContain('CIB_ACTION: 仅告警');
        expect(yaml).toContain('::warning::');
    });

    it('步骤名包含操作类型', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造越权控制('alice: frontend/**', 'force push')]),
        );
        expect(yaml).toContain('越权检查（force push）');
    });
});

// ========== 多积木混用 ==========
describe('多积木混用', () => {
    it('铡刀 + 越权 共存于同一 gates job', () => {
        const yaml = 生成GitHubYAML(
            造工作流([
                造时间铡刀('2026-09-20T20:00:00', '超时封仓'),
                造越权控制('alice: frontend/**'),
            ]),
        );
        expect((yaml.match(/gates:/g) ?? []).length).toBe(1);
        expect(yaml).toContain('DEADLINE_RAW=');
        expect(yaml).toContain('CIB_OWNERS');
        const 铡刀位置 = yaml.indexOf('检查封仓时间');
        const 越权位置 = yaml.indexOf('越权检查');
        expect(铡刀位置).toBeGreaterThan(0);
        expect(越权位置).toBeGreaterThan(铡刀位置);
    });

    it('两个越权控制，都进同一个 gates job', () => {
        const yaml = 生成GitHubYAML(
            造工作流([
                造越权控制('alice: frontend/**', 'PR 合并'),
                造越权控制('bob: backend/**', 'force push'),
            ]),
        );
        expect((yaml.match(/gates:/g) ?? []).length).toBe(1);
        expect(yaml).toContain('alice: frontend/**');
        expect(yaml).toContain('bob: backend/**');
    });
});

// ========== 触发器 / 过滤 ==========
describe('触发器与过滤', () => {
    it('行为条件 + 分支条件 生成 on.push.branches', () => {
        const 工作流: IR工作流 = {
            名称: '触发测试',
            触发器: [],
            节点: [
                {
                    kind: '触发器',
                    keyword: '行为条件',
                    事件: 'push',
                    过滤: { branches: ['main', 'dev'] },
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        expect(yaml).toContain('push:');
        expect(yaml).toContain('main');
        expect(yaml).toContain('dev');
    });

    it('无触发器时给默认 push main', () => {
        const yaml = 生成GitHubYAML(造工作流([]));
        expect(yaml).toContain('push:');
        expect(yaml).toContain('main');
    });

    it('workflow_dispatch 不带 branches', () => {
        const 工作流: IR工作流 = {
            名称: '触发测试',
            触发器: [],
            节点: [
                {
                    kind: '触发器',
                    keyword: '行为条件',
                    事件: 'workflow_dispatch',
                    过滤: { branches: ['test'] },
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        expect(yaml).toContain('workflow_dispatch: {}');
        expect(yaml).not.toContain('workflow_dispatch:\n    branches');
    });

    it('schedule 不带 branches', () => {
        const 工作流: IR工作流 = {
            名称: '触发测试',
            触发器: [],
            节点: [
                {
                    kind: '触发器',
                    keyword: '行为条件',
                    事件: 'schedule',
                    过滤: { branches: ['main'] },
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        expect(yaml).toContain('schedule: {}');
    });
});

// ========== 判定 ==========
describe('工作流判定条件', () => {
    it('通过时 / 失败时生成 needs + if', () => {
        const 工作流: IR工作流 = {
            名称: '判定测试',
            触发器: [],
            节点: [
                {
                    kind: '判定',
                    keyword: '工作流判定条件',
                    blockId: 'cib/if-workflow',
                    判定来源: 'build',
                    通过时: [
                        {
                            kind: '作业',
                            id: 'notify_ok',
                            keyword: '通知成功',
                            运行环境: 'ubuntu-latest',
                            步骤: [
                                {
                                    kind: '步骤',
                                    keyword: '发送',
                                    name: '发送成功通知',
                                    run: 'echo ok',
                                },
                            ],
                        },
                    ],
                    失败时: [
                        {
                            kind: '作业',
                            id: 'notify_fail',
                            keyword: '通知失败',
                            运行环境: 'ubuntu-latest',
                            步骤: [
                                {
                                    kind: '步骤',
                                    keyword: '发送',
                                    name: '发送失败通知',
                                    run: 'echo fail',
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        expect(yaml).toContain('needs:');
        expect(yaml).toContain('build');
        expect(yaml).toContain("needs.build.result == 'success'");
        expect(yaml).toContain("needs.build.result == 'failure'");
    });

    it('判定来源为空时跳过', () => {
        const 工作流: IR工作流 = {
            名称: '判定测试',
            触发器: [],
            节点: [
                {
                    kind: '判定',
                    keyword: '工作流判定条件',
                    blockId: 'cib/if-workflow',
                    判定来源: '',
                    通过时: [],
                    失败时: [],
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        expect(yaml).not.toContain('needs.');
    });
});

// ========== 边界 ==========
describe('边界情况', () => {
    it('空门禁列表：不生成 gates job', () => {
        const yaml = 生成GitHubYAML(造工作流([]));
        expect(yaml).not.toContain('gates:');
    });

    it('未知 blockId：生成占位 step，不崩', () => {
        const 未知: IR门禁 = {
            kind: '门禁',
            keyword: '未知门禁',
            blockId: 'cib/unknown-block.ts',
            拦截时机: '提交时',
            参数: {},
        };
        const yaml = 生成GitHubYAML(造工作流([未知]));
        expect(yaml).toContain('未实现的门禁');
    });

    it('YAML 是合法结构：有 name / on / jobs', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间铡刀('2026-09-20T20:00:00', '超时封仓')]),
        );
        expect(yaml).toMatch(/^name:/m);
        expect(yaml).toMatch(/^on:/m);
        expect(yaml).toMatch(/^jobs:/m);
    });

    it('中文不乱码', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间铡刀('2026-09-20T20:00:00', '超时封仓')]),
        );
        expect(yaml).toContain('封仓时间已过');
        expect(yaml).not.toContain('灏佷粨');
    });
});

// ========== 成品校验 ==========
describe('成品校验', () => {
    it('基础测试命令 + 报告上传', () => {
        const 工作流: IR工作流 = {
            名称: '测试',
            触发器: [],
            节点: [
                {
                    kind: '作业',
                    id: 'test',
                    keyword: '成品校验',
                    运行环境: 'ubuntu-latest',
                    步骤: [
                        {
                            kind: '步骤',
                            keyword: '检出代码',
                            name: '检出代码',
                            uses: 'actions/checkout@v4',
                        },
                        {
                            kind: '步骤',
                            keyword: '运行测试',
                            name: '运行测试',
                            'working-directory': '.',
                            timeout: 10,
                            run: 'npm test',
                        },
                        {
                            kind: '步骤',
                            keyword: '上传测试报告',
                            name: '上传测试报告',
                            if: 'always()',
                            uses: 'actions/upload-artifact@v4',
                            with: { name: 'test-report', path: 'build/reports/tests/' },
                        },
                    ],
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        expect(yaml).toContain('timeout-minutes: 10');
        expect(yaml).toContain('npm test');
        expect(yaml).toContain('actions/upload-artifact@v4');
        expect(yaml).toContain('always()');
    });

    it('timeout-minutes 在 YAML 里正确序列化', () => {
        const 工作流: IR工作流 = {
            名称: '测试',
            触发器: [],
            节点: [
                {
                    kind: '作业',
                    id: 'test',
                    keyword: '成品校验',
                    运行环境: 'ubuntu-latest',
                    步骤: [
                        {
                            kind: '步骤',
                            keyword: '运行测试',
                            name: '运行测试',
                            timeout: 30,
                            run: 'pytest',
                        },
                    ],
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        expect(yaml).toContain('timeout-minutes: 30');
    });
});

// ========== 次数铡刀 ==========
describe('次数铡刀', () => {
    it('基本计数检查', () => {
        const yaml = 生成GitHubYAML(
            造工作流([
                {
                    kind: '门禁',
                    keyword: '次数铡刀',
                    blockId: 'cib/count-gate',
                    拦截时机: '提交时',
                    参数: {
                        计数来源: 'branch_total_commits',
                        阈值: '50',
                        比较: 'gt',
                        计数范围: 'all_time',
                        模式: 'block',
                    },
                },
            ]),
        );
        expect(yaml).toContain('CIB_SOURCE: branch_total_commits');
        expect(yaml).toContain('CIB_THRESHOLD: "50"');
        expect(yaml).toContain('CIB_COMPARE: gt');
        expect(yaml).toContain('CIB_RANGE: all_time');
        expect(yaml).toContain('CIB_MODE: block');
        expect(yaml).toContain('次数检查未通过');
        expect(yaml).toContain('次数检查通过');
    });

    it('仅告警模式', () => {
        const yaml = 生成GitHubYAML(
            造工作流([
                {
                    kind: '门禁',
                    keyword: '次数铡刀',
                    blockId: 'cib/count-gate',
                    拦截时机: '提交时',
                    参数: {
                        计数来源: 'files_modified',
                        阈值: '100',
                        比较: 'gt',
                        计数范围: 'in_push',
                        模式: 'warn',
                    },
                },
            ]),
        );
        expect(yaml).toContain('CIB_MODE: warn');
        expect(yaml).toContain('::warning::');
    });

    it('gates job 自动加检出代码', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间铡刀('2026-09-20T20:00:00', '超时封仓')]),
        );
        expect(yaml).toContain('检出代码');
        expect(yaml).toContain('actions/checkout@v4');
        expect(yaml).toContain('fetch-depth: 0');
    });

    it('未达模式（lt）', () => {
        const yaml = 生成GitHubYAML(
            造工作流([
                {
                    kind: '门禁',
                    keyword: '次数铡刀',
                    blockId: 'cib/count-gate',
                    拦截时机: '提交时',
                    参数: {
                        计数来源: 'branch_total_commits',
                        阈值: '3',
                        比较: 'lt',
                        计数范围: 'all_time',
                        模式: 'block',
                    },
                },
            ]),
        );
        expect(yaml).toContain('CIB_COMPARE: lt');
    });
});

// ========== 追根溯源 ==========
describe('追根溯源', () => {
    it('生成校验命令 + 证据上传', () => {
        const 工作流: IR工作流 = {
            名称: '溯源测试',
            触发器: [],
            节点: [
                {
                    kind: '作业',
                    id: 'provenance',
                    keyword: '追根溯源',
                    运行环境: 'ubuntu-latest',
                    步骤: [
                        {
                            kind: '步骤',
                            keyword: '检出代码',
                            name: '检出代码',
                            uses: 'actions/checkout@v4',
                            with: { 'fetch-depth': 0 },
                        },
                        {
                            kind: '步骤',
                            keyword: '追根溯源校验',
                            name: '追根溯源校验',
                            'working-directory': '.',
                            timeout: 30,
                            env: { CIB_FAIL_ACTION: '拒绝' },
                            run: [
                                'set +e',
                                '(python scripts/verify_data.py)',
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
                        },
                        {
                            kind: '步骤',
                            keyword: '上传证据',
                            name: '上传证据',
                            if: 'always()',
                            uses: 'actions/upload-artifact@v4',
                            with: {
                                name: 'provenance-evidence',
                                path: 'evidence/',
                                'retention-days': 30,
                            },
                        },
                    ],
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        expect(yaml).toContain('追根溯源校验');
        expect(yaml).toContain('python scripts/verify_data.py');
        expect(yaml).toContain('timeout-minutes: 30');
        expect(yaml).toContain('CIB_FAIL_ACTION: 拒绝');
        expect(yaml).toContain('provenance-evidence');
        expect(yaml).toContain('always()');
    });

    it('仅告警模式生成 warning', () => {
        const 工作流: IR工作流 = {
            名称: '溯源测试',
            触发器: [],
            节点: [
                {
                    kind: '作业',
                    id: 'provenance',
                    keyword: '追根溯源',
                    运行环境: 'ubuntu-latest',
                    步骤: [
                        {
                            kind: '步骤',
                            keyword: '追根溯源校验',
                            name: '追根溯源校验',
                            env: { CIB_FAIL_ACTION: '仅告警' },
                            run: '...',
                        },
                    ],
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        expect(yaml).toContain('CIB_FAIL_ACTION: 仅告警');
    });
});

// ========== 契约对应 ==========
describe('契约对应', () => {
    it('生成校验命令 + 报告上传', () => {
        const 工作流: IR工作流 = {
            名称: '契约测试',
            触发器: [],
            节点: [
                {
                    kind: '作业',
                    id: 'contract',
                    keyword: '契约对应',
                    运行环境: 'ubuntu-latest',
                    步骤: [
                        {
                            kind: '步骤',
                            keyword: '检出代码',
                            name: '检出代码',
                            uses: 'actions/checkout@v4',
                            with: { 'fetch-depth': 0 },
                        },
                        {
                            kind: '步骤',
                            keyword: '契约校验',
                            name: '契约校验',
                            'working-directory': '.',
                            timeout: 10,
                            env: {
                                CIB_CONTRACT_TYPE: 'OpenAPI',
                                CIB_CONTRACT_FILE: 'api/openapi.yaml',
                                CIB_FAIL_ACTION: '拒绝',
                            },
                            run: [
                                'set +e',
                                '(npx openapi-diff api/openapi.yaml api/openapi.yaml)',
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
                        },
                        {
                            kind: '步骤',
                            keyword: '上传差异报告',
                            name: '上传差异报告',
                            if: 'always()',
                            uses: 'actions/upload-artifact@v4',
                            with: {
                                name: 'contract-diff',
                                path: 'contract-diff/',
                                'retention-days': 30,
                                'if-no-files-found': 'ignore',
                            },
                        },
                    ],
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        expect(yaml).toContain('契约校验');
        expect(yaml).toContain('api/openapi.yaml');
        expect(yaml).toContain('CIB_CONTRACT_TYPE: OpenAPI');
        expect(yaml).toContain('contract-diff');
        expect(yaml).toContain('if-no-files-found: ignore');
    });

    it('仅告警模式', () => {
        const 工作流: IR工作流 = {
            名称: '契约测试',
            触发器: [],
            节点: [
                {
                    kind: '作业',
                    id: 'contract',
                    keyword: '契约对应',
                    运行环境: 'ubuntu-latest',
                    步骤: [
                        {
                            kind: '步骤',
                            keyword: '契约校验',
                            name: '契约校验',
                            env: {
                                CIB_CONTRACT_TYPE: 'GraphQL',
                                CIB_FAIL_ACTION: '仅告警',
                            },
                            run: '...',
                        },
                    ],
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        expect(yaml).toContain('CIB_CONTRACT_TYPE: GraphQL');
        expect(yaml).toContain('CIB_FAIL_ACTION: 仅告警');
    });
});