export type IRKind = '触发器' | '作业' | '步骤' | '门禁' | '缓存' | '自定义' | '过滤' | '判定';

export interface IR门禁 {
    kind: '门禁';
    keyword: string;
    blockId: string;
    拦截时机: '提交时' | '合并前' | '封仓后';
    参数: Record<string, unknown>;
}

export interface IR步骤 {
    kind: '步骤';
    keyword: string;
    name: string;
    uses?: string;
    run?: string;
    with?: Record<string, unknown>;
    env?: Record<string, string>;
    'working-directory'?: string;
    if?: string;
    timeout?: number;
    'continue-on-error'?: boolean;
}

export interface IR作业 {
    kind: '作业';
    id: string;
    keyword: string;
    运行环境: string;
    步骤: IR步骤[];
    needs?: string[];
}

export interface IR触发器 {
    kind: '触发器';
    keyword: string;
    事件: string;
    过滤?: Record<string, unknown>;
}

export interface IR过滤 {
    kind: '过滤';
    keyword: string;
    键: string;
    值: string[];
}

export interface IR判定 {
    kind: '判定';
    keyword: string;
    blockId: string;
    判定来源: string;
    通过时: IRNode[];
    失败时: IRNode[];
}

export type IRNode = IR门禁 | IR步骤 | IR作业 | IR触发器 | IR过滤 | IR判定;

export interface IR工作流 {
    名称: string;
    触发器: IR触发器[];
    节点: IRNode[];
}