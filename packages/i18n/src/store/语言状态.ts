import { create } from 'zustand';
import { 语言包表, type 语言, type 语言包 } from '@cib/i18n';

interface 语言状态 {
    语言: 语言;
    语言包: 语言包;
    设置语言: (l: 语言) => void;
}

export const use语言 = create<语言状态>((set) => ({
    语言: 'zh-CN.ts',
    语言包: 语言包表['zh-CN.ts'],
    设置语言: (l) => set({ 语言: l, 语言包: 语言包表[l] }),
}));