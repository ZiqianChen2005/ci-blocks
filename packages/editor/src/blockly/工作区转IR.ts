import * as Blockly from 'blockly';
import type { CIBBlock, IRNode, IR触发器, IR过滤, IR判定, IR门禁, IR作业 } from '@cib/core';

/** 这些事件不支持 branches / paths / tags 过滤 */
const 无过滤事件 = new Set(['workflow_dispatch', 'schedule']);

function 读字段(
    block: Blockly.Block,
    字段列表: CIBBlock<any>['schema'],
): Record<string, unknown> {
    const 输入: Record<string, unknown> = {};
    for (const f of 字段列表) {
        try {
            if (f.类型 === '日期时间') {
                const 年 = block.getFieldValue(`${f.键}_年`) || '2026';
                const 月 = block.getFieldValue(`${f.键}_月`) || '01';
                const 日 = block.getFieldValue(`${f.键}_日`) || '01';
                const 时 = block.getFieldValue(`${f.键}_时`) || '00';
                const 分 = block.getFieldValue(`${f.键}_分`) || '00';
                const 秒 = block.getFieldValue(`${f.键}_秒`) || '00';
                输入[f.键] = `${年}-${月}-${日}T${时}:${分}:${秒}Z`;
            } else {
                输入[f.键] = block.getFieldValue(f.键);
            }
        } catch {}
    }
    return 输入;
}

/** 从 IR 列表里，找最后一个"业务作业"的 job id（门禁不算） */
function 取最后一个业务作业Id(irs: IRNode[]): string | null {
    for (let i = irs.length - 1; i >= 0; i--) {
        const ir = irs[i];
        if (ir.kind === '作业') return ir.id;
    }
    return null;
}

/** 处理触发器：合并分支过滤，无过滤事件跳过 */
function 处理触发器(
    ir: IR触发器,
    分支IRs: IRNode[],
    事件: string,
): IR触发器 {
    if (无过滤事件.has(事件)) {
        if (分支IRs.length > 0) {
            console.warn(`事件 ${事件} 不支持过滤，已忽略分支条件`);
        }
        return { ...ir, 过滤: {} };
    }
    const 过滤map: Record<string, unknown> = { ...(ir.过滤 ?? {}) };
    for (const f of 分支IRs) {
        if (f.kind === '过滤') 过滤map[f.键] = f.值;
    }
    return { ...ir, 过滤: 过滤map };
}

function 读语句块IR(
    block: Blockly.Block,
    inputName: string,
    找积木: (id: string) => CIBBlock<any> | undefined,
    工作流名称: string,
): IRNode[] {
    const 结果: IRNode[] = [];
    let 当前 = block.getInputTargetBlock(inputName);
    let 上一个JobId: string | null = null;

    while (当前) {
        const 定义 = 找积木(当前.type);
        if (定义) {
            const 子输入 = 读字段(当前, 定义.schema);
            try {
                const irs = 定义.生成IR(子输入, { 工作流名称 });
                for (const ir of irs) {
                    if (ir.kind === '触发器') {
                        const 内分支 = 读语句块IR(当前, '分支块', 找积木, 工作流名称);
                        const 内作业 = 读语句块IR(当前, '作业块', 找积木, 工作流名称);

                        const 合并后 = 处理触发器(ir as IR触发器, 内分支, (ir as IR触发器).事件);
                        结果.push(合并后);
                        结果.push(...内作业);

                        const id = 取最后一个业务作业Id(内作业);
                        if (id) 上一个JobId = id;
                    } else if (ir.kind === '判定') {
                        (ir as IR判定).判定来源 = 上一个JobId ?? '';

                        const 通过IRs = 读语句块IR(当前, '通过块', 找积木, 工作流名称);
                        const 失败IRs = 读语句块IR(当前, '失败块', 找积木, 工作流名称);
                        (ir as IR判定).通过时 = 通过IRs;
                        (ir as IR判定).失败时 = 失败IRs;
                        结果.push(ir);

                        const 判定后 = 取最后一个业务作业Id([...通过IRs, ...失败IRs]);
                        if (判定后) 上一个JobId = 判定后;
                    } else if (ir.kind === '门禁') {
                        // 门禁不参与"上一个业务作业"
                        结果.push(ir);
                    } else {
                        结果.push(ir);
                        if (ir.kind === '作业') {
                            上一个JobId = ir.id;
                        }
                    }
                }
            } catch (e) {
                console.warn(`子块 ${当前.type} 生成 IR 失败：`, e);
            }
        }
        当前 = 当前.getNextBlock() ?? null;
    }
    return 结果;
}

function 处理顶层链(
    链头: Blockly.Block,
    找积木: (id: string) => CIBBlock<any> | undefined,
    工作流名称: string,
): IRNode[] {
    const 结果: IRNode[] = [];
    let 当前: Blockly.Block | null = 链头;
    let 上一个JobId: string | null = null;

    while (当前) {
        const 定义 = 找积木(当前.type);
        if (定义) {
            const 输入 = 读字段(当前, 定义.schema);
            try {
                const irs = 定义.生成IR(输入, { 工作流名称 });
                for (const ir of irs) {
                    if (ir.kind === '触发器') {
                        const 分支IRs = 读语句块IR(当前, '分支块', 找积木, 工作流名称);
                        const 作业IRs = 读语句块IR(当前, '作业块', 找积木, 工作流名称);

                        const 合并后 = 处理触发器(ir as IR触发器, 分支IRs, (ir as IR触发器).事件);
                        结果.push(合并后);
                        结果.push(...作业IRs);

                        const id = 取最后一个业务作业Id(作业IRs);
                        if (id) 上一个JobId = id;
                    } else if (ir.kind === '判定') {
                        (ir as IR判定).判定来源 = 上一个JobId ?? '';

                        const 通过IRs = 读语句块IR(当前, '通过块', 找积木, 工作流名称);
                        const 失败IRs = 读语句块IR(当前, '失败块', 找积木, 工作流名称);
                        (ir as IR判定).通过时 = 通过IRs;
                        (ir as IR判定).失败时 = 失败IRs;
                        结果.push(ir);

                        const 判定后 = 取最后一个业务作业Id([...通过IRs, ...失败IRs]);
                        if (判定后) 上一个JobId = 判定后;
                    } else if (ir.kind === '门禁') {
                        结果.push(ir);
                    } else {
                        结果.push(ir);
                        if (ir.kind === '作业') {
                            上一个JobId = ir.id;
                        }
                    }
                }
            } catch (e) {
                console.warn(`积木 ${当前.type} 生成 IR 失败：`, e);
            }
        }
        当前 = 当前.getNextBlock() ?? null;
    }

    return 结果;
}

export function 工作区转IR(
    workspace: Blockly.Workspace,
    找积木: (id: string) => CIBBlock<any> | undefined,
    工作流名称 = '未命名工作流',
): IRNode[] {
    const 节点: IRNode[] = [];
    const 顶层块 = workspace.getTopBlocks(true);

    for (const 链头 of 顶层块) {
        const irs = 处理顶层链(链头, 找积木, 工作流名称);
        节点.push(...irs);
    }

    return 节点;
}