/**
 * stream.ts — 流式 JSON path 对象提取工具
 *
 * 职责：从 LLM 流式输出的文本 chunk 中，逐步检测并提取完整的 path 对象。
 *
 * 输入 JSON 形状：{"paths":[{...path1...},{...path2...}]}
 * 检测策略：括号深度计数法
 *   - 深度从 0 开始
 *   - 遇到 `{` 时 +1；遇到 `}` 时 -1
 *   - 字符串内的括号不计数（正确处理转义引号 \"）
 *   - 深度从 1 升到 2 → 开始一个 path 对象（记录 buffer 起始索引）
 *   - 深度从 2 降到 1 → 该 path 对象完整，提取并重置
 */

export class PathStreamExtractor {
  // 累积收到的全部文本
  private buffer = "";
  // 当前括号嵌套深度
  private depth = 0;
  // 是否处于 JSON 字符串内部
  private inString = false;
  // 是否处于转义字符后（即刚读到 `\`）
  private escape = false;
  // 当前正在收集的 path 对象在 buffer 中的起始索引；-1 表示尚未开始
  private pathStart = -1;

  /**
   * 向提取器喂入一个新 chunk，返回本批次发现的完整 path 对象 JSON 字符串（0 或多个）。
   */
  feed(chunk: string): string[] {
    const completed: string[] = [];

    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      this.buffer += ch;

      // 处于转义状态：跳过当前字符，清除转义标记
      if (this.escape) {
        this.escape = false;
        continue;
      }

      // 字符串内遇到 `\`：下一个字符是转义字符
      if (ch === "\\" && this.inString) {
        this.escape = true;
        continue;
      }

      // 引号切换字符串状态
      if (ch === '"') {
        this.inString = !this.inString;
        continue;
      }

      // 字符串内的括号不参与深度计数
      if (this.inString) continue;

      if (ch === "{") {
        this.depth++;
        if (this.depth === 2) {
          // 进入 path 对象：记录该 `{` 在 buffer 中的位置
          this.pathStart = this.buffer.length - 1;
        }
      } else if (ch === "}") {
        if (this.depth === 2 && this.pathStart !== -1) {
          // path 对象完整：从 pathStart 到当前位置（含 `}`）
          const pathJson = this.buffer.slice(this.pathStart);
          completed.push(pathJson);
          this.pathStart = -1;
        }
        this.depth--;
      }
    }

    return completed;
  }

  /** 返回截至目前的全部累积文本（用于流结束后的兜底解析）。 */
  getAccumulated(): string {
    return this.buffer;
  }

  /** 重置所有状态（用于多轮复用）。 */
  reset(): void {
    this.buffer = "";
    this.depth = 0;
    this.inString = false;
    this.escape = false;
    this.pathStart = -1;
  }
}
