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
        视图: string;
        工具: string;
        帮助: string;
        新建: string;
        打开: string;
        保存: string;
        另存为: string;
        导出为: string;
        导出GitHubYAML: string;
        导出GitLabYAML: string;
        导出CircleCI: string;
        导出Jenkinsfile: string;
        导出通用YAML: string;
        导出积木JSON: string;
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
        已另存为: string;
        已导出: string;
        保存失败: string;
        暂未实现: string;
        取消保存: string;
        打开失败: string;
        已打开: string;
        未选中积木: string;
        已复制: string;
        已剪切: string;
        已粘贴: string;
        粘贴失败: string;
        已删除: string;
        已选中: string;
        右键菜单: {
            复制为JSON: string;
            清空画布: string;
            清空确认: string;
        };
        视图菜单: {
            放大: string;
            缩小: string;
            重置缩放: string;
            折叠所有: string;
            展开所有: string;
            整理积木: string;
            已整理: string;
        };
        工具菜单: {
            加载外部积木: string;
            加载外部积木标题: string;
            加载外部积木说明: string;
            加载: string;
            导出YAML: string;
            复制YAML: string;
            已复制YAML: string;
            已加载外部积木: string;
            加载失败: string;
            无YAML: string;
        };
        帮助菜单: {
            文档: string;
            快捷键: string;
            关于: string;
            GitHub仓库: string;
            关于标题: string;
            关于描述: string;
            版本: string;
            快捷键标题: string;
            分组编辑器: string;
            分组画布: string;
            分组缩放: string;
            快捷键保存: string;
            快捷键打开: string;
            快捷键新建: string;
            快捷键撤销: string;
            快捷键重做: string;
            快捷键复制: string;
            快捷键剪切: string;
            快捷键粘贴: string;
            快捷键删除: string;
            快捷键全选: string;
            快捷键滚轮缩放: string;
            快捷键放大: string;
            快捷键缩小: string;
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