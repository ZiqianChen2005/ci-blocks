export type { 语言, 语言包 } from './类型.js';
export { zhCN } from './zh-CN.js';
export { enUS } from './en-US.js';

import { zhCN } from './zh-CN.js';
import { enUS } from './en-US.js';
import type { 语言, 语言包 } from './类型.js';

export const 语言包表: Record<语言, 语言包> = {
    'zh-CN': zhCN,
    'en-US': enUS,
};

/** 查积木显示名 */
export function 取积木名(包: 语言包, blockId: string, 回退: string): string {
    return 包.积木[blockId]?.keyword ?? 回退;
}

/** 查积木描述 */
export function 取积木描述(包: 语言包, blockId: string, 回退: string): string {
    return 包.积木[blockId]?.描述 ?? 回退;
}

/** 查字段显示名 */
export function 取字段名(
    包: 语言包,
    blockId: string,
    字段键: string,
    回退: string,
): string {
    return 包.积木[blockId]?.字段[字段键] ?? 回退;
}

/** 查枚举选项显示名 */
export function 取选项名(
    包: 语言包,
    blockId: string,
    原值: string,
    回退: string,
): string {
    return 包.积木[blockId]?.选项?.[原值] ?? 回退;
}