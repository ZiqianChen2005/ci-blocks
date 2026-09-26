import { 定义积木, type IRNode } from '@cib/block-sdk';

export interface 文本框输入 {
    内容: string;
}

export const 文本框 = 定义积木<文本框输入>({
    id: 'cib/text-note',
    keyword: '文本框',
    aliases: ['注释', '备注', '说明'],
    version: '0.1.0',
    category: '基础',
    meta: {
        icon: '📝',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '在画布上写注释，不参与代码生成',
        tags: ['注释', '文本', '说明'],
    },
    schema: [
        {
            键: '内容',
            类型: '文本',
            默认: '在此写注释…',
            说明: '文本框内容，不参与 IR 生成',
        },
    ],
    生成IR: (): IRNode[] => [],
    校验: () => [],
});