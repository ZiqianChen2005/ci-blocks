import { 定义积木, type IRNode, type IR步骤 } from '@cib/block-sdk';

export interface 部署GitHubPages输入 {
    发布目录: string;
    目标分支: string;
    环境: string;
    环境URL?: string;
    保留历史: '是' | '否';
    CNAME?: string;
}

export const 部署GitHubPages = 定义积木<部署GitHubPages输入>({
    id: 'cib/deploy-gh-pages',
    keyword: '部署到 GitHub Pages',
    aliases: ['GitHub Pages', '静态站部署', 'gh-pages'],
    version: '0.1.0',
    category: '部署',
    meta: {
        icon: '🚀',
        author: 'CIB 官方',
        license: 'MIT',
        描述: '把构建产物发布到 GitHub Pages',
        tags: ['部署', 'GitHub Pages', '静态站'],
    },
    schema: [
        {
            键: '发布目录',
            类型: '文本',
            必填: true,
            默认: 'dist',
            说明: '要发布的目录，如 dist、build、public',
        },
        {
            键: '目标分支',
            类型: '文本',
            默认: 'gh-pages',
            说明: '发布到哪个分支',
        },
        {
            键: '环境',
            类型: '文本',
            默认: 'production',
            说明: 'GitHub 环境名，如 production、staging',
        },
        {
            键: '环境URL',
            类型: '文本',
            说明: '部署后的 URL，如 https://user.github.io/repo',
        },
        {
            键: '保留历史',
            类型: '枚举',
            选项: ['是', '否'],
            默认: '否',
            说明: '保留 gh-pages 分支的旧文件',
        },
        {
            键: 'CNAME',
            类型: '文本',
            说明: '自定义域名，如 www.example.com（留空则用默认）',
        },
    ],
    生成IR: (输入): IRNode[] => {
        const 发布目录 = 输入.发布目录 ?? 'dist';
        const 目标分支 = 输入.目标分支 ?? 'gh-pages';
        const 环境 = 输入.环境 ?? 'production';
        const 环境URL = 输入.环境URL ?? '';
        const 保留历史 = 输入.保留历史 ?? '否';
        const CNAME = 输入.CNAME ?? '';

        const 步骤: IR步骤[] = [];

        // 1. checkout
        步骤.push({
            kind: '步骤',
            keyword: '检出代码',
            name: '检出代码',
            uses: 'actions/checkout@v4',
        });

        // 2. 部署
        const with值: Record<string, unknown> = {
            github_token: '${{ secrets.GITHUB_TOKEN }}',
            publish_dir: `./${发布目录}`,
            publish_branch: 目标分支,
            keep_files: 保留历史 === '是',
        };
        if (CNAME.trim()) {
            with值.cname = CNAME;
        }

        步骤.push({
            kind: '步骤',
            keyword: '部署到 GitHub Pages',
            name: '部署到 GitHub Pages',
            uses: 'peaceiris/actions-gh-pages@v4',
            with: with值,
        });

        return [
            {
                kind: '作业',
                id: 'deploy_gh_pages',
                keyword: '部署到 GitHub Pages',
                运行环境: 'ubuntu-latest',
                步骤,
                environment: {
                    name: 环境,
                    ...(环境URL.trim() ? { url: 环境URL } : {}),
                },
            },
        ];
    },
    校验: (输入) => {
        const 问题 = [];
        if (!输入.发布目录?.trim()) {
            问题.push({ 级别: '错误' as const, 消息: '发布目录不能为空' });
        }
        if (!输入.目标分支?.trim()) {
            问题.push({ 级别: '错误' as const, 消息: '目标分支不能为空' });
        }
        if (!输入.环境?.trim()) {
            问题.push({ 级别: '错误' as const, 消息: '环境不能为空' });
        }
        if (输入.环境URL?.trim() && !输入.环境URL.startsWith('http')) {
            问题.push({
                级别: '警告' as const,
                消息: '环境 URL 建议以 http:// 或 https:// 开头',
            });
        }
        return 问题;
    },
});