import { describe, it, expect } from 'vitest';
import { 生成GitHubYAML, type IR工作流, type IR门禁, type IR条件 } from '../index.js';

// ========== 工具函数 ==========
function 造工作流(节点: any[], 名称 = '测试工作流'): IR工作流 {
    return {
        名称,
        触发器: [
            { kind: '触发器', keyword: '推送', 事件: 'push', 过滤: { branches: ['main'] } },
        ],
        节点,
    };
}

function 造时间条件(
    比较: '之前' | '之后',
    基准时间: string,
    时区 = 'UTC+08:00',
    执行: any[] = [],
): IR条件 {
    return {
        kind: '条件',
        keyword: '时间铡刀',
        blockId: 'cib/time-gate',
        条件类型: '时间',
        参数: { 比较, 基准时间, 时区 },
        条件成立时执行: 执行,
    };
}

function 造作业(id: string, 名称 = '作业'): any {
    return {
        kind: '作业',
        id,
        keyword: 名称,
        运行环境: 'ubuntu-latest',
        步骤: [
            { kind: '步骤', keyword: '步骤1', name: '步骤1', run: `echo ${id}` },
        ],
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

function 造次数铡刀(
    计数来源 = 'branch_total_commits',
    阈值 = '50',
    比较 = 'gt',
    模式 = 'block',
): IR门禁 {
    return {
        kind: '门禁',
        keyword: '次数铡刀',
        blockId: 'cib/count-gate',
        拦截时机: '提交时',
        参数: {
            计数来源,
            阈值,
            比较,
            计数范围: 'all_time',
            模式,
        },
    };
}

// ========== 时间铡刀（新版：条件式） ==========
describe('时间铡刀（条件式）', () => {
    it('生成时间检查 step + gates outputs', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间条件('之后', '2026-09-20T20:00:00')]),
        );
        expect(yaml).toContain('时间检查（1）');
        expect(yaml).toContain('id: cib_time_1');
        expect(yaml).toContain('CIB_MATCH_1: ${{ steps.cib_time_1.outputs.CIB_MATCH }}');
        expect(yaml).toContain('CIB_TZ: UTC-8');
        expect(yaml).toContain('CIB_TZ_LABEL: UTC+08:00');
        expect(yaml).toContain('BASE_RAW="2026-09-20T20:00:00"');
        expect(yaml).toContain('当前时间在基准时间之后');
    });

    it('比较「之前」用 -lt', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间条件('之前', '2025-01-01T00:00:00')]),
        );
        expect(yaml).toContain('-lt');
        expect(yaml).toContain('当前时间在基准时间之前');
    });

    it('比较「之后」用 -gt', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间条件('之后', '2025-01-01T00:00:00')]),
        );
        expect(yaml).toContain('-gt');
        expect(yaml).toContain('当前时间在基准时间之后');
    });

    it('时区 UTC+00:00 → POSIX UTC', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间条件('之后', '2026-09-20T20:00:00', 'UTC+00:00')]),
        );
        expect(yaml).toContain('CIB_TZ: UTC');
    });

    it('时区 UTC-12:00 → POSIX UTC+12', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间条件('之后', '2026-09-20T20:00:00', 'UTC-12:00')]),
        );
        expect(yaml).toContain('CIB_TZ: UTC+12');
        expect(yaml).toContain('CIB_TZ_LABEL: UTC-12:00');
    });

    it('时区 UTC+05:30 → POSIX UTC-5:30', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间条件('之后', '2026-09-20T20:00:00', 'UTC+05:30')]),
        );
        expect(yaml).toContain('CIB_TZ: UTC-5:30');
    });

    it('解析失败保护', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造时间条件('之后', '2026-09-20T20:00:00')]),
        );
        expect(yaml).toContain('[ -z "$BASE_EPOCH" ]');
        expect(yaml).toContain('无法解析基准时间');
    });
});

// ========== 条件内嵌作业 ==========
describe('条件内嵌作业', () => {
    it('作业嵌在时间条件里 → 生成独立 job + needs + if', () => {
        const 条件 = 造时间条件('之后', '2026-09-20T20:00:00', 'UTC+08:00', [
            造作业('contract', '契约对应'),
        ]);
        const yaml = 生成GitHubYAML(造工作流([条件]));

        // gates job 里有时间检查
        expect(yaml).toContain('时间检查（1）');
        expect(yaml).toContain('id: cib_time_1');

        // contract job 有 needs + if
        expect(yaml).toContain('contract:');
        expect(yaml).toContain('needs:');
        expect(yaml).toContain('gates');
        expect(yaml).toContain("needs.gates.outputs.CIB_MATCH_1 == 'true'");
    });

    it('两个作业嵌在同一个条件里 → 都生成 job', () => {
        const 条件 = 造时间条件('之后', '2026-09-20T20:00:00', 'UTC+08:00', [
            造作业('contract', '契约对应'),
            造作业('build', '自动编译'),
        ]);
        const yaml = 生成GitHubYAML(造工作流([条件]));
        expect(yaml).toContain('contract:');
        expect(yaml).toContain('build:');
        // 两个 job 都依赖 gates
        const gates出现次数 = (yaml.match(/needs:\n      - gates/g) ?? []).length;
        expect(gates出现次数).toBe(2);
    });
});

// ========== 条件内嵌门禁 ==========
describe('条件内嵌门禁', () => {
    it('门禁嵌在条件里 → 作为 gates 的 step，加 if', () => {
        const 条件 = 造时间条件('之后', '2026-09-20T20:00:00', 'UTC+08:00', [
            造越权控制('alice: frontend/**'),
        ]);
        const yaml = 生成GitHubYAML(造工作流([条件]));
        expect(yaml).toContain('时间检查（1）');
        expect(yaml).toContain('越权检查（PR 合并）（1）');
        expect(yaml).toContain("if: steps.cib_time_1.outputs.CIB_MATCH == 'true'");
    });
});

// ========== 嵌套条件 ==========
describe('嵌套条件', () => {
    it('条件里嵌条件 → 检查步骤带父 if，作业 if 串联', () => {
        const 内条件 = 造时间条件('之前', '2026-12-31T00:00:00', 'UTC+08:00', [
            造作业('contract', '契约对应'),
        ]);
        const 外条件 = 造时间条件('之后', '2026-01-01T00:00:00', 'UTC+08:00', [内条件]);

        const yaml = 生成GitHubYAML(造工作流([外条件]));

        // 两个时间检查
        expect(yaml).toContain('时间检查（1）');
        expect(yaml).toContain('时间检查（2）');

        // 内条件的检查步骤带父 if
        expect(yaml).toContain("if: steps.cib_time_1.outputs.CIB_MATCH == 'true'");

        // contract job 的 if 串联两个条件
        expect(yaml).toContain("needs.gates.outputs.CIB_MATCH_1 == 'true'");
        expect(yaml).toContain("needs.gates.outputs.CIB_MATCH_2 == 'true'");
    });
});

// ========== 越权控制（门禁） ==========
describe('越权控制', () => {
    it('生成 CIB_OWNERS / CIB_EXEMPT / CIB_ACTION', () => {
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

    it('支持文件类型匹配（**.doc）', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造越权控制('alice: **.doc\nalice: frontend/**.md')]),
        );
        expect(yaml).toContain('匹配()');
        expect(yaml).toContain('alice: **.doc');
        expect(yaml).toContain('alice: frontend/**.md');
        expect(yaml).toContain("s/\\*\\*/.*/g");
    });

    it('仅告警模式', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造越权控制('alice: frontend/**', 'PR 合并', '仅告警')]),
        );
        expect(yaml).toContain('CIB_ACTION: 仅告警');
        expect(yaml).toContain('::warning::');
    });
});

// ========== 次数铡刀 ==========
describe('次数铡刀', () => {
    it('基本计数检查', () => {
        const yaml = 生成GitHubYAML(造工作流([造次数铡刀()]));
        expect(yaml).toContain('CIB_SOURCE: branch_total_commits');
        expect(yaml).toContain('CIB_THRESHOLD: "50"');
        expect(yaml).toContain('CIB_COMPARE: gt');
        expect(yaml).toContain('次数检查通过');
    });

    it('仅告警模式', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造次数铡刀('files_modified', '100', 'gt', 'warn')]),
        );
        expect(yaml).toContain('CIB_MODE: warn');
        expect(yaml).toContain('::warning::');
    });

    it('未达模式（lt）', () => {
        const yaml = 生成GitHubYAML(
            造工作流([造次数铡刀('branch_total_commits', '3', 'lt')]),
        );
        expect(yaml).toContain('CIB_COMPARE: lt');
    });
});

// ========== 多条件 ==========
describe('多条件', () => {
    it('两个并列条件 → outputs 有两个', () => {
        const 条件1 = 造时间条件('之后', '2026-01-01T00:00:00');
        const 条件2 = 造时间条件('之前', '2026-12-31T00:00:00');
        const yaml = 生成GitHubYAML(造工作流([条件1, 条件2]));
        expect(yaml).toContain('时间检查（1）');
        expect(yaml).toContain('时间检查（2）');
        expect(yaml).toContain('CIB_MATCH_1:');
        expect(yaml).toContain('CIB_MATCH_2:');
        expect(yaml).toContain('id: cib_time_1');
        expect(yaml).toContain('id: cib_time_2');
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
                    通过时: [造作业('notify_ok', '通知成功')],
                    失败时: [造作业('notify_fail', '通知失败')],
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        expect(yaml).toContain('notify_ok:');
        expect(yaml).toContain('notify_fail:');
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

// ========== 部署 ==========
describe('部署到 GitHub Pages', () => {
    it('生成 environment + peaceiris action', () => {
        const 工作流: IR工作流 = {
            名称: '部署测试',
            触发器: [],
            节点: [
                {
                    kind: '作业',
                    id: 'deploy_gh_pages',
                    keyword: '部署到 GitHub Pages',
                    运行环境: 'ubuntu-latest',
                    步骤: [
                        {
                            kind: '步骤',
                            keyword: '部署',
                            name: '部署到 GitHub Pages',
                            uses: 'peaceiris/actions-gh-pages@v4',
                            with: {
                                github_token: '${{ secrets.GITHUB_TOKEN }}',
                                publish_dir: './dist',
                                publish_branch: 'gh-pages',
                            },
                        },
                    ],
                    environment: { name: 'production', url: 'https://example.com' },
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        expect(yaml).toContain('peaceiris/actions-gh-pages@v4');
        expect(yaml).toContain('environment:');
        expect(yaml).toContain('production');
        expect(yaml).toContain('https://example.com');
    });
});

// ========== 边界 ==========
describe('边界情况', () => {
    it('空门禁 / 空条件：不生成 gates job', () => {
        const yaml = 生成GitHubYAML(造工作流([]));
        expect(yaml).not.toContain('gates:');
    });

    it('未知 blockId：生成占位 step，不崩', () => {
        const 未知: IR门禁 = {
            kind: '门禁',
            keyword: '未知门禁',
            blockId: 'cib/unknown-block',
            拦截时机: '提交时',
            参数: {},
        };
        const yaml = 生成GitHubYAML(造工作流([未知]));
        expect(yaml).toContain('未实现的门禁');
    });

    it('YAML 是合法结构：有 name / on / jobs', () => {
        const yaml = 生成GitHubYAML(造工作流([造时间条件('之后', '2026-01-01T00:00:00')]));
        expect(yaml).toMatch(/^name:/m);
        expect(yaml).toMatch(/^on:/m);
        expect(yaml).toMatch(/^jobs:/m);
    });

    it('中文不乱码', () => {
        const yaml = 生成GitHubYAML(造工作流([造时间条件('之后', '2026-01-01T00:00:00')]));
        expect(yaml).toContain('时间检查');
        expect(yaml).not.toContain('鏃堕棿');
    });

    it('字段顺序：working-directory / timeout / env 在 run 之前', () => {
        const 工作流: IR工作流 = {
            名称: '顺序测试',
            触发器: [],
            节点: [
                {
                    kind: '作业',
                    id: 'test',
                    keyword: '测试',
                    运行环境: 'ubuntu-latest',
                    步骤: [
                        {
                            kind: '步骤',
                            keyword: '测试',
                            name: '测试',
                            'working-directory': '.',
                            timeout: 10,
                            env: { FOO: 'bar' },
                            run: 'echo test',
                        },
                    ],
                },
            ],
        };
        const yaml = 生成GitHubYAML(工作流);
        const wdIdx = yaml.indexOf('working-directory');
        const timeoutIdx = yaml.indexOf('timeout-minutes');
        const envIdx = yaml.indexOf('env:');
        const runIdx = yaml.indexOf('run:');
        expect(wdIdx).toBeLessThan(runIdx);
        expect(timeoutIdx).toBeLessThan(runIdx);
        expect(envIdx).toBeLessThan(runIdx);
    });
});