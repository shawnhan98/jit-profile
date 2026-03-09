import { NextRequest, NextResponse } from "next/server";
import { createZhipuAI } from "@/lib/zhipu";
import { streamText } from "ai";

export async function POST(request: NextRequest) {
  try {
    const { action, content, knowledgePoints, selectedLevels } =
      await request.json();

    const zhipu = createZhipuAI();

    if (action === "extract") {
      // 提取前置知识点
      const result = await streamText({
        model: zhipu.chat("glm-4.7-flash"),
        temperature: 0.3,
        maxTokens: 500,
        prompt: `请分析以下内容，提取1-2个最重要的前置知识点或概念。内容：${content}`,
        system: `你是一个专业的学习分析助手。请从用户提供的内容中，识别出理解该内容所必需的最关键的1-2个前置知识点或概念。

输出格式要求（严格JSON）：
{
  "knowledge_points": [
    {
      "term": "知识点名称",
      "definition": "简短清晰的定义，30字以内"
    }
  ]
}

要求：
1. 选择真正前置、基础的概念
2. 定义要简洁易懂
3. 只返回JSON，不要其他文本`,
      });

      return new Response((await result).toAIStream(), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (action === "explain") {
      const levels = ["unknown", "familiar", "mastered", "skip"];
      const levelLabels = ["完全陌生", "大概听过", "了如指掌", "跳过"];
      const levelDescs = [
        "完全陌生，需要最基础的解释，使用大量类比和实例",
        "大概听过，需要温和的讲解，适当补充背景",
        "了如指掌，可以直接进入核心内容，侧重深度和应用",
        "跳过此知识点，直接分析主要内容",
      ];

      const prompt = knowledgePoints
        .map((kp: any, idx: number) => {
          const level = selectedLevels[idx] || "unknown";
          const levelDesc = levelDescs[levels.indexOf(level)];
          return `知识点：${kp.term}（${kp.definition}）- 用户掌握程度：${levelLabels[levels.indexOf(level)]}，需要${levelDesc}`;
        })
        .join("\n");

      const result = await streamText({
        model: zhipu.chat("glm-4.7-flash"),
        temperature: 0.5,
        maxTokens: 1500,
        prompt: `请根据以下信息，为用户生成个性化的内容解析：

原始内容：${content}

知识点评估：
${prompt}

请生成一个完整的解析，包括：
1. 简短的导入（如果需要）
2. 针对每个知识点，根据用户掌握程度调整讲解深度和方式
3. 对原始内容的分析和解读

要求：
- 语言亲切自然，像老师在对学生讲解
- 对掌握程度低的知识点多用类比和实例
- 对掌握程度高的直接深入
- 跳过的知识点简单带过或不讲
- 整体流畅易读，适当分段`,
        system: `你是一个因材施教的教学专家。根据用户对不同前置知识的掌握程度，动态调整你的讲解风格和深度。目标是让每个用户都能以最适合自己的方式理解内容。`,
      });

      return new Response((await result).toAIStream(), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("API error:", error);

    // 检查是否是智谱速率限制错误
    if (error.message?.includes("429") || error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "服务繁忙，请稍后再试（速率限制）" },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}