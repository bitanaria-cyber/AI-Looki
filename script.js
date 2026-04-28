const imageInput = document.querySelector("#imageInput");
const dropZone = document.querySelector("#dropZone");
const listingText = document.querySelector("#listingText");
const analyzeButton = document.querySelector("#analyzeButton");
const resetButton = document.querySelector("#resetButton");
const previewImage = document.querySelector("#previewImage");
const previewBox = document.querySelector(".preview-box");
const previewMeta = document.querySelector("#previewMeta");
const resultBadge = document.querySelector("#resultBadge");
const riskRing = document.querySelector("#riskRing");
const riskValue = document.querySelector("#riskValue");
const resultTitle = document.querySelector("#resultTitle");
const resultSummary = document.querySelector("#resultSummary");
const meterFill = document.querySelector("#meterFill");
const reasonList = document.querySelector("#reasonList");
const metricGrid = document.querySelector("#metricGrid");

const state = {
  file: null,
  bytes: null,
  image: null,
  objectUrl: null
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const toPercent = (value) => `${Math.round(clamp(value, 0, 100))}%`;

imageInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) {
    loadImageFile(file);
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("is-dragging");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");

  const [file] = event.dataTransfer.files;
  if (file && file.type.startsWith("image/")) {
    imageInput.files = event.dataTransfer.files;
    loadImageFile(file);
  }
});

analyzeButton.addEventListener("click", () => {
  if (!state.file || !state.image) {
    return;
  }

  analyzeButton.disabled = true;
  resultBadge.textContent = "분석 중";
  resultBadge.className = "verdict-badge neutral";
  resultTitle.textContent = "이미지 신호를 계산하고 있습니다";
  resultSummary.textContent = "노이즈, 압축 경계, 반복 패턴, 메타데이터를 분석합니다.";

  window.setTimeout(() => {
    const result = analyzeImage(state.image, state.file, state.bytes, listingText.value);
    renderResult(result);
    analyzeButton.disabled = false;
  }, 80);
});

resetButton.addEventListener("click", () => {
  imageInput.value = "";
  listingText.value = "";
  state.file = null;
  state.bytes = null;
  state.image = null;

  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = null;
  }

  previewImage.removeAttribute("src");
  previewBox.classList.remove("has-image");
  previewMeta.textContent = "선택된 이미지가 없습니다.";
  analyzeButton.disabled = true;
  renderEmptyResult();
});

async function loadImageFile(file) {
  if (!file.type.startsWith("image/")) {
    previewMeta.textContent = "이미지 파일만 분석할 수 있습니다.";
    return;
  }

  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
  }

  state.file = file;
  state.bytes = await file.arrayBuffer();
  state.objectUrl = URL.createObjectURL(file);

  const image = new Image();
  image.onload = () => {
    state.image = image;
    previewImage.src = state.objectUrl;
    previewBox.classList.add("has-image");
    previewMeta.textContent = `${file.name} · ${image.naturalWidth}×${image.naturalHeight}px · ${formatBytes(file.size)}`;
    analyzeButton.disabled = false;
    renderEmptyResult("이미지가 준비되었습니다", "분석 실행을 누르면 위험 점수를 계산합니다.");
  };
  image.onerror = () => {
    previewMeta.textContent = "이미지를 읽을 수 없습니다.";
    analyzeButton.disabled = true;
  };
  image.src = state.objectUrl;
}

function analyzeImage(image, file, bytes, description) {
  const canvas = document.createElement("canvas");
  const maxSide = 640;
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const signals = calculateSignals(imageData, bytes, file, description);
  const score = clamp(
    signals.metadata.score +
      signals.block.score +
      signals.noise.score +
      signals.edge.score +
      signals.repetition.score +
      signals.description.score,
    0,
    100
  );

  return {
    score: Math.round(score),
    verdict: getVerdict(score),
    signals
  };
}

function calculateSignals(imageData, bytes, file, description) {
  const { data, width, height } = imageData;
  const total = width * height;
  const gray = new Float32Array(total);
  const saturation = new Float32Array(total);

  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    gray[pixel] = 0.299 * r + 0.587 * g + 0.114 * b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    saturation[pixel] = max === 0 ? 0 : (max - min) / max;
  }

  const gradient = calculateGradient(gray, width, height);
  const block = calculateBlockArtifacts(gray, width, height);
  const texture = calculateTexture(gray, saturation, width, height, gradient);
  const repetition = calculateRepetition(gray, width, height);
  const metadata = calculateMetadataScore(bytes, file);
  const descriptionScore = calculateDescriptionScore(description, texture, gradient);

  return {
    metadata,
    block,
    noise: texture.noise,
    edge: texture.edge,
    repetition,
    description: descriptionScore
  };
}

function calculateGradient(gray, width, height) {
  let sum = 0;
  let strong = 0;
  let flat = 0;
  let count = 0;
  let laplacianSum = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx =
        -gray[i - width - 1] -
        2 * gray[i - 1] -
        gray[i + width - 1] +
        gray[i - width + 1] +
        2 * gray[i + 1] +
        gray[i + width + 1];
      const gy =
        -gray[i - width - 1] -
        2 * gray[i - width] -
        gray[i - width + 1] +
        gray[i + width - 1] +
        2 * gray[i + width] +
        gray[i + width + 1];
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const laplacian = Math.abs(
        4 * gray[i] -
          gray[i - 1] -
          gray[i + 1] -
          gray[i - width] -
          gray[i + width]
      );

      sum += magnitude;
      laplacianSum += laplacian;
      strong += magnitude > 95 ? 1 : 0;
      flat += magnitude < 7 ? 1 : 0;
      count += 1;
    }
  }

  return {
    mean: sum / count,
    strongRatio: strong / count,
    flatRatio: flat / count,
    laplacianMean: laplacianSum / count
  };
}

function calculateBlockArtifacts(gray, width, height) {
  let boundary = 0;
  let inside = 0;
  let boundaryCount = 0;
  let insideCount = 0;

  for (let y = 1; y < height; y += 1) {
    for (let x = 1; x < width; x += 1) {
      const i = y * width + x;
      const verticalDiff = Math.abs(gray[i] - gray[i - 1]);
      const horizontalDiff = Math.abs(gray[i] - gray[i - width]);

      if (x % 8 === 0) {
        boundary += verticalDiff;
        boundaryCount += 1;
      } else if (x % 8 === 4) {
        inside += verticalDiff;
        insideCount += 1;
      }

      if (y % 8 === 0) {
        boundary += horizontalDiff;
        boundaryCount += 1;
      } else if (y % 8 === 4) {
        inside += horizontalDiff;
        insideCount += 1;
      }
    }
  }

  const boundaryMean = boundary / Math.max(1, boundaryCount);
  const insideMean = inside / Math.max(1, insideCount);
  const ratio = boundaryMean / Math.max(1, insideMean);
  const score = clamp((ratio - 1.14) * 58, 0, 20);

  return {
    label: "압축 흔적",
    score,
    value: ratio,
    display: `${ratio.toFixed(2)}x`,
    reason:
      score > 8
        ? "8픽셀 단위 압축 경계가 강해 재저장 또는 편집 흔적 가능성이 있습니다."
        : ""
  };
}

function calculateTexture(gray, saturation, width, height, gradient) {
  const tileSize = 32;
  const tileNoise = [];
  let saturationSum = 0;

  for (let i = 0; i < saturation.length; i += 1) {
    saturationSum += saturation[i];
  }

  for (let y = 1; y < height - tileSize - 1; y += tileSize) {
    for (let x = 1; x < width - tileSize - 1; x += tileSize) {
      let sum = 0;
      let count = 0;

      for (let ty = 0; ty < tileSize; ty += 2) {
        for (let tx = 0; tx < tileSize; tx += 2) {
          const i = (y + ty) * width + x + tx;
          const laplacian = Math.abs(
            4 * gray[i] -
              gray[i - 1] -
              gray[i + 1] -
              gray[i - width] -
              gray[i + width]
          );
          sum += laplacian;
          count += 1;
        }
      }

      tileNoise.push(sum / Math.max(1, count));
    }
  }

  const meanNoise =
    tileNoise.reduce((sum, value) => sum + value, 0) / Math.max(1, tileNoise.length);
  const noiseVariance =
    tileNoise.reduce((sum, value) => sum + (value - meanNoise) ** 2, 0) /
    Math.max(1, tileNoise.length);
  const noiseCv = Math.sqrt(noiseVariance) / Math.max(1, meanNoise);
  const saturationMean = saturationSum / Math.max(1, saturation.length);

  const smoothScore = clamp((gradient.flatRatio - 0.52) * 48 + (9 - meanNoise) * 1.2, 0, 18);
  const inconsistencyScore = clamp((noiseCv - 0.78) * 28, 0, 18);
  const edgeScore = clamp(
    (gradient.strongRatio - 0.12) * 52 + (saturationMean - 0.42) * 16,
    0,
    14
  );

  return {
    noise: {
      label: "노이즈 균일도",
      score: clamp(smoothScore + inconsistencyScore, 0, 30),
      value: noiseCv,
      display: `${Math.round(clamp((smoothScore + inconsistencyScore) * 3.3, 0, 100))}%`,
      reason:
        smoothScore > 8
          ? "넓은 영역이 지나치게 매끈해 생성형 이미지 또는 보정 흔적을 확인할 필요가 있습니다."
          : inconsistencyScore > 8
            ? "영역별 노이즈 강도가 달라 부분 합성이나 국소 보정 가능성이 있습니다."
            : ""
    },
    edge: {
      label: "경계선 자연도",
      score: edgeScore,
      value: gradient.strongRatio,
      display: `${Math.round(gradient.strongRatio * 100)}%`,
      reason:
        edgeScore > 7
          ? "강한 경계선과 채도 변화가 많아 상품 윤곽의 편집 여부를 확인해야 합니다."
          : ""
    }
  };
}

function calculateRepetition(gray, width, height) {
  const tileSize = 24;
  const tiles = [];

  for (let y = 0; y < height - tileSize; y += tileSize) {
    for (let x = 0; x < width - tileSize; x += tileSize) {
      let sum = 0;
      let sumSq = 0;
      let count = 0;

      for (let ty = 0; ty < tileSize; ty += 3) {
        for (let tx = 0; tx < tileSize; tx += 3) {
          const value = gray[(y + ty) * width + x + tx];
          sum += value;
          sumSq += value * value;
          count += 1;
        }
      }

      const mean = sum / count;
      const variance = sumSq / count - mean * mean;
      tiles.push({ x, y, mean, variance });
    }
  }

  let similar = 0;
  let compared = 0;
  const limit = Math.min(tiles.length, 180);

  for (let i = 0; i < limit; i += 1) {
    for (let j = i + 4; j < limit; j += 3) {
      const a = tiles[i];
      const b = tiles[j];
      const farEnough = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > tileSize * 3;

      if (!farEnough) {
        continue;
      }

      compared += 1;
      if (Math.abs(a.mean - b.mean) < 2.8 && Math.abs(a.variance - b.variance) < 18) {
        similar += 1;
      }
    }
  }

  const rate = similar / Math.max(1, compared);
  const score = clamp((rate - 0.09) * 150, 0, 16);

  return {
    label: "패턴 반복",
    score,
    value: rate,
    display: `${Math.round(rate * 100)}%`,
    reason:
      score > 6
        ? "비슷한 밝기와 질감 패턴이 반복되어 배경 생성 또는 복제 흔적을 확인해야 합니다."
        : ""
  };
}

function calculateMetadataScore(bytes, file) {
  const hasExif = hasJpegExif(bytes);
  const isJpeg = file.type === "image/jpeg";
  const score = isJpeg ? (hasExif ? 0 : 8) : 5;

  return {
    label: "메타데이터",
    score,
    value: hasExif ? 1 : 0,
    display: hasExif ? "EXIF 있음" : "원본 정보 부족",
    reason:
      score > 0
        ? "촬영 기기와 원본 시간 같은 메타데이터가 부족해 원본성 확인 근거가 약합니다."
        : ""
  };
}

function calculateDescriptionScore(description, texture, gradient) {
  const text = description.trim();
  if (!text) {
    return {
      label: "설명 일치도",
      score: 0,
      value: 0,
      display: "미입력",
      reason: ""
    };
  }

  const mentionsDamage = /(흠집|기스|스크래치|파손|깨짐|찍힘|사용감|생활감)/.test(text);
  const saysNew = /(새상품|미개봉|사용 안|거의 새|A급|S급)/i.test(text);
  const cleanLooking = texture.noise.score < 5 && gradient.flatRatio > 0.46;
  const strongEditSignals = texture.noise.score > 16 || texture.edge.score > 8;

  let score = 0;
  let reason = "";

  if (mentionsDamage && cleanLooking) {
    score = 8;
    reason = "판매 설명에는 흠집이나 사용감이 있지만 이미지 질감 변화가 적어 상태 보정 여부를 확인해야 합니다.";
  } else if (saysNew && strongEditSignals) {
    score = 7;
    reason = "새상품 또는 A급 설명과 달리 이미지 편집 신호가 있어 추가 확인이 필요합니다.";
  }

  return {
    label: "설명 일치도",
    score,
    value: score,
    display: score > 0 ? "주의" : "특이 신호 낮음",
    reason
  };
}

function hasJpegExif(bytes) {
  const data = new Uint8Array(bytes);
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    return false;
  }

  let offset = 2;
  while (offset + 4 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = data[offset + 1];
    const size = (data[offset + 2] << 8) + data[offset + 3];

    if (marker === 0xe1 && offset + 10 < data.length) {
      const header = String.fromCharCode(
        data[offset + 4],
        data[offset + 5],
        data[offset + 6],
        data[offset + 7],
        data[offset + 8],
        data[offset + 9]
      );
      return header === "Exif\0\0";
    }

    if (size < 2) {
      break;
    }

    offset += 2 + size;
  }

  return false;
}

function getVerdict(score) {
  if (score >= 65) {
    return {
      key: "danger",
      label: "조작 가능성 높음",
      title: "거래 전 추가 확인이 필요합니다",
      summary: "여러 이미지 신호가 동시에 높게 나타났습니다. 원본 사진이나 추가 각도 사진을 요청하는 편이 안전합니다.",
      color: "#d64f45"
    };
  }

  if (score >= 35) {
    return {
      key: "caution",
      label: "의심 이미지",
      title: "일부 신호가 자연스럽지 않습니다",
      summary: "확정 판정은 아니지만 이미지 편집 또는 재저장 가능성이 있어 판매자에게 추가 확인을 요청하는 것이 좋습니다.",
      color: "#e7b638"
    };
  }

  return {
    key: "safe",
    label: "정상 가능성 높음",
    title: "뚜렷한 조작 신호는 낮습니다",
    summary: "분석된 범위에서는 강한 조작 흔적이 적습니다. 거래 전 기본 확인 절차는 유지하세요.",
    color: "#0a7d5f"
  };
}

function renderResult(result) {
  const { score, verdict, signals } = result;
  const reasons = Object.values(signals)
    .map((signal) => signal.reason)
    .filter(Boolean);

  resultBadge.textContent = verdict.label;
  resultBadge.className = `verdict-badge ${verdict.key}`;
  riskValue.textContent = score;
  resultTitle.textContent = verdict.title;
  resultSummary.textContent = verdict.summary;
  meterFill.style.width = toPercent(score);
  meterFill.style.backgroundColor = verdict.color;
  riskRing.style.background = `radial-gradient(circle, var(--surface) 0 58%, transparent 59%), conic-gradient(${verdict.color} ${score * 3.6}deg, #e6eeeb 0deg)`;

  reasonList.innerHTML = "";
  const displayReasons =
    reasons.length > 0
      ? reasons
      : ["노이즈, 압축 경계, 반복 패턴에서 강한 이상 신호가 낮게 나타났습니다."];

  displayReasons.slice(0, 5).forEach((reason) => {
    const item = document.createElement("li");
    item.textContent = reason;
    reasonList.appendChild(item);
  });

  renderMetrics(signals);
}

function renderMetrics(signals) {
  metricGrid.innerHTML = "";

  [
    signals.metadata,
    signals.block,
    signals.noise,
    signals.edge,
    signals.repetition,
    signals.description
  ].forEach((signal) => {
    const item = document.createElement("article");
    const label = document.createElement("span");
    const value = document.createElement("strong");

    label.textContent = signal.label;
    value.textContent = signal.display;
    item.append(label, value);
    metricGrid.appendChild(item);
  });
}

function renderEmptyResult(title = "이미지를 업로드하세요", summary = "분석 결과가 여기에 표시됩니다.") {
  resultBadge.textContent = "대기";
  resultBadge.className = "verdict-badge neutral";
  riskValue.textContent = "--";
  resultTitle.textContent = title;
  resultSummary.textContent = summary;
  meterFill.style.width = "0%";
  meterFill.style.backgroundColor = "var(--green)";
  riskRing.style.background =
    "radial-gradient(circle, var(--surface) 0 58%, transparent 59%), conic-gradient(var(--green) 0deg, #e6eeeb 0deg)";
  reasonList.innerHTML = "<li>이미지 선택 후 분석을 실행하면 주요 의심 근거가 정리됩니다.</li>";
  metricGrid.innerHTML = `
    <article><span>메타데이터</span><strong>--</strong></article>
    <article><span>압축 흔적</span><strong>--</strong></article>
    <article><span>노이즈 균일도</span><strong>--</strong></article>
    <article><span>패턴 반복</span><strong>--</strong></article>
  `;
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes}B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
