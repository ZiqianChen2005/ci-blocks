import { create } from 'zustand';
import { 语言包表, type 语言, type 语言包 } from '@cib/i18n';
import {use编辑器} from "./编辑器状态";

interface 语言状态 {
    语言: 语言;
    语言包: 语言包;
    设置语言: (l: 语言) => void;
}

export const use语言 = create<语言状态>((set) => ({
    语言: 'zh-CN',
    语言包: 语言包表['zh-CN'],
    设置语言: (l) => set({ 语言: l, 语言包: 语言包表[l] }),
}));

if (typeof window !== 'undefined') {
    (window as any).__cibStore = use编辑器;
}