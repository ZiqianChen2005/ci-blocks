export interface 模板元信息 {
    id: string;
    名称: string;
    描述: string;
    文件: string;
}

let 缓存: 模板元信息[] | null = null;

export async function 加载模板列表(): Promise<模板元信息[]> {
    if (缓存) return 缓存;
    try {
        const 响应 = await fetch('/examples/index.json');
        if (!响应.ok) throw new Error(`HTTP ${响应.status}`);
        const 数据 = await 响应.json();
        缓存 = 数据.模板 ?? [];
        return 缓存;
    } catch (e) {
        console.warn('加载模板列表失败：', e);
        return [];
    }
}

export async function 加载模板(文件: string): Promise<any> {
    const 响应 = await fetch(`/examples/${encodeURIComponent(文件)}`);
    if (!响应.ok) throw new Error(`HTTP ${响应.status}`);
    return await 响应.json();
}