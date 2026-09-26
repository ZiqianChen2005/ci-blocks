# CI Blocks（CI 积木）
## Ver. 0.2.0

> 用搭积木的方式生成 CI 脚本。让"配 CI"从填坑变成玩乐高。

[![CI](https://github.com/<your-org>/ci-blocks/actions/workflows/ci.yml/badge.svg)](https://github.com/<your-org>/ci-blocks/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg)](https://pnpm.io/)

---

## 这是什么

CI Blocks 是一个可视化的 CI 配置生成器。你在画布上拖拽积木块，右侧实时生成 GitHub Actions / GitLab CI 的 YAML 脚本。

面向：

- 没时间查 YAML 语法的老将：不用记 needs、artifacts、matrix 怎么写
- 被队友坑死的学校队长：积木可视化，谁改了哪块一眼看清
- 想配 CI 但无从下手的主管：拖几下就出可用的工作流

对标 Scratch 的交互，目标是对标 Scratch 的门槛。

---

## 为什么做这个

> 无数个规则守护者在面对着玩偶之家中"那我呢？"的场景。
> 没人看见他们的付出，甚至有人还在肆意践踏。
> **约定没有强制力。CI 规则才能。**
> **获奖是结果，不是特权。**
> **模型没有优势，不代表其他地方可以让路。**
> 该革命了。CIB，就是为了这种情况设计的。

完整宣言见 [docs/宣言.md](docs/宣言.md)。

---

## 核心特性

- **积木化编辑**：拖拽积木，上下吸附，像搭乐高
- **实时 YAML**：改一个字段，右侧脚本立即更新
- **分类工具箱**：基础 / 门禁 / 构建 / 校验 / 科研 / 项目 / 审计 / 环境 / 部署
- **中文关键字**：积木名、字段名、报错信息全中文
- **时区支持**：时间铡刀支持 UTC-12:00 ~ UTC+12:00，步长 30 分钟
- **动态字段**：根据工具链显示不同字段（如 Node 显示包管理器）
- **平台无关**：通过 IR 中间层，同一套积木支持 GitHub / GitLab 等
- **保存 / 读取**：画布存为 `.cib` 文件，可分享、可版本管理
- **多语言**：简中 / 英文，语言切换实时生效
- **社区可扩展**：`@cib/block-sdk` 抽包，第三方可独立写积木

---

## 快速开始

环境要求：

- Node.js >= 18
- pnpm >= 9

安装：

```bash
git clone https://github.com/<your-org>/ci-blocks.git
cd ci-blocks
pnpm install
```

启动编辑器：

```bash
pnpm dev
```

浏览器打开 http://127.0.0.1:5173

跑一次核心演示：

```bash
pnpm demo
```

输出一个「时间铡刀」生成的 GitHub Actions YAML。

跑测试：

```bash
pnpm test
```

---

## 项目结构

```
ci-blocks/
├── packages/
│   ├── block-sdk/          @cib/block-sdk —— 积木开发接口（第三方只装这个）
│   ├── core/               @cib/core —— IR、emitter、validator
│   ├── blocks-official/    @cib/blocks-official —— 官方积木
│   ├── i18n/               @cib/i18n —— 语言包
│   └── editor/             @cib/editor —— React + Blockly 可视化编辑器
├── docs/                   文档
└── examples/               示例工作流
```

---

## 架构

```
积木（CIBBlock）
    │ 生成
    ▼
IR（中文中间表示）
    │ 经过
    ▼
Emitter（平台 YAML 生成器）
    │ 输出
    ▼
GitHub Actions / GitLab CI YAML
```

关键设计：积木不直接产出 YAML，而是产出 IR（中间表示）。Emitter 负责把 IR 翻译成具体平台的脚本。这样同一块积木可以跨平台复用。

**语言与字段分离**：显示文本走语言包，IR 和生成的 YAML 用稳定标识符，切语言不影响输出。

**接口与实现分离**：`@cib/block-sdk` 只有接口（无 emitter / validator），第三方可独立写积木，不拉整个 core。

---

## 官方积木

### 基础（🧩）

| 积木 | id | 状态 |
|---|---|---|
| 行为条件 | `cib/if-action` | ✅ 已实现 |
| 分支条件 | `cib/if-branch` | ✅ 已实现 |
| 工作流判定条件 | `cib/if-workflow` | ✅ 已实现 |

### 门禁（🚧）

| 积木 | id | 状态 |
|---|---|---|
| 时间铡刀 | `cib/time-gate` | ✅ 已实现 |
| 次数铡刀 | `cib/count-gate` | ✅ 已实现 |
| 越权控制 | `cib/ownership-guard` | ✅ 已实现 |
| 异地容灾 | `cib/branch-protect` | ✅ 已实现 |

### 构建（🔨）

| 积木 | id | 状态 |
|---|---|---|
| 自动编译 | `cib/build` | ✅ 已实现 |

### 校验（✅）

| 积木 | id | 状态 |
|---|---|---|
| 成品校验 | `cib/test` | ✅ 已实现 |

### 科研（🔬）

| 积木 | id | 状态 |
|---|---|---|
| 追根溯源 | `cib/provenance` | ✅ 已实现 |

### 项目（📦）

| 积木 | id | 状态 |
|---|---|---|
| 契约对应 | `cib/contract` | ✅ 已实现 |

### 审计（📝）

| 积木 | id | 状态 |
|---|---|---|
| 行为记录 | `cib/audit` | ✅ 已实现 |

### 部署（🚀）

| 积木 | id | 状态 |
|---|---|---|
| 部署到 GitHub Pages | `cib/deploy-gh-pages` | ✅ 已实现 |

**共 13 个积木，9 个分类。**

---

## 积木详解

### 时间铡刀 `cib/time-gate`

在合法时间窗口之外的提交都会被拒绝，支持时区。

- **模式**：开仓冻结 / 超时封仓
- **时区**：UTC-12:00 ~ UTC+12:00，步长 30 分钟
- **场景**：竞赛封仓、考试开考前禁止提交

### 次数铡刀 `cib/count-gate`

按提交次数 / 文件数等计数维度拦截。

- **计数来源**：仓库总提交数 / 分支提交数 / 文件修改次数 / 自定义
- **比较**：超过 / 未达 / 等于
- **计数范围**：本次 push 内 / 从仓库创建至今 / 指定时间之后
- **模式**：硬拦截 / 仅告警
- **场景**：竞赛限制提交次数、作业要求最少提交数

### 越权控制 `cib/ownership-guard`

按用户 ID 和文件路径确定负责范围，越权拒绝合并。

- **负责人表**：每行 `用户ID: 路径模式`，如 `alice: frontend/**`
- **操作类型**：force push / 任意 push / PR 合并
- **违规动作**：拒绝合并 / 仅告警 / 记录审计
- **场景**：防止队友越界改别人的模块

### 异地容灾 `cib/branch-protect`

保护主分支，检测直接 push，镜像到备份分支。

- **保护分支**：如 `main,master`
- **要求 CI 通过**：是 / 否
- **要求 review 数**：PR 至少需要的 review 数
- **镜像分支**：备份到 `backup/main`
- **场景**：主分支被污染，备份分支还在

### 自动编译 `cib/build`

在干净环境里构建项目。

- **工具链**：Node / Python / Java / Go / Rust / 自定义
- **包管理器**：npm / pnpm / yarn / bun（仅 Node）
- **缓存**：开 / 关 / 自定义（缓存路径 / 键 / 恢复键）
- **场景**：专治"本地能跑、CI 跑不起来"

### 成品校验 `cib/test`

在干净环境里跑测试。

- **测试命令**：如 `npm test`
- **超时分钟**：防止测试卡死
- **上传报告**：保留测试记录
- **场景**：专治"我本地测过了"

### 追根溯源 `cib/provenance`

跑你自己的校验脚本，并留存证据。

- **校验命令**：需要已有校验脚本
- **上传证据**：将结果作为 artifact 保留
- **失败动作**：拒绝 / 仅告警
- **场景**：科研项目防"数据对不上、结果复现不了"

### 契约对应 `cib/contract`

校验前后端字段对齐。

- **契约类型**：OpenAPI / Protobuf / GraphQL / JSON Schema / TypeScript
- **校验命令**：用户自填，如 `npx openapi-diff`
- **上传差异报告**：保留 diff 记录
- **场景**：防止 `userName` vs `user_name` 式联调灾难

### 行为记录 `cib/audit`

把 CI 运行的关键信息记录成日志。

- **日志路径**：如 `.cib-audit/`
- **保留天数**：1~90
- **配合判定条件**：只在上游失败时记录
- **场景**：甩锅时不用吵

### 部署到 GitHub Pages `cib/deploy-gh-pages`

把构建产物发布到 GitHub Pages。

- **发布目录**：如 `dist`
- **目标分支**：如 `gh-pages`
- **环境**：GitHub 环境名
- **CNAME**：自定义域名
- **场景**：静态站自动发布

---

## 写你自己的积木

第三方只装 `@cib/block-sdk` 即可：

```ts
import { 定义积木, type IRNode } from '@cib/block-sdk';

export default 定义积木({
  id: 'my/hello',
  keyword: '你好',
  version: '0.1.0',
  category: '基础',
  meta: {
    icon: '👋',
    author: '你的名字',
    license: 'MIT',
    描述: '打印一句问候',
    tags: ['hello'],
  },
  schema: [
    { 键: '名字', 类型: '文本', 默认: '世界' },
  ],
  生成IR: (输入): IRNode[] => [
    {
      kind: '作业',
      id: 'hello',
      keyword: '你好',
      运行环境: 'ubuntu-latest',
      步骤: [
        {
          kind: '步骤',
          keyword: '打印',
          name: `问候 ${输入.名字}`,
          run: `echo "你好，${输入.名字}！"`,
        },
      ],
    },
  ],
});
```

编辑器会自动读 `schema` 渲染表单，读 `生成IR` 产出 IR，最终由 emitter 转成 YAML。

**详细文档**见 [docs/积木编写指南.md](docs/积木编写指南.md)。

---

## 加载外部积木

编辑器支持通过 URL 参数加载外部积木：

```
http://127.0.0.1:5173/?blocks=http://localhost:3000/hello.js
```

**多个用逗号分隔**：

```
http://127.0.0.1:5173/?blocks=http://localhost:3000/a.js,http://localhost:3000/b.js
```

外部积木需编译成 JS（ESM），提供 `default` 导出。

---

## 常见场景

### 封仓时间硬拦截

在编辑器中拖入「时间铡刀」，填上基准时间和时区，生成：

```yaml
name: 封仓门禁
on:
  push:
    branches:
      - main
jobs:
  gates:
    runs-on: ubuntu-latest
    steps:
      - name: 检查封仓时间（1）
        env:
          CIB_TZ: UTC-8
          CIB_TZ_LABEL: UTC+08:00
        run: |
          DEADLINE_RAW="2026-09-20T20:00:00"
          TZ_TARGET="${CIB_TZ}"
          ...
```

### 构建 → 测试 → 失败时审计

用「行为条件」+「分支条件」+「自动编译」+「工作流判定条件」+「成品校验」+「行为记录」组合：

```yaml
name: 未命名工作流
on:
  push:
    branches:
      - main
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - 检出代码
      - 设置 Node.js
      - 安装依赖
      - 构建
  test:
    needs:
      - build
    if: ${{ needs.build.result == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - 运行测试
  audit:
    needs:
      - build
    if: ${{ needs.build.result == 'failure' }}
    runs-on: ubuntu-latest
    steps:
      - 收集行为记录
```

### 部署静态站到 GitHub Pages

用「自动编译」+「部署到 GitHub Pages」组合：

```yaml
name: 部署
on:
  push:
    branches:
      - main
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - 检出代码
      - 设置 Node.js
      - 安装依赖
      - 构建
  deploy_gh_pages:
    needs:
      - build
    environment:
      name: production
      url: https://user.github.io/repo
    runs-on: ubuntu-latest
    steps:
      - 检出代码
      - 部署到 GitHub Pages
```

**前提**：仓库 Settings → Pages 选 `gh-pages` 分支；Actions 权限选 **Read and write**。

---

## 路线图

- [x] 核心 IR + GitHub emitter
- [x] 时间铡刀积木（含时区）
- [x] React + Blockly 编辑器骨架
- [x] 积木样式优化（Zelos 渲染器）
- [x] 越权控制 / 自动编译 / 成品校验 / 追根溯源 / 异地容灾 / 行为记录
- [x] 次数铡刀
- [x] 行为条件 / 分支条件 / 工作流判定条件
- [x] 语言包（简中 / 英文）
- [x] 保存 / 读取 `.cib` 文件
- [x] 自动编译支持自定义工具链（动态字段）
- [x] 自动编译支持 pnpm / yarn / bun
- [x] 自动编译缓存支持自定义
- [x] 契约对应积木
- [x] 部署分类 + GitHub Pages
- [x] `@cib/block-sdk` 抽包
- [x] 编辑器支持加载外部积木
- [ ] 业务作业自动依赖 `gates`
- [ ] UI 面板加载外部积木
- [ ] 沙箱执行外部积木
- [ ] 双向同步（粘贴 YAML → 还原积木）
- [ ] 积木市场
- [ ] GitLab CI / CircleCI emitter
- [ ] CLI（`cib build`）
- [ ] 更多部署积木（Vercel / Netlify / SSH / Docker / K8s）
- [ ] 通知积木（Slack / 邮件 / Webhook）
- [ ] Artifact 上传 / 下载积木

---

## 贡献

欢迎 PR。贡献入口：

- **加积木**：在 `packages/blocks-official/src/` 下新建目录，`pnpm test` 通过即可提 PR
- **加平台**：在 `packages/core/src/emitter/` 下新建 emitter
- **加语言**：在 `packages/i18n/src/` 下新建语言包
- **改编辑器**：在 `packages/editor/src/` 下提 PR
- **第三方积木**：装 `@cib/block-sdk`，发 npm 包

开发规范：

- **源码编码**：UTF-8 无 BOM
- **文件行尾**：LF
- **标识符**：显示文本走语言包；IR 和生成的 YAML 用稳定标识符
- **提交前**：`pnpm test` 通过

---

## 技术栈

| 层 | 技术 |
|---|---|
| 编辑器 | React 18 + Blockly 11 + Vite |
| 状态 | Zustand |
| 核心 | TypeScript 5.4 + yaml |
| 测试 | Vitest |
| 包管理 | pnpm workspace |
| i18n | 自研语言包（BCP 47） |
| 积木接口 | @cib/block-sdk |

---

## 文档

- [积木设计图](docs/模块设计图纸.md)
- [积木编写指南](docs/积木编写指南.md)
- [项目宣言](docs/宣言.md)

---

## 许可

MIT