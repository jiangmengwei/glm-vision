# GLM Vision — Codex Skill：图片识别 / OCR

一个开源的 **Codex Skill**：用智谱 **GLM 免费视觉模型**（glm-4.6v-flash）实现**图片识别、截图 OCR、文字提取、图表与公式识别、图片描述**。适合中文图片、扫描件、界面截图、论文图表等场景，主模型不支持图片输入时，用它把图片转成文字再继续推理。

**关键词**：codex skill · image recognition · OCR · 图片识别 · 截图文字提取 · 智谱 GLM · zhipu vision · 免费 API · agent


用智谱免费视觉模型（glm-4.6v-flash）识别图片、截图、扫描件：OCR 文字提取、图表/公式识别、图片描述、界面截图解读。

> 适用于 Codex 等主模型不支持图片输入的 Agent 环境：用户发图后，脚本把图片交给智谱视觉模型识别成文字，再供主模型继续推理。

## 文件结构

```
glm-vision/
├── SKILL.md              # Skill 说明（Codex 技能入口）
├── agents/openai.yaml    # Agent 界面配置
├── scripts/describe-image.js  # 核心识别脚本
├── config.example.json   # 配置模板（复制为 config.json 后填入 key）
└── .gitignore            # 忽略含密钥的 config.json
```

## 安装

1. 把本文件夹放到 `~/.codex/skills/glm-vision/`
2. 配置 API key（二选一）：
   - 推荐：设置环境变量 `export GLM_API_KEY=你的key`
   - 或：复制 `config.example.json` 为 `config.json` 并填入 api_key

> 密钥获取：智谱开放平台 open.bigmodel.cn → API Keys。免费模型 `glm-4.6v-flash` / `glm-4v-flash` 无需充值。

## 使用

```bash
node scripts/describe-image.js "<图片路径或URL>" [--prompt "具体问题"]
```

多张图可一次传入多个路径；429/5xx 自动降级 glm-4v-flash。

## 安全说明

- `config.json`（含真实 key）被 .gitignore 排除，**永远不会提交**。
- 脚本优先读环境变量 `GLM_API_KEY` / `ZHIPU_API_KEY`，其次才读 config.json。
- 模型白名单仅含免费模型，防止误调付费模型产生费用。

## License

MIT
