---
name: glm-vision
description: 识别和分析图片、截图、照片、扫描件。当用户上传图片附件、给出本地图片路径或图片 URL、粘贴截图、或要求"看图/识别图片/OCR 提取文字/描述图片内容/翻译图中文字/识别图表公式"时使用。你的主模型不支持图片输入，图片会被替换为 "image content omitted..." 占位符，此时必须运行 scripts/describe-image.js 调用智谱免费视觉模型（glm-4.6v-flash）识别。核心机制：node scripts/describe-image.js。
---

# GLM Vision — 图片识别

## 概述

你的主模型不支持图片输入。用户发图时，你看到的是占位符和图片文件路径（消息里 "Files mentioned by the user:" 段落，或 <image ... path="..."> 标签），**不要假装看到图片**，必须用脚本把图片交给智谱免费视觉模型识别成文字，再基于文字继续。

## 使用流程

1. 拿到图片绝对路径或 URL：
   - 粘贴的图：从消息里 "Files mentioned by the user:" 段落取路径（如 /var/folders/.../codex-clipboard-xxx.png），或从 <image name=... path="..."> 提取
   - 用户直接给路径/URL：直接用；相对路径基于当前工作目录解析
   - 找不到文件时先搜索，不要编造路径
2. 运行识别脚本：
   ```
   node ~/.codex/skills/glm-vision/scripts/describe-image.js "<图片路径或URL>" [--prompt "具体问题"]
   ```
   - 多张图：一次性传多个路径，或逐张运行并在问题里说明是哪张
   - 想追问细节：加 --prompt，如 --prompt "这个报错信息是什么？"
3. 把脚本输出当作你看到的内容来回答问题；OCR 文字要原样引用，不要转述。
4. 在回复中展示图片：![图片](/绝对路径.png)，并给出识别结果。

## 提示

- 中文提问效果更好；OCR、图表、公式、界面截图、照片描述都直接支持
- 免费模型默认 glm-4.6v-flash；若不可用，用 GLM_VISION_MODEL=glm-4v-flash 重试（同样免费）
- 上传的是视频/音频/PDF：先抽帧/转页为图片（ffmpeg 抽帧、PDF 转 PNG）再识别
- 识别失败：先确认文件存在、key 配置（~/.codex/skills/glm-vision/config.json），再重试
