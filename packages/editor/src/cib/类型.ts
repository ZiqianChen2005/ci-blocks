export interface CIB文件 {
    格式: 'cib';
    版本: string;
    保存时间: string;
    语言: string;
    工作流名称: string;
    工作区: unknown;
}

export const CIB格式版本 = '0.1.0';