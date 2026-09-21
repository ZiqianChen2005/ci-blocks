// ========== IR 类型 ==========
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
    environment?: {
        name: string;
        url?: string;
    };
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

// ========== 积木接口 ==========
export interface 字段描述 {
    键: string;
    类型: '文本' | '时间' | '日期时间' | '枚举' | '布尔' | '数字' | '路径列表';
    必填?: boolean;
    默认?: unknown;
    选项?: string[];
    说明?: string;
}

export interface 生成上下文 {
    工作流名称: string;
}

export interface 诊断 {
    级别: '错误' | '警告';
    消息: string;
}

export type 积木分类 =
    | '基础'
    | '门禁'
    | '构建'
    | '校验'
    | '科研'
    | '项目'
    | '审计'
    | '环境'
    | '部署';

export interface CIBBlock<输入 = Record<string, unknown>> {
    id: string;
    keyword: string;
    aliases?: string[];
    version: string;
    category: 积木分类;
    meta: {
        icon?: string;
        author: string;
        license: string;
        描述: string;
        tags: string[];
        permissions?: string[];
    };
    schema: 字段描述[];
    生成IR: (输入: 输入, 上下文: 生成上下文) => IRNode[];
    还原输入?: (节点: IRNode) => 输入 | null;
    校验?: (输入: 输入) => 诊断[];
}

export function 定义积木<T>(block: CIBBlock<T>): CIBBlock<T> {
    return block;
}