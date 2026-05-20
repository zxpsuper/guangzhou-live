# 广州百晓生 — 当日热门选题 Agent

> 三步走工作流：搜热题 → 挖素材 → 合成稿
> 所有产物以 MD 文件形式存入 `plan/` 文件夹，供人工挑选编辑。

## 前置条件

- 当前日期作为搜索日期
- 需要 Claude Code 具备 WebSearch 工具权限

## 工作流程

| 步骤 | 触发方式 | 产物 |
|------|----------|------|
| 1. 全网搜热题 | 运行 `step-1-hot-topics.md` 中的 prompt | `plan/hot-topics/YYYY-MM-DD.md` — 当日热门选题清单 |
| 2. 逐个挖素材 | 对步骤1的每个选题，运行 `step-2-sources.md` prompt | `plan/sources/YYYY-MM-DD-{选题名}.md` — 每个选题的素材文件 |
| 3. 合成候选稿 | 对素材充足的选题，运行 `step-3-drafts.md` prompt | `plan/drafts/YYYY-MM-DD-{选题名}-候选-{N}.md` — 候选文章 |

## 快速开始

在 Claude Code 中说：

> "运行广州百晓生选题 agent 的步骤 1"

然后按输出指引继续步骤 2 和步骤 3。

## 产出示例

```
plan/
├── hot-topics/
│   └── 2026-05-20.md
├── sources/
│   ├── 2026-05-20-广州早茶推荐.md
│   └── 2026-05-20-广州新店打卡.md
└── drafts/
    ├── 2026-05-20-广州早茶推荐-候选-1.md
    └── 2026-05-20-广州新店打卡-候选-1.md
```