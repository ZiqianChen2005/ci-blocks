export type 语言 = 'zh-CN' | 'en-US';

export interface 语言包 {
    语言: 语言;
    名称: string;

    通用: {
        删除: string;
        添加: string;
        取消: string;
        确定: string;
        加载中: string;
        未命名工作流: string;
    };

    工具栏: {
        品牌: string;
        文件: string;
        编辑: string;
        新建: string;
        打开: string;
        保存: string;
        另存为: string;
        撤销: string;
        重做: string;
        复制: string;
        剪切: string;
        粘贴: string;
        删除: string;
        全选: string;
        清空画布: string;
        清空确认: string;
        已清空: string;
        语言: string;
        工作流名称占位: string;
        新建确认: string;
        已新建: string;
        已保存: string;
        打开失败: string;
        已打开: string;
        右键菜单: {
            复制为JSON: string;
            清空画布: string;
            清空确认: string;
        };
    };

    预览栏: {
        标题: string;
        生成失败: string;
    };

    分类: {
        基础: string;
        门禁: string;
        构建: string;
        校验: string;
        科研: string;
        项目: string;
        审计: string;
        环境: string;
        部署: string;
    };

    积木: Record<string, {
        keyword: string;
        描述: string;
        字段: Record<string, string>;
        选项?: Record<string, string>;
    }>;
}