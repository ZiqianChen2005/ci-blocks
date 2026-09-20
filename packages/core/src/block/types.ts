import type { IRNode } from '../ir/types';

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

export interface CIBBlock<输入 = Record<string, unknown>> {
    id: string;
    keyword: string;
    aliases?: string[];
    version: string;
    category: '基础' | '门禁' | '构建' | '校验' | '科研' | '项目' | '审计' | '环境';
    meta: {
        icon?: string;
        author: string;
        license: string;
        描述: string;
        tags: string[];
    };
    schema: 字段描述[];
    生成IR: (输入: 输入, 上下文: 生成上下文) => IRNode[];
    还原输入?: (节点: IRNode) => 输入 | null;
    校验?: (输入: 输入) => 诊断[];
}

export function 定义积木<T>(block: CIBBlock<T>): CIBBlock<T> {
    return block;
}