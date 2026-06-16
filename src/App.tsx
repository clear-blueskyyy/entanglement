import { useEffect, useRef, useState } from "react";
import PathReveal from "./components/PathReveal";
import { ApiRequestError, createEntanglement, getDailyPair } from "./services/api";
import type { DailyPairResult, EntangleRequest, EntanglementResult } from "./types";

const loadingHints = [
  {
    title: "正在沿着星图校准两端的引力差……",
    detail: "先避开最直白的答案，让两个世界进入同一片暗场。",
  },
  {
    title: "正在绕开最顺手的桥，试着找一条更站得住的暗线……",
    detail: "这一步会故意慢一点，只保留那种能留下现实痕迹的转折。",
  },
  {
    title: "中间那几次真正关键的拐弯，正在被一点点显影出来……",
    detail: "等第一条路彻底收束，再把它递到你手里逐跳点亮。",
  },
] as const;

const loadingStates = ["星图校准中", "暗线显影中", "路径编织中"] as const;

const curatedExamples = [
  ["深海采矿", "韩国大选"],
  ["雨林", "说唱"],
  ["独立电影", "AI Agent"],
];

const orbitBodies = [
  { x: 12, y: 18, size: 11.5, delay: 0.6, duration: 11, tone: "amber", drift: "a" },
  { x: 78, y: 14, size: 14, delay: 1.8, duration: 13, tone: "violet", drift: "b" },
  { x: 62, y: 43, size: 8.8, delay: 0.9, duration: 9, tone: "pearl", drift: "c" },
  { x: 18, y: 66, size: 13.2, delay: 2.4, duration: 14, tone: "cobalt", drift: "b" },
  { x: 84, y: 72, size: 10.8, delay: 0.2, duration: 12, tone: "amber", drift: "c" },
  { x: 40, y: 88, size: 7.4, delay: 1.3, duration: 10, tone: "pearl", drift: "a" },
] as const;

const starNodes = [
  { x: 4, y: 12, size: 1.3, opacity: 0.48, delay: 0.2, tone: "soft" },
  { x: 11, y: 24, size: 1.8, opacity: 0.8, delay: 1.4, tone: "warm" },
  { x: 17, y: 9, size: 1.2, opacity: 0.42, delay: 0.8, tone: "cool" },
  { x: 22, y: 18, size: 2.4, opacity: 0.92, delay: 2.4, tone: "warm" },
  { x: 29, y: 11, size: 1.1, opacity: 0.45, delay: 1.9, tone: "soft" },
  { x: 31, y: 28, size: 1.8, opacity: 0.68, delay: 0.5, tone: "cool" },
  { x: 38, y: 19, size: 2.2, opacity: 0.78, delay: 2.1, tone: "warm" },
  { x: 43, y: 7, size: 1.4, opacity: 0.5, delay: 1.1, tone: "soft" },
  { x: 47, y: 27, size: 1.2, opacity: 0.4, delay: 2.7, tone: "cool" },
  { x: 53, y: 14, size: 2.8, opacity: 0.95, delay: 1.7, tone: "warm" },
  { x: 58, y: 31, size: 1.6, opacity: 0.64, delay: 0.4, tone: "soft" },
  { x: 64, y: 18, size: 1.9, opacity: 0.74, delay: 2.9, tone: "cool" },
  { x: 67, y: 8, size: 1.1, opacity: 0.4, delay: 0.9, tone: "soft" },
  { x: 73, y: 25, size: 2.6, opacity: 0.9, delay: 2.2, tone: "warm" },
  { x: 79, y: 13, size: 1.5, opacity: 0.58, delay: 1.5, tone: "cool" },
  { x: 86, y: 29, size: 2.1, opacity: 0.82, delay: 0.6, tone: "warm" },
  { x: 92, y: 15, size: 1.3, opacity: 0.5, delay: 2.8, tone: "soft" },
  { x: 8, y: 51, size: 1.2, opacity: 0.44, delay: 2.1, tone: "cool" },
  { x: 16, y: 64, size: 2.3, opacity: 0.84, delay: 0.6, tone: "warm" },
  { x: 24, y: 53, size: 1.7, opacity: 0.66, delay: 1.8, tone: "soft" },
  { x: 32, y: 69, size: 1.5, opacity: 0.56, delay: 2.6, tone: "cool" },
  { x: 38, y: 58, size: 2.5, opacity: 0.88, delay: 1.1, tone: "warm" },
  { x: 47, y: 72, size: 1.1, opacity: 0.38, delay: 2.3, tone: "soft" },
  { x: 56, y: 61, size: 1.9, opacity: 0.76, delay: 0.9, tone: "cool" },
  { x: 63, y: 75, size: 2.7, opacity: 0.93, delay: 1.6, tone: "warm" },
  { x: 72, y: 58, size: 1.4, opacity: 0.54, delay: 2.4, tone: "soft" },
  { x: 79, y: 69, size: 2, opacity: 0.7, delay: 1.2, tone: "cool" },
  { x: 88, y: 54, size: 1.6, opacity: 0.64, delay: 2, tone: "warm" },
  { x: 94, y: 73, size: 1.2, opacity: 0.42, delay: 0.7, tone: "soft" },
  { x: 12, y: 86, size: 1.5, opacity: 0.58, delay: 1.3, tone: "cool" },
  { x: 23, y: 93, size: 2.1, opacity: 0.82, delay: 2.5, tone: "warm" },
  { x: 34, y: 83, size: 1.2, opacity: 0.4, delay: 0.4, tone: "soft" },
  { x: 44, y: 91, size: 2.6, opacity: 0.9, delay: 2.2, tone: "warm" },
  { x: 55, y: 85, size: 1.7, opacity: 0.66, delay: 1.5, tone: "cool" },
  { x: 66, y: 94, size: 1.3, opacity: 0.46, delay: 0.8, tone: "soft" },
  { x: 77, y: 88, size: 2.4, opacity: 0.86, delay: 2.7, tone: "warm" },
  { x: 89, y: 95, size: 1.4, opacity: 0.52, delay: 1, tone: "cool" },
] as const;

const starLinks = [
  [0, 1],
  [1, 3],
  [2, 3],
  [3, 6],
  [4, 6],
  [5, 6],
  [6, 9],
  [7, 9],
  [8, 9],
  [9, 11],
  [10, 11],
  [11, 13],
  [12, 13],
  [13, 15],
  [14, 15],
  [15, 16],
  [17, 18],
  [18, 19],
  [19, 21],
  [20, 21],
  [21, 23],
  [22, 23],
  [23, 24],
  [24, 26],
  [25, 26],
  [26, 27],
  [28, 29],
  [29, 30],
  [30, 32],
  [31, 32],
  [32, 34],
  [33, 34],
  [34, 35],
  [35, 36],
  [13, 24],
  [21, 32],
  [6, 21],
  [11, 24],
  [24, 35],
  [18, 30],
] as const;

const previewResult: EntanglementResult = {
  id: "demo_preview",
  termA: "深海采矿",
  termB: "韩国大选",
  createdAt: "2026-05-05T00:00:00.000Z",
  paths: [
    {
      title: "稀土回路",
      hook: "真正把故事拧起来的，不是海底本身，而是谁能把矿产变成芯片里的定价权。",
      surprise: "深海采矿最后碰到的不是海洋伦理，而是韩国年轻人对财阀与就业的情绪。",
      surpriseIndex: 8,
      nodes: [
        {
          term: "海底稀土矿权",
          connectionToNext: "谁掌握新矿源，谁就可能改写高端制造最紧张的原料分布。",
          detail: "深海采矿争夺的不只是金属，而是未来稀土与关键矿物的先手布局。",
        },
        {
          term: "半导体供应链",
          connectionToNext: "一旦关键矿物进入芯片链路，议题就会从资源开发转向产业安全。",
          detail: "半导体制造对稳定原料极度敏感，任何新矿源都会被重新估值。",
        },
        {
          term: "三星财阀",
          connectionToNext: "在韩国，半导体景气最终会折返到财阀评价、就业预期与公众情绪。",
          detail: "三星既是产业象征，也是韩国经济情绪的放大器，任何波动都会被政治化。",
        },
        {
          term: "青年就业焦虑",
          connectionToNext: "当就业与阶层流动被重新点燃，大选叙事就会顺着这股情绪偏转。",
          detail: "韩国年轻选民对机会结构极度敏感，产业焦虑常常会外溢成政治判断。",
        },
      ],
      summary:
        "深海采矿看似是资源与环境话题，但一旦通过稀土进入半导体链条，它就会撞上韩国的财阀结构与青年情绪，最后折返成大选里的现实判断。",
    },
    {
      title: "海运票仓",
      hook: "海底资源并不会直接通向选票，它先经过了一整套港口、航运与城市经济的传导。",
      surprise: "最意外的一跳，是从采矿船队跳到韩国沿海城市的票仓情绪。",
      surpriseIndex: 7,
      nodes: [
        {
          term: "深海工程船",
          connectionToNext: "任何大规模海底开采，都离不开造船、海工装备与维修网络。",
          detail: "深海采矿不是抽象概念，它会直接拉动复杂船舶与海工设备的订单想象。",
        },
        {
          term: "韩国造船业",
          connectionToNext: "当新一轮海工订单被讨论，韩国造船业就会被重新放回国家竞争力叙事里。",
          detail: "韩国长期占据高端造船优势，任何海上资源开发都会被本土产业迅速感知。",
        },
        {
          term: "釜山港经济",
          connectionToNext: "造船、港口与物流就业一旦同步波动，地方城市的政治温度也会升高。",
          detail: "釜山这样的沿海城市，常把国际贸易与本地生活直接绑定在一起。",
        },
        {
          term: "区域发展承诺",
          connectionToNext: "当地方经济成为焦点，候选人就必须回应谁能带来更稳的区域增长。",
          detail: "韩国选举高度重视区域利益，一旦地方增长叙事变化，票仓也会松动。",
        },
      ],
      summary:
        "这条路线不是从资源直接跳到政治，而是让深海采矿经过船舶、港口与地方经济，最后落回韩国选举里最现实的区域发展承诺。",
    },
    {
      title: "气候转身",
      hook: "它先绕进新能源材料，再从产业政策折回韩国选举里的价值排序。",
      surprise: "深海采矿最终会逼人表态：到底把气候正义排在前面，还是把制造业安全排在前面。",
      surpriseIndex: 9,
      nodes: [
        {
          term: "电池关键矿物",
          connectionToNext: "深海采矿一旦被合理化，最先被调用的理由往往是新能源转型缺矿。",
          detail: "镍、钴、锰等矿物会把深海采矿包装成绿色转型的原料前哨。",
        },
        {
          term: "电动车产业政策",
          connectionToNext: "矿物安全被放大后，各国都会把它改写成产业补贴与制造业战略。",
          detail: "新能源竞争不是环保口号，而是补贴、供应链和产业主权的复合战场。",
        },
        {
          term: "韩国制造业选边",
          connectionToNext: "当产业战略与环保价值冲突，候选人就必须明确自己站在哪一边。",
          detail: "韩国政治经常在出口制造与社会价值之间寻找新的平衡叙事。",
        },
        {
          term: "大选议题排序",
          connectionToNext: "议题排序一旦变化，选民看待候选人的方式也会跟着重排。",
          detail: "真正影响投票的，不只是议题存在，而是它在竞选叙事里的先后顺序。",
        },
      ],
      summary:
        "这条路径把深海采矿接到新能源与制造业安全，再逼近韩国大选中的价值排序：气候正义、产业主权、就业稳定，到底谁应该排在最前面。",
    },
  ],
};

const ENTANGLE_CACHE_STORAGE_KEY = "entanglement:result-cache:v1";
const ENTANGLE_CACHE_LIMIT = 12;
const ENTANGLE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const GENERIC_BRIDGE_TERMS = [
  "技术进步",
  "全球化",
  "社会变迁",
  "人类文明",
  "时代发展",
  "经济发展",
  "科技发展",
  "文化交流",
  "国际关系",
] as const;

function makeId(prefix = "local") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

type ErrorState = {
  scope: "entangle" | "dailyPair";
  retryable: boolean;
};

function toClientError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiRequestError) {
    return {
      message: error.message || fallbackMessage,
      retryable: error.retryable,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      retryable: true,
    };
  }

  return {
    message: fallbackMessage,
    retryable: true,
  };
}

function isUsableResult(payload: EntanglementResult) {
  if (!Array.isArray(payload.paths) || payload.paths.length === 0 || payload.paths.length > 3) {
    return false;
  }

  return payload.paths.every(
    (path) =>
      Array.isArray(path.nodes) &&
      path.nodes.length >= 3 &&
      path.nodes.length <= 5 &&
      path.nodes.every((node) => node.term && node.connectionToNext && node.detail)
  );
}

type ResultQuality = {
  weak: boolean;
  note: string;
};

function assessResultQuality(result: EntanglementResult): ResultQuality {
  const genericNodeCount = result.paths.reduce((count, path) => {
    return (
      count +
      path.nodes.filter((node) => GENERIC_BRIDGE_TERMS.some((term) => node.term.includes(term))).length
    );
  }, 0);

  const lowSurprisePathCount = result.paths.filter((path) => path.surpriseIndex < 6).length;

  if (genericNodeCount > 0) {
    return {
      weak: true,
      note: "中间节点里有偏空泛的桥接词",
    };
  }

  if (lowSurprisePathCount === result.paths.length) {
    return {
      weak: true,
      note: "意外指数整体偏低",
    };
  }

  return {
    weak: false,
    note: "",
  };
}

type CachedEntangleEntry = {
  key: string;
  result: EntanglementResult;
  updatedAt: string;
};

function createEntangleCacheKey(termA: string, termB: string) {
  return `${termA.trim().toLowerCase()}::${termB.trim().toLowerCase()}`;
}

function readEntangleCache(): CachedEntangleEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ENTANGLE_CACHE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is CachedEntangleEntry => {
      if (typeof entry !== "object" || entry === null) {
        return false;
      }

      const candidate = entry as Record<string, unknown>;
      return (
        typeof candidate.key === "string" &&
        typeof candidate.updatedAt === "string" &&
        typeof candidate.result === "object" &&
        candidate.result !== null
      );
    });
  } catch {
    return [];
  }
}

function pruneEntangleCache(entries: CachedEntangleEntry[]) {
  const now = Date.now();
  return entries
    .filter((entry) => {
      const updatedAt = Date.parse(entry.updatedAt);
      return Number.isFinite(updatedAt) && now - updatedAt < ENTANGLE_CACHE_TTL_MS && isUsableResult(entry.result);
    })
    .slice(0, ENTANGLE_CACHE_LIMIT);
}

function writeEntangleCache(entries: CachedEntangleEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(ENTANGLE_CACHE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage 写入失败时忽略，不阻断主流程
  }
}

function loadCachedEntanglement(termA: string, termB: string) {
  const entries = pruneEntangleCache(readEntangleCache());
  writeEntangleCache(entries);
  const cacheKey = createEntangleCacheKey(termA, termB);
  return entries.find((entry) => entry.key === cacheKey)?.result ?? null;
}

function saveCachedEntanglement(result: EntanglementResult) {
  if (typeof window === "undefined" || !isUsableResult(result)) {
    return;
  }

  const cacheKey = createEntangleCacheKey(result.termA, result.termB);
  const dedupedEntries = readEntangleCache().filter((entry) => entry.key !== cacheKey);
  const nextEntries = pruneEntangleCache([
    {
      key: cacheKey,
      result,
      updatedAt: new Date().toISOString(),
    },
    ...dedupedEntries,
  ]);

  writeEntangleCache(nextEntries);
}

// 丝滑的 ease-in-out-cubic 缓动 - 开始和结束都柔和，中间加速流畅
function easeInOutCubic(t: number, b: number, c: number, d: number) {
  const normalizedTime = t / d;
  if (normalizedTime < 0.5) {
    // 前半段 - 柔和加速
    return b + c * 4 * normalizedTime * normalizedTime * normalizedTime;
  }
  // 后半段 - 优雅减速
  const et = -2 * normalizedTime + 2;
  return b + c * (1 - Math.pow(et, 3) / 2);
}

function smoothScrollTo(element: HTMLElement, duration: number) {
  const targetPosition = element.getBoundingClientRect().top + window.scrollY - 16;
  const startPosition = window.scrollY;
  const distance = targetPosition - startPosition;
  let startTime: number | null = null;

  function animation(currentTime: number) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;

    // 使用丝滑的 cubic 缓动
    const run = easeInOutCubic(timeElapsed, startPosition, distance, duration);

    // 使用 { top: y } 对象形式，某些浏览器优化更好
    window.scrollTo({ top: run, behavior: 'auto' });

    if (timeElapsed < duration) {
      window.requestAnimationFrame(animation);
    } else {
      window.scrollTo({ top: targetPosition, behavior: 'auto' });
    }
  }
  window.requestAnimationFrame(animation);
}

export default function App() {
  const [termA, setTermA] = useState("");
  const [termB, setTermB] = useState("");
  const [dailyPair, setDailyPair] = useState<DailyPairResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [pairLoading, setPairLoading] = useState(false);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);
  const [error, setError] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [result, setResult] = useState<EntanglementResult | null>(null);
  const [lastEntangleRequest, setLastEntangleRequest] = useState<EntangleRequest | null>(null);
  const [heroHovered, setHeroHovered] = useState(false);
  const resultRef = useRef<HTMLElement | null>(null);
  const heroDecoCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeLoadingHint = loadingHints[loadingHintIndex] ?? loadingHints[0];
  const activeLoadingState = loadingStates[loadingHintIndex] ?? loadingStates[0];
  const canStartEntangle = termA.trim().length > 0 && termB.trim().length > 0;

  useEffect(() => {
    void loadDailyPair();
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadingHintIndex(0);
      return;
    }

    setLoadingHintIndex(0);
    const timer = window.setInterval(() => {
      setLoadingHintIndex((index) => (index + 1) % loadingHints.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (!result || !resultRef.current) {
      return;
    }

    const element = resultRef.current;
    // 延迟一点开始滚动，让结果先渲染出来
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        smoothScrollTo(element, 1600); // 1.6s 慢速推出，更有仪式感
      });
    }, 200);
  }, [result?.id]);

  useEffect(() => {
    const canvas = heroDecoCanvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const colors = ["#E5B76B", "#8CA8FF", "#E2E8F0"] as const;
    const dpr = window.devicePixelRatio || 1;

    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let animationFrame = 0;
    let lastCanvasWidth = 0;
    let lastCanvasHeight = 0;

    type OrbitConfig = {
      orbitRadiusX: number;
      orbitRadiusY: number;
      tiltAngle: number;
      speed: number;
      axisAngle: number;
      axisSpeed: number;
      color: string;
      size: number;
      planetCount: number;
    };

    class Planet {
      orbit: OrbitConfig;
      speed: number;
      color: string;
      baseSize: number;
      angle: number;
      x: number;
      y: number;
      z: number;
      scale: number;
      screenX: number;
      screenY: number;

      constructor(orbit: OrbitConfig) {
        this.orbit = orbit;
        this.speed = orbit.speed * (0.85 + Math.random() * 0.3);
        this.color = orbit.color;
        this.baseSize = orbit.size * (0.78 + Math.random() * 0.55);
        this.angle = Math.random() * Math.PI * 2;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.scale = 1;
        this.screenX = 0;
        this.screenY = 0;
      }

      private projectPoint(angle: number) {
        const flatX = Math.cos(angle) * this.orbit.orbitRadiusX;
        const flatZ = Math.sin(angle) * this.orbit.orbitRadiusY;

        const tiltedY = flatZ * Math.sin(this.orbit.tiltAngle);
        const tiltedZ = flatZ * Math.cos(this.orbit.tiltAngle);

        const axisCos = Math.cos(this.orbit.axisAngle);
        const axisSin = Math.sin(this.orbit.axisAngle);
        const rotatedX = flatX * axisCos - tiltedZ * axisSin;
        const rotatedZ = flatX * axisSin + tiltedZ * axisCos;

        // 使用统一的最小边长来计算，确保星星保持正圆
        const minDimension = Math.min(width, height);
        const focalLength = Math.max(560, minDimension * 2.2);
        const scale = focalLength / (focalLength + rotatedZ);

        // 基于最小边长的统一坐标系，确保比例一致
        const baseCenterX = minDimension * 0.53;
        const baseCenterY = minDimension * 0.54;

        // 居中偏移
        const offsetX = (width - minDimension) / 2;
        const offsetY = (height - minDimension) / 2;

        return {
          x: rotatedX,
          y: tiltedY,
          z: rotatedZ,
          scale,
          screenX: offsetX + baseCenterX + rotatedX * scale,
          screenY: offsetY + baseCenterY + tiltedY * scale,
        };
      }

      update() {
        this.angle += this.speed;
        const point = this.projectPoint(this.angle);
        this.x = point.x;
        this.y = point.y;
        this.z = point.z;
        this.scale = point.scale;
        this.screenX = point.screenX;
        this.screenY = point.screenY;
      }

      draw() {
        const alpha = Math.max(0.08, Math.min(0.52, this.scale * 0.65));
        const currentSize = Math.max(0.12, this.baseSize * this.scale);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 11 * this.scale;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.screenX, this.screenY, currentSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      drawOrbitLine() {
        const sampleCount = 72;

        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.lineWidth = 0.75;
        ctx.beginPath();

        for (let i = 0; i <= sampleCount; i += 1) {
          const theta = (i / sampleCount) * Math.PI * 2;
          const point = this.projectPoint(theta);
          if (i === 0) {
            ctx.moveTo(point.screenX, point.screenY);
          } else {
            ctx.lineTo(point.screenX, point.screenY);
          }
        }

        ctx.stroke();
        ctx.restore();
      }
    }

    const planets: Planet[] = [];
    const orbitConfigs: OrbitConfig[] = [];

    function buildScene() {
      planets.length = 0;
      orbitConfigs.length = 0;

      const minSize = Math.min(width, height);
      const base = minSize * 0.14;

      for (let i = 0; i < 6; i += 1) {
        const orbitRadiusX = base + i * minSize * 0.085;
        const orbitRadiusY = orbitRadiusX * (0.54 + (i % 3) * 0.12);
        const tiltAngle = Math.PI * (0.38 + Math.random() * 0.26);
        const speed = (0.0016 + Math.random() * 0.0022) * (i % 2 === 0 ? 1 : -1);
        const axisSpeed = (0.00045 + Math.random() * 0.00065) * (i % 2 === 0 ? 1 : -1);
        const color = colors[i % colors.length];
        const size = 1.8 + Math.random() * 2.6;
        const planetCount = 1 + (i % 3);

        const orbit = {
          orbitRadiusX,
          orbitRadiusY,
          tiltAngle,
          speed,
          axisAngle: Math.random() * Math.PI * 2,
          axisSpeed,
          color,
          size,
          planetCount,
        };

        orbitConfigs.push(orbit);

        for (let p = 0; p < planetCount; p += 1) {
          planets.push(new Planet(orbit));
        }
      }
    }

    function resizeCanvas() {
      const parent = canvas.parentElement;
      if (!parent) {
        return;
      }

      const nextWidth = Math.floor(parent.clientWidth);
      const nextHeight = Math.floor(parent.clientHeight);

      if (nextWidth < 2 || nextHeight < 2) {
        return;
      }

      if (nextWidth === lastCanvasWidth && nextHeight === lastCanvasHeight) {
        return;
      }

      width = nextWidth;
      height = nextHeight;
      lastCanvasWidth = nextWidth;
      lastCanvasHeight = nextHeight;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      centerX = width * 0.53;
      centerY = height * 0.54;

      buildScene();
    }

    function animate() {
      ctx.fillStyle = "rgba(5, 8, 20, 0.2)";
      ctx.fillRect(0, 0, width, height);

      for (const orbit of orbitConfigs) {
        orbit.axisAngle += orbit.axisSpeed;
      }

      const seenOrbits = new Set<OrbitConfig>();
      for (const planet of planets) {
        if (seenOrbits.has(planet.orbit)) {
          continue;
        }
        seenOrbits.add(planet.orbit);
        planet.drawOrbitLine();
      }

      planets.forEach((planet) => planet.update());
      planets.sort((a, b) => b.z - a.z);
      planets.forEach((planet) => planet.draw());

      animationFrame = window.requestAnimationFrame(animate);
    }

    const onWindowResize = () => {
      resizeCanvas();
    };

    window.addEventListener("resize", onWindowResize);

    resizeCanvas();
    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onWindowResize);
    };
  }, []);

  async function loadDailyPair() {
    try {
      setPairLoading(true);
      setError("");
      setStatusNote("");
      setErrorState(null);
      const response = await getDailyPair(todayLabel());
      setDailyPair(response.data);
      setTermA(response.data.termA);
      setTermB(response.data.termB);
      setResult(null);
    } catch (err) {
      const clientError = toClientError(err, "获取今日配对失败，请稍后再试。");
      setError(clientError.message);
      setErrorState({
        scope: "dailyPair",
        retryable: clientError.retryable,
      });
    } finally {
      setPairLoading(false);
    }
  }

  async function runEntangleRequest(request: EntangleRequest) {
    try {
      setLoading(true);
      setLoadingHintIndex(0);
      setError("");
      setStatusNote("");
      setErrorState(null);
      setLastEntangleRequest(request);

      const response = await createEntanglement(request);
      const payload = response.data;

      if (!isUsableResult(payload)) {
        throw new Error("模型返回结构异常，请重试。");
      }

      const normalizedResult = {
        ...payload,
        id: payload.id || makeId(),
      };

      setResult(normalizedResult);
      saveCachedEntanglement(normalizedResult);

      const quality = assessResultQuality(normalizedResult);
      if (quality.weak) {
        setStatusNote(`已生成路径，但${quality.note}。你可以点“换一条更妙的路径”再试一次。`);
      }
    } catch (err) {
      const cachedResult = loadCachedEntanglement(request.termA, request.termB);
      if (cachedResult) {
        setError("");
        setErrorState(null);
        setResult({
          ...cachedResult,
          id: makeId("cache"),
        });
        setStatusNote(
          request.regenerate
            ? "这次没算出更妙的新路径，先回到你上次成功生成的版本。"
            : "网络不稳，先打开你上次成功生成过的路径。"
        );
        return;
      }

      const clientError = toClientError(err, "请求失败，请稍后再试。");
      setError(clientError.message);
      setErrorState({
        scope: "entangle",
        retryable: clientError.retryable,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleEntangle(regenerate = false) {
    const normalizedA = termA.trim();
    const normalizedB = termB.trim();

    if (!normalizedA || !normalizedB) {
      setError("请先输入两个词，再开始纠缠。");
      setErrorState({
        scope: "entangle",
        retryable: false,
      });
      return;
    }

    if (normalizedA === normalizedB) {
      setError("请输入两个不同的词语，再开始纠缠。");
      setErrorState({
        scope: "entangle",
        retryable: false,
      });
      return;
    }

    if (!regenerate) {
      const cachedResult = loadCachedEntanglement(normalizedA, normalizedB);
      if (cachedResult) {
        setError("");
        setStatusNote("已直接打开你最近一次生成过的路径。");
        setErrorState(null);
        setLastEntangleRequest({
          termA: normalizedA,
          termB: normalizedB,
          regenerate: false,
        });
        setResult({
          ...cachedResult,
          id: makeId("cache"),
        });
        return;
      }
    }

    await runEntangleRequest({
      termA: normalizedA,
      termB: normalizedB,
      regenerate,
    });
  }

  function retryLastAction() {
    if (!errorState?.retryable || loading || pairLoading) {
      return;
    }

    if (errorState.scope === "dailyPair") {
      void loadDailyPair();
      return;
    }

    if (lastEntangleRequest) {
      void runEntangleRequest(lastEntangleRequest);
    }
  }

  function applyExample(exampleA: string, exampleB: string) {
    setTermA(exampleA);
    setTermB(exampleB);
    setResult(null);
    setError("");
    setStatusNote("");
    setErrorState(null);
  }

  function loadPreviewExperience() {
    setTermA(previewResult.termA);
    setTermB(previewResult.termB);
    setResult({
      ...previewResult,
      id: makeId("preview"),
      createdAt: new Date().toISOString(),
    });
    setError("");
    setStatusNote("");
    setErrorState(null);
  }

  function resetExperience() {
    setResult(null);
    setError("");
    setStatusNote("");
    setErrorState(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className={`app shell ${result ? "has-result" : ""}`}>
      <div className="starfield" aria-hidden="true">
        <div className="starfield-grid" />
        <div className="starfield-planets">
          {orbitBodies.map((planet, index) => (
            <div
              key={`orbit_${index}`}
              className={`orbit-body orbit-body-${planet.tone} drift-${planet.drift}`}
              style={{
                left: `${planet.x}%`,
                top: `${planet.y}%`,
                width: `${planet.size}rem`,
                height: `${planet.size}rem`,
                animationDuration: `${planet.duration}s`,
                animationDelay: `-${planet.delay}s`,
              }}
            >
              <span className="orbit-body-halo" />
              <span className="orbit-body-core" />
              <span className="orbit-body-ring" />
            </div>
          ))}
        </div>
        <div className="starfield-vignette" />
        <div className="starfield-film-grain" />
        <svg className="starfield-canvas" viewBox="0 0 100 100" preserveAspectRatio="none">
          {starLinks.map(([from, to], index) => {
            const start = starNodes[from];
            const end = starNodes[to];
            return (
              <line
                key={`link_${from}_${to}`}
                className="star-line"
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                style={{ animationDelay: `${index * 0.12}s` }}
              />
            );
          })}

          {starNodes.map((star, index) => (
            <g
              key={`star_${index}`}
              className={`star-node star-node-${star.tone}`}
              style={{ animationDelay: `${star.delay}s` }}
            >
              <circle
                className="star-halo"
                cx={star.x}
                cy={star.y}
                r={star.size * 1.8}
                opacity={star.opacity * 0.28}
              />
              <circle
                className="star-core"
                cx={star.x}
                cy={star.y}
                r={star.size}
                opacity={star.opacity}
              />
            </g>
          ))}
        </svg>
      </div>

      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <div className="container page-stack">
        <section
          className={`card card-hero ${result ? "hero-condensed" : ""} ${heroHovered ? "hero-hovered" : ""}`}
          onMouseEnter={() => setHeroHovered(true)}
          onMouseLeave={() => setHeroHovered(false)}
        >
          <div className="hero-copy">
            <div className="brand-lockup">
              <p className="brand-en">ENTANGLEMENT</p>
              <h1 className="brand-cn">纠缠</h1>
              <p className="brand-tagline">万物皆有暗线</p>
            </div>

            <p className="subtitle hero-subtitle">
              输入两个真实存在、却彼此很远的词。它不会立刻给你答案，而是把中间那条看不见的暗线，
              设计成一段值得你亲手点亮的路径。
            </p>

            <div className="hero-intent">
              <div className="intent-pill">碎片时间的智性消遣</div>
              <div className="intent-pill">像杂志封面一样克制</div>
              <div className="intent-pill">逐跳揭示，而非一次摊平</div>
            </div>

            <div className="hero-deco" aria-hidden="true">
              <div className="hero-deco-stage">
                <canvas ref={heroDecoCanvasRef} className="hero-deco-canvas" />
              </div>
            </div>
          </div>

          <div className="hero-stage">
            <div className="hero-stage-header">
              <div>
                <div className="section-kicker">Pair Builder</div>
                <h2 className="section-title">先抛出一对词，再看它们会不会在星图里连上。</h2>
              </div>
              <div className="hero-utility">
                <button className="button secondary subtle" disabled={pairLoading} onClick={loadDailyPair}>
                  {pairLoading ? "拾取中..." : dailyPair ? "换一组今日推荐" : "获取今日推荐"}
                </button>
                <button className="button ghost subtle button-ghost-lit" type="button" onClick={loadPreviewExperience}>
                  <span className="ghost-btn-icon" aria-hidden="true">✦</span>
                  先看示例路径
                </button>
              </div>
            </div>

            <div className="pair-composer">
              <div className="pair-composer-shell">
                <span className="pair-composer-orbit pair-composer-orbit-left" aria-hidden="true" />
                <span className="pair-composer-orbit pair-composer-orbit-right" aria-hidden="true" />

                <div className="pair-input-shell">
                  <div className="input-group">
                    <label className="input-label">词 A</label>
                    <input
                      className="input input-large"
                      value={termA}
                      onChange={(event) => setTermA(event.target.value)}
                      placeholder="比如：深海采矿"
                      maxLength={32}
                    />
                  </div>

                  <div className="pair-sigil" aria-hidden="true">
                    <span>↔</span>
                  </div>

                  <div className="input-group">
                    <label className="input-label">词 B</label>
                    <input
                      className="input input-large"
                      value={termB}
                      onChange={(event) => setTermB(event.target.value)}
                      placeholder="比如：韩国大选"
                      maxLength={32}
                    />
                  </div>
                </div>

                <div className="pair-guides">
                  <span className="guide-pill">越具体，路径越容易长出质感</span>
                  <span className="guide-pill">别用同类词，尽量拉开语境</span>
                  <span className="guide-pill">两个词都带现实重量，通常会更妙</span>
                </div>
              </div>
            </div>

            <div className="hero-actions">
              <button
                className={`button button-large primary-action ${loading ? "is-loading" : ""}`}
                disabled={loading || !canStartEntangle}
                onClick={() => void handleEntangle(false)}
                aria-busy={loading}
              >
                <span className="button-label">{loading ? "正在纠缠" : "开始纠缠"}</span>
                <span className="button-note">{loading ? activeLoadingState : "Reveal the hidden route"}</span>
                <span className="button-breath" aria-hidden="true" />
              </button>
            </div>

            <div className="recommend-stack">
              <div className="recommend-section">
                <div className="recommend-label-row">
                  <span className="stage-label">今日推荐</span>
                  {dailyPair ? (
                    <button
                      type="button"
                      className="recommend-pill recommend-pill-primary"
                      onClick={() => applyExample(dailyPair.termA, dailyPair.termB)}
                    >
                      <span>{dailyPair.termA}</span>
                      <span className="recommend-separator">↔</span>
                      <span>{dailyPair.termB}</span>
                    </button>
                  ) : (
                    <span className="recommend-note">给你一对可以立刻上手的起点。</span>
                  )}
                </div>
              </div>

              <div className="recommend-section">
                <div className="recommend-label-row">
                  <span className="stage-label">也可以从这些开始</span>
                </div>
                <div className="example-list">
                  {curatedExamples.map(([exampleA, exampleB]) => (
                    <button
                      key={`${exampleA}_${exampleB}`}
                      type="button"
                      className="example-chip"
                      onClick={() => applyExample(exampleA, exampleB)}
                    >
                      <span>{exampleA}</span>
                      <span className="example-separator">↔</span>
                      <span>{exampleB}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`status-stack ${loading ? "loading-mode" : ""}`}>
              {loading ? (
                <div className="loading-status-card" aria-live="polite">
                  <div className="loading-status-top">
                    <span className="status-beacon" />
                    <span className="loading-kicker">{activeLoadingState}</span>
                  </div>
                  <p key={`loading_title_${loadingHintIndex}`} className="status hero-status loading-copy">
                    {activeLoadingHint.title}
                  </p>
                  <p key={`loading_detail_${loadingHintIndex}`} className="loading-subcopy">
                    {activeLoadingHint.detail}
                  </p>
                </div>
              ) : (
                <p className={`status hero-status ${error ? "error" : ""}`}>
                  {error || statusNote || "先点亮第一跳，再决定这条路径值不值得继续走下去。"}
                </p>
              )}

              {error ? (
                <div className="status-actions">
                  {errorState?.retryable ? (
                    <button type="button" className="button secondary subtle" onClick={retryLastAction}>
                      {errorState.scope === "dailyPair" ? "重试获取今日推荐" : "重试生成路径"}
                    </button>
                  ) : null}

                  {errorState?.scope === "entangle" && !result ? (
                    <button type="button" className="button ghost subtle" onClick={loadPreviewExperience}>
                      先看示例路径
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {result ? (
          <section ref={resultRef} className="card result-shell result-shell-active">
            <div className="result-head">
              <div>
                <div className="section-kicker">Constellation</div>
                <h2 className="section-title result-title">
                  <span>{result.termA}</span>
                  <span className="result-divider">⟷</span>
                  <span>{result.termB}</span>
                </h2>
              </div>
              <p className="panel-note result-note">
                别急着看结论。每点亮一跳，都是一次把两个世界重新缝回同一张图的机会。
              </p>
            </div>

            <PathReveal result={result} onResetExperience={resetExperience} />
          </section>
        ) : (
          <section className="card empty-state empty-state-constellation">
            <div className="empty-state-header">
              <div>
                <div className="section-kicker">How It Feels</div>
                <h2 className="section-title">它不是答案页，而是一场被慢慢揭开的路径体验。</h2>
              </div>
              <p className="empty-copy empty-lead">
                输入只是起点，真正的乐趣在于看见一条本来不该连上的现实链路，如何被你一点点点亮。
              </p>
            </div>

            <div className="empty-state-stage">
              <div className="ritual-grid">
                <article className="ritual-card">
                  <span className="ritual-index">01</span>
                  <h3>抛出一对词</h3>
                  <p>首页先像一道入口，让你把两个遥远的世界丢进来，看看它们会不会开始彼此靠近。</p>
                </article>
                <article className="ritual-card">
                  <span className="ritual-index">02</span>
                  <h3>一跳一跳揭示</h3>
                  <p>中间的节点不会一次摊平，而是由你主动点击，把最关键的那几次拐弯慢慢点亮。</p>
                </article>
                <article className="ritual-card">
                  <span className="ritual-index">03</span>
                  <h3>最后才亮出全貌</h3>
                  <p>当所有节点都被点亮，页面才把整条路径收束成一句真正成立的概览，而不是草率结论。</p>
                </article>
              </div>

              <aside className="empty-state-aside">
                <div className="empty-orbit" aria-hidden="true">
                  <span className="empty-orbit-core" />
                  <span className="empty-orbit-ring empty-orbit-ring-a" />
                  <span className="empty-orbit-ring empty-orbit-ring-b" />
                </div>
                <p className="empty-aside-copy">
                  好的第一页，不像表单，更像一道仪式入口：你把两个词扔进去，等它自己长出一幅星图。
                </p>
              </aside>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}