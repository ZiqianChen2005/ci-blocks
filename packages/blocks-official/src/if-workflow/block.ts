import { 定义积木, type IRNode } from '@cib/core';

export interface 工作流判定条件输入 {
    // 无输入字段，判定来源由工作区转IR 自动填
}

export const 工作流判定条件 = 定义积木<工作流判定条件输入>({
    id: 'cib/if-workflow',
    keyword: '工作流判定条件',
    aliases: ['判定', '结果分支', '成功失败分支'],
    version: '0.2.0',
    category: '基础',
    meta: {
        icon: '🔀',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '接在上一个作业后面，根据其结果分别执行通过 / 失败时的积木',
        tags: ['判定', '分支', 'needs', 'if'],
    },
    schema: [],
    生成IR: (): IRNode[] => [
        {
            kind: '判定',
            keyword: '工作流判定条件',
            blockId: 'cib/if-workflow',
            判定来源: '',   // 由 工作区转IR 填
            通过时: [],
            失败时: [],
        },
    ],
});