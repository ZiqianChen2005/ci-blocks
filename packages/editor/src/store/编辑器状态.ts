import { create } from 'zustand';
import type { CIBBlock, IRNode } from '@cib/core';

interface 编辑器状态 {
    积木箱: CIBBlock<any>[];
    IR: IRNode[];
    setIR: (nodes: IRNode[]) => void;
}

export const use编辑器 = create<编辑器状态>((set) => ({
    积木箱: [],
    IR: [],
    setIR: (nodes) => set({ IR: nodes }),
}));

export function 设置积木箱(blocks: CIBBlock<any>[]) {
    use编辑器.setState({ 积木箱: blocks });
}