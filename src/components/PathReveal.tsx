import { useEffect, useRef, useState } from "react";
import type { EntanglementResult } from "../types";

type PathRevealProps = {
  result: EntanglementResult;
  onResetExperience?: () => void;
};

function surpriseLabel(value: number) {
  if (value >= 9) return "高能";
  if (value >= 7) return "够妙";
  if (value >= 5) return "有点意思";
  return "偏稳";
}

function sanitizeFileName(input: string) {
  return input.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("生成分享卡片失败，请稍后重试。"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const paragraphs = text.split(/\n+/).filter((paragraph) => paragraph.trim().length > 0);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    let current = "";
    for (const char of paragraph) {
      const candidate = `${current}${char}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) {
          lines.push(current);
        }
        current = char;
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  const clippedLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && clippedLines.length > 0) {
    const lastIndex = clippedLines.length - 1;
    clippedLines[lastIndex] = `${clippedLines[lastIndex].slice(0, Math.max(0, clippedLines[lastIndex].length - 1))}…`;
  }

  clippedLines.forEach((line, index) => {
    ctx.fillText(line, x, startY + index * lineHeight);
  });

  return startY + clippedLines.length * lineHeight;
}

export default function PathReveal({ result, onResetExperience }: PathRevealProps) {
  const [activePathIndex, setActivePathIndex] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const [finalEdgeRevealed, setFinalEdgeRevealed] = useState(false);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const [ceremonyActive, setCeremonyActive] = useState(false);
  const [isExportingShare, setIsExportingShare] = useState(false);
  const [shareError, setShareError] = useState("");
  const revealTimerRef = useRef<number | null>(null);

  const activePath = result.paths[activePathIndex];
  const totalMiddleCount = activePath?.nodes.length ?? 0;
  const isComplete = totalMiddleCount > 0 && revealedCount >= totalMiddleCount && finalEdgeRevealed;
  const isRevealing = pulseIndex !== null;

  useEffect(() => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }

    setActivePathIndex(0);
    setRevealedCount(0);
    setFinalEdgeRevealed(false);
    setSelectedNodeIndex(null);
    setPulseIndex(null);
    setCeremonyActive(false);
  }, [result.id]);

  useEffect(() => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }

    setRevealedCount(0);
    setFinalEdgeRevealed(false);
    setSelectedNodeIndex(null);
    setPulseIndex(null);
    setCeremonyActive(false);
  }, [activePathIndex]);

  useEffect(() => {
    if (!isComplete) {
      setCeremonyActive(false);
      return;
    }

    setCeremonyActive(true);
  }, [isComplete]);

  useEffect(() => {
    setShareError("");
  }, [result.id, activePathIndex]);

  const selectedNode =
    selectedNodeIndex !== null ? activePath?.nodes[selectedNodeIndex] ?? null : null;
  const nextNode = activePath?.nodes[revealedCount] ?? null;

  useEffect(() => {
    return () => {
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  if (!activePath) {
    return null;
  }

  function handleRevealNext() {
    if (isRevealing) {
      return;
    }

    // 第5次点击：所有中间节点已揭示，激活终点连线
    if (revealedCount >= totalMiddleCount && !finalEdgeRevealed) {
      setFinalEdgeRevealed(true);
      return;
    }

    if (revealedCount >= totalMiddleCount) {
      return;
    }

    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }

    const nextIndex = revealedCount;
    setPulseIndex(nextIndex);
    revealTimerRef.current = window.setTimeout(() => {
      setRevealedCount((count) => Math.min(count + 1, totalMiddleCount));
      setSelectedNodeIndex(nextIndex);
      setPulseIndex(null);
      revealTimerRef.current = null;
    }, 420);
  }

  function handleResetPath() {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }

    setRevealedCount(0);
    setFinalEdgeRevealed(false);
    setSelectedNodeIndex(null);
    setPulseIndex(null);
    setCeremonyActive(false);
  }

  async function handleDownloadShareCard() {
    try {
      setIsExportingShare(true);
      setShareError("");

      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("当前环境不支持分享卡片生成。请换个浏览器重试。");
      }

      const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
      gradient.addColorStop(0, "#07080f");
      gradient.addColorStop(0.5, "#0b1026");
      gradient.addColorStop(1, "#07080f");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1200, 630);

      const halo = ctx.createRadialGradient(250, 140, 30, 250, 140, 340);
      halo.addColorStop(0, "rgba(212, 168, 83, 0.24)");
      halo.addColorStop(1, "rgba(212, 168, 83, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, 1200, 630);

      roundedRectPath(ctx, 64, 56, 1072, 518, 28);
      ctx.fillStyle = "rgba(10, 16, 28, 0.88)";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(212, 168, 83, 0.24)";
      ctx.stroke();

      ctx.fillStyle = "#d4a853";
      ctx.font = '500 26px "Playfair Display", "Times New Roman", serif';
      ctx.fillText("ENTANGLEMENT", 120, 130);

      ctx.fillStyle = "#f0ece6";
      ctx.font = '700 64px "Noto Serif SC", "Songti SC", serif';
      ctx.fillText("纠缠", 120, 210);

      ctx.fillStyle = "#9ca3af";
      ctx.font = '500 26px "Inter", "PingFang SC", sans-serif';
      ctx.fillText("万物皆有暗线", 120, 252);

      ctx.fillStyle = "#f0ece6";
      ctx.font = '700 44px "Noto Serif SC", "Songti SC", serif';
      ctx.fillText(`${result.termA}  ⟷  ${result.termB}`, 120, 336);

      ctx.fillStyle = "#d4a853";
      ctx.font = '600 30px "Noto Serif SC", "Songti SC", serif';
      ctx.fillText(`路径：${activePath.title}`, 120, 390);

      ctx.fillStyle = "#b0ada6";
      ctx.font = '500 24px "Inter", "PingFang SC", sans-serif';
      const endY = drawWrappedText(ctx, activePath.summary, 120, 438, 960, 38, 4);

      ctx.fillStyle = "rgba(212, 168, 83, 0.2)";
      ctx.fillRect(120, Math.min(endY + 12, 540), 960, 1);

      ctx.fillStyle = "#9ca3af";
      ctx.font = '500 20px "Inter", "PingFang SC", sans-serif';
      const generatedAt = new Date().toLocaleString("zh-CN", { hour12: false });
      ctx.fillText(`Generated at ${generatedAt}`, 120, 564);
      ctx.fillText(`Surprise Index ${activePath.surpriseIndex}/10 · ${surpriseLabel(activePath.surpriseIndex)}`, 760, 564);

      const blob = await canvasToBlob(canvas);
      const fileName = `${sanitizeFileName(result.termA)}-${sanitizeFileName(result.termB)}-${new Date()
        .toISOString()
        .slice(0, 10)}.png`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `entanglement-${fileName}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成分享卡片失败，请稍后重试。";
      setShareError(message);
    } finally {
      setIsExportingShare(false);
    }
  }

  return (
    <section className={`path-visual-wrapper ${ceremonyActive ? "ceremony-active" : ""}`}>
      <div className="path-meta-grid">
        <article className="insight-card insight-card-primary">
          <div className="insight-label">路线标题</div>
          <h3 className="insight-title">{activePath.title}</h3>
          <p className="insight-copy">{activePath.hook}</p>
        </article>

        <article className="insight-card insight-card-secondary">
          <div className="insight-label">意外指数</div>
          <div className="surprise-meter-row">
            <strong className="surprise-score">{activePath.surpriseIndex}</strong>
            <span className="surprise-tag">{surpriseLabel(activePath.surpriseIndex)}</span>
          </div>
          <div className="surprise-meter" aria-hidden="true">
            <span style={{ width: `${activePath.surpriseIndex * 10}%` }} />
          </div>
          <p className="insight-copy">{activePath.surprise}</p>
        </article>
      </div>

      {result.paths.length > 1 ? (
        <div className="path-tabs">
          {result.paths.map((path, index) => (
            <button
              key={`${result.id}_tab_${index}`}
              type="button"
              className={`path-tab ${index === activePathIndex ? "active" : ""}`}
              onClick={() => setActivePathIndex(index)}
            >
              路径 {index + 1}
              <span className="path-tab-subtitle">{path.title}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="path-stage">
        <div className="path-stage-head">
          <div>
            <div className="section-kicker">Reveal Ritual</div>
            <h3 className="stage-title">每次只揭开一跳，让中间那条暗线慢慢长出来。</h3>
          </div>
          <div className="path-controls compact">
            <button
              type="button"
              className="button"
              onClick={handleRevealNext}
              disabled={isComplete || isRevealing}
            >
              {revealedCount < totalMiddleCount
                ? `揭示下一跳（${revealedCount}/${totalMiddleCount}）`
                : !finalEdgeRevealed
                  ? "点亮终点连线"
                  : "整条路径已经点亮"}
            </button>

            <button
              type="button"
              className="button secondary"
              disabled={revealedCount === 0}
              onClick={handleResetPath}
            >
              收起重看
            </button>
          </div>
        </div>

        <div className="constellation-shell">
          <div className="constellation-track" aria-live="polite">
            <div className="constellation-node constellation-node-anchor start">
              <span className="node-glow" />
              <span className="node-text">{result.termA}</span>
            </div>

            {activePath.nodes.map((node, index) => {
              const revealed = index < revealedCount;
              const selected = selectedNodeIndex === index;
              const pulsing = pulseIndex === index;

              return (
                <div key={`${result.id}_slot_${index}`} className="constellation-slot">
                  <div className={`constellation-edge ${revealed || pulsing ? "active" : ""}`}>
                    <span className={`edge-line ${ceremonyActive ? "edge-line-ceremony" : ""}`} />
                    <span className={`edge-particle ${pulsing ? "traveling" : ""}`} />
                    <span className="edge-copy">{node.connectionToNext}</span>
                  </div>

                  {revealed ? (
                    <button
                      type="button"
                      className={`constellation-node middle revealed-node ${selected ? "selected" : ""} ${
                        ceremonyActive ? "ceremony-node" : ""
                      }`}
                      style={{ animationDelay: `${index * 0.24}s` }}
                      onClick={() => setSelectedNodeIndex((prev) => (prev === index ? null : index))}
                    >
                      <span className="node-glow" />
                      <span className="node-text">{node.term}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`constellation-node constellation-node-hidden ${pulsing ? "incoming" : ""}`}
                      onClick={handleRevealNext}
                      disabled={isRevealing || index !== revealedCount}
                      aria-label={`揭示第 ${index + 1} 个中间节点`}
                    >
                      <span className="node-glow" />
                      <span className="node-text">?</span>
                    </button>
                  )}
                </div>
              );
            })}

            <div className={`constellation-edge ${finalEdgeRevealed ? "active" : ""}`}>
              <span className={`edge-line ${ceremonyActive ? "edge-line-ceremony" : ""}`} />
              <span className="edge-copy">
                {activePath.nodes[activePath.nodes.length - 1]?.connectionToNext || "最后一跳把故事收回终点"}
              </span>
            </div>

            <div className={`constellation-node constellation-node-anchor end ${ceremonyActive ? "ceremony-node" : ""}`}>
              <span className="node-glow" />
              <span className="node-text">{result.termB}</span>
            </div>
          </div>

          <div className="reveal-sidecar">
            <article className="path-card reveal-card reveal-card-primary">
              <div className="insight-label">当前状态</div>
              {nextNode && !isComplete ? (
                <>
                  <p className="path-summary">下一跳还藏着：{nextNode.term.length <= 8 ? "一个关键转折" : "新的线索"}</p>
                  <p className="path-detail">
                    点击一次，只揭开一个节点。好的路径不是一下子看懂，而是每一步都能让你重新判断它到底妙不妙。
                  </p>
                </>
              ) : (
                <>
                  <p className="path-summary">整条路径已经收束完成。</p>
                  <p className="path-detail">
                    现在可以回头检查这条路线最妙的地方，是哪一次看似偏航、实际上把终点拉近的转折。
                  </p>
                </>
              )}
            </article>

            {selectedNode ? (
              <article className="path-card detail-card">
                <div className="insight-label">当前节点</div>
                <p className="path-summary">{selectedNode.term}</p>
                <p className="path-detail">{selectedNode.detail}</p>
              </article>
            ) : (
              <article className="path-card detail-card muted-card">
                <div className="insight-label">节点解释</div>
                <p className="path-detail">点亮后的任意节点都可以展开。这里应该像编辑批注一样，把这一步为什么成立说清楚。</p>
              </article>
            )}
          </div>
        </div>
      </div>

      {ceremonyActive ? (
        <div className="finale-shell">
          <article className="path-card finale-summary-card">
            <div className="insight-label">路径概览</div>
            <p className="path-detail summary-text">{activePath.summary}</p>
          </article>

          <div className="finale-actions">
            {result.paths.length > 1 ? (
              <button
                type="button"
                className="button"
                onClick={() => setActivePathIndex((index) => (index + 1) % result.paths.length)}
              >
                再看一条路
              </button>
            ) : null}
            <button
              type="button"
              className="button secondary"
              disabled={isExportingShare}
              onClick={() => void handleDownloadShareCard()}
            >
              {isExportingShare ? "生成中..." : "下载分享卡片"}
            </button>
            <button type="button" className="button secondary" onClick={onResetExperience}>
              换一对试试
            </button>
          </div>
          {shareError ? <p className="path-share-error">{shareError}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
