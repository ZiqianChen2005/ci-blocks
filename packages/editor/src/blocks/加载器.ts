import type { CIBBlock } from '@cib/block-sdk';

export interface 加载结果 {
    积木: CIBBlock<any>[];
    错误: { url: string; 消息: string }[];
}

export async function 加载外部积木(urls: string[]): Promise<加载结果> {
    const 积木: CIBBlock<any>[] = [];
    const 错误: { url: string; 消息: string }[] = [];

    for (const url of urls) {
        try {
            const 模块 = await import(/* @vite-ignore */ url);
            const 默认导出 = 模块.default;
            if (!默认导出) {
                错误.push({ url, 消息: '模块没有 default 导出' });
                continue;
            }

            // 支持单个积木或数组
            if (Array.isArray(默认导出)) {
                for (const b of 默认导出) {
                    if (校验积木(b)) 积木.push(b);
                    else 错误.push({ url, 消息: `无效积木：${b?.id ?? '未知'}` });
                }
            } else if (校验积木(默认导出)) {
                积木.push(默认导出);
            } else {
                错误.push({ url, 消息: '无效积木对象' });
            }
        } catch (e) {
            错误.push({ url, 消息: (e as Error).message });
        }
    }

    return { 积木, 错误 };
}

function 校验积木(b: any): b is CIBBlock<any> {
    return (
        b &&
        typeof b === 'object' &&
        typeof b.id === 'string' &&
        typeof b.keyword === 'string' &&
        typeof b.生成IR === 'function' &&
        Array.isArray(b.schema)
    );
}

export function 从URL读取积木参数(): string[] {
    const params = new URLSearchParams(location.search);
    const raw = params.get('blocks');
    if (!raw) return [];
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
}