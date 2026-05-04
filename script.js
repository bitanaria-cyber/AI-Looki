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
  const sourceDimensions = {
    width: image.naturalWidth,
    height: image.naturalHeight
  };
  const signals = calculateSignals(imageData, bytes, file, description, sourceDimensions);
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

function calculateSignals(imageData, bytes, file, description, sourceDimensions) {
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
  const metadata = calculateMetadataScore(bytes, file, sourceDimensions);
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

const EDITING_SOFTWARE_PATTERN =
  /(photoshop|lightroom|gimp|snapseed|canva|picsart|pixelmator|affinity|meitu|paint\.net|adobe|editor|retouch|beautyplus)/i;
const GENERATIVE_SOFTWARE_PATTERN =
  /(midjourney|stable\s*diffusion|dall[-\s]?e|firefly|imagen|comfyui|automatic1111|invokeai|civitai|flux|ai\s*generated|generative)/i;

function calculateMetadataScore(bytes, file, sourceDimensions) {
  const metadata = extractImageMetadata(bytes, file);
  const reasons = [];
  let score = 0;

  const claimedType = normalizeMimeType(file.type);
  const detectedType = metadata.detectedType;
  const hasCamera = Boolean(metadata.make || metadata.model);
  const hasCaptureTime = Boolean(
    metadata.dateTimeOriginal || metadata.dateTimeDigitized || metadata.dateTime
  );
  const metadataText = [
    metadata.software,
    metadata.xmpText,
    ...metadata.textValues
  ]
    .filter(Boolean)
    .join(" ");
  const softwareRisk = classifySoftware(metadataText);

  if (!detectedType) {
    score += 12;
    reasons.push("파일 내부 헤더가 일반적인 JPG, PNG, WebP 이미지 형식과 맞지 않아 파일 출처 확인이 필요합니다.");
  } else if (claimedType && claimedType !== detectedType) {
    score += 8;
    reasons.push("브라우저가 인식한 파일 형식과 실제 이미지 헤더가 달라 확장자 변경 또는 재저장 여부를 확인해야 합니다.");
  }

  if (!metadata.hasExif) {
    score += detectedType === "image/jpeg" ? 8 : 5;
    reasons.push("촬영 기기와 촬영 시각을 확인할 EXIF 정보가 없어 원본성 확인 근거가 약합니다. 단, 플랫폼 저장 과정에서도 삭제될 수 있습니다.");
  } else {
    if (!hasCamera) {
      score += 7;
      reasons.push("EXIF는 있지만 카메라 제조사나 모델 정보가 비어 있어 원본 촬영 파일인지 확인하기 어렵습니다.");
    }

    if (!hasCaptureTime) {
      score += 7;
      reasons.push("EXIF는 있지만 촬영 시각 정보가 없어 판매자가 직접 촬영한 사진인지 판단할 근거가 부족합니다.");
    }
  }

  if (softwareRisk === "generative") {
    score += 22;
    reasons.unshift("메타데이터에 생성형 AI 또는 이미지 생성 도구 이름이 남아 있어 상품 실재 여부를 추가 확인해야 합니다.");
  } else if (softwareRisk === "editor" || metadata.photoshopApp13) {
    score += 14;
    reasons.unshift("메타데이터에 이미지 편집 프로그램 흔적이 있어 보정 또는 합성 가능성을 확인해야 합니다.");
  } else if (metadata.software && !hasCamera) {
    score += 5;
    reasons.push("촬영 기기 정보 없이 소프트웨어 정보만 남아 있어 원본 촬영 파일보다 재저장 파일에 가까운 신호입니다.");
  }

  const dateRisk = evaluateDateRisk(metadata);
  if (dateRisk) {
    score += dateRisk.score;
    reasons.push(dateRisk.reason);
  }

  const dimensionRisk = evaluateDimensionRisk(metadata, sourceDimensions);
  if (dimensionRisk) {
    score += dimensionRisk.score;
    reasons.push(dimensionRisk.reason);
  }

  if (metadata.hasXmp && /history|derivedfrom|creatortool|photoshop|xmpmm:/i.test(metadata.xmpText)) {
    score += softwareRisk ? 3 : 7;
    reasons.push("XMP 편집 이력으로 보이는 정보가 있어 원본 파일인지 추가 확인이 필요합니다.");
  }

  const finalScore = clamp(score, 0, 28);

  return {
    label: "메타데이터",
    score: finalScore,
    value: metadata,
    display: getMetadataDisplay(metadata, softwareRisk, hasCamera, hasCaptureTime),
    reason: reasons[0] || "",
    reasons: reasons.slice(0, 3)
  };
}

function extractImageMetadata(bytes, file) {
  const data = new Uint8Array(bytes);
  const metadata = {
    detectedType: detectImageType(data),
    claimedType: normalizeMimeType(file.type),
    hasExif: false,
    hasXmp: false,
    photoshopApp13: false,
    make: "",
    model: "",
    software: "",
    dateTime: "",
    dateTimeOriginal: "",
    dateTimeDigitized: "",
    orientation: null,
    pixelWidth: null,
    pixelHeight: null,
    gps: false,
    makerNote: false,
    xmpText: "",
    textValues: []
  };

  if (metadata.detectedType === "image/jpeg") {
    parseJpegMetadata(data, metadata);
  } else if (metadata.detectedType === "image/png") {
    parsePngMetadata(data, metadata);
  } else if (metadata.detectedType === "image/webp") {
    parseWebpMetadata(data, metadata);
  }

  return metadata;
}

function parseJpegMetadata(data, metadata) {
  let offset = 2;

  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    let markerOffset = offset + 1;
    while (markerOffset < data.length && data[markerOffset] === 0xff) {
      markerOffset += 1;
    }

    const marker = data[markerOffset];
    offset = markerOffset + 1;

    if (marker === 0xda || marker === 0xd9) {
      break;
    }

    if (marker >= 0xd0 && marker <= 0xd7) {
      continue;
    }

    if (offset + 2 > data.length) {
      break;
    }

    const size = readUint16BE(data, offset);
    const segmentStart = offset + 2;
    const segmentEnd = offset + size;

    if (size < 2 || segmentEnd > data.length) {
      break;
    }

    if (marker === 0xe1) {
      if (readBinaryString(data, segmentStart, 6) === "Exif\0\0") {
        mergeExifMetadata(metadata, parseExifTiff(data, segmentStart + 6, segmentEnd - segmentStart - 6));
      } else {
        const app1Header = readBinaryString(data, segmentStart, Math.min(32, segmentEnd - segmentStart));
        if (app1Header.startsWith("http://ns.adobe.com/xap/1.0/")) {
          metadata.hasXmp = true;
          metadata.xmpText += ` ${readText(data, segmentStart, segmentEnd - segmentStart)}`;
        }
      }
    } else if (marker === 0xed) {
      const app13Header = readBinaryString(data, segmentStart, Math.min(13, segmentEnd - segmentStart));
      metadata.photoshopApp13 = metadata.photoshopApp13 || app13Header.includes("Photoshop");
    } else if (isJpegStartOfFrame(marker) && segmentStart + 5 < segmentEnd) {
      metadata.pixelHeight = metadata.pixelHeight || readUint16BE(data, segmentStart + 1);
      metadata.pixelWidth = metadata.pixelWidth || readUint16BE(data, segmentStart + 3);
    }

    offset = segmentEnd;
  }
}

function parsePngMetadata(data, metadata) {
  let offset = 8;

  while (offset + 8 <= data.length) {
    const length = readUint32BE(data, offset);
    const type = readBinaryString(data, offset + 4, 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + length;

    if (chunkEnd + 4 > data.length) {
      break;
    }

    if (type === "eXIf") {
      mergeExifMetadata(metadata, parseExifTiff(data, chunkStart, length));
    } else if (type === "tEXt") {
      parsePngTextChunk(data, chunkStart, length, metadata);
    } else if (type === "iTXt") {
      parsePngInternationalTextChunk(data, chunkStart, length, metadata);
    }

    offset = chunkEnd + 4;
  }
}

function parseWebpMetadata(data, metadata) {
  let offset = 12;

  while (offset + 8 <= data.length) {
    const type = readBinaryString(data, offset, 4);
    const length = readUint32LE(data, offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + length;

    if (chunkEnd > data.length) {
      break;
    }

    if (type === "EXIF") {
      const startsWithHeader = readBinaryString(data, chunkStart, 6) === "Exif\0\0";
      const tiffStart = startsWithHeader ? chunkStart + 6 : chunkStart;
      mergeExifMetadata(metadata, parseExifTiff(data, tiffStart, chunkEnd - tiffStart));
    } else if (type === "XMP ") {
      metadata.hasXmp = true;
      metadata.xmpText += ` ${readText(data, chunkStart, length)}`;
    }

    offset = chunkEnd + (length % 2);
  }
}

function parseExifTiff(data, tiffStart, tiffLength) {
  const exif = {
    hasExif: false
  };

  if (tiffLength < 8 || tiffStart < 0 || tiffStart + tiffLength > data.length) {
    return exif;
  }

  const byteOrder = readBinaryString(data, tiffStart, 2);
  const littleEndian = byteOrder === "II";

  if (!littleEndian && byteOrder !== "MM") {
    return exif;
  }

  const view = new DataView(data.buffer, data.byteOffset + tiffStart, tiffLength);

  if (view.getUint16(2, littleEndian) !== 42) {
    return exif;
  }

  exif.hasExif = true;
  const ifd0Offset = view.getUint32(4, littleEndian);
  const pointers = {};

  parseExifIfd(view, data, tiffStart, tiffLength, ifd0Offset, littleEndian, exif, pointers, "ifd0");

  if (pointers.exif) {
    parseExifIfd(view, data, tiffStart, tiffLength, pointers.exif, littleEndian, exif, pointers, "exif");
  }

  if (pointers.gps) {
    exif.gps = true;
  }

  return exif;
}

function parseExifIfd(view, data, tiffStart, tiffLength, ifdOffset, littleEndian, exif, pointers, scope) {
  if (!Number.isFinite(ifdOffset) || ifdOffset < 0 || ifdOffset + 2 > tiffLength) {
    return;
  }

  const entryCount = view.getUint16(ifdOffset, littleEndian);
  const safeEntryCount = Math.min(entryCount, 256);

  for (let index = 0; index < safeEntryCount; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;

    if (entryOffset + 12 > tiffLength) {
      break;
    }

    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    const valueOffset = view.getUint32(entryOffset + 8, littleEndian);
    const value = readTiffValue(view, data, tiffStart, tiffLength, entryOffset, type, count, valueOffset, littleEndian);

    if (scope === "ifd0") {
      applyIfd0Tag(exif, pointers, tag, value);
    } else if (scope === "exif") {
      applyExifSubTag(exif, tag, value);
    }
  }
}

function applyIfd0Tag(exif, pointers, tag, value) {
  if (tag === 0x010f) {
    exif.make = cleanMetadataText(value);
  } else if (tag === 0x0110) {
    exif.model = cleanMetadataText(value);
  } else if (tag === 0x0112) {
    exif.orientation = value;
  } else if (tag === 0x0131) {
    exif.software = cleanMetadataText(value);
  } else if (tag === 0x0132) {
    exif.dateTime = cleanMetadataText(value);
  } else if (tag === 0x0100) {
    exif.pixelWidth = value;
  } else if (tag === 0x0101) {
    exif.pixelHeight = value;
  } else if (tag === 0x8769) {
    pointers.exif = value;
  } else if (tag === 0x8825) {
    pointers.gps = value;
  }
}

function applyExifSubTag(exif, tag, value) {
  if (tag === 0x9003) {
    exif.dateTimeOriginal = cleanMetadataText(value);
  } else if (tag === 0x9004) {
    exif.dateTimeDigitized = cleanMetadataText(value);
  } else if (tag === 0xa002) {
    exif.pixelWidth = value;
  } else if (tag === 0xa003) {
    exif.pixelHeight = value;
  } else if (tag === 0x927c) {
    exif.makerNote = true;
  }
}

function readTiffValue(view, data, tiffStart, tiffLength, entryOffset, type, count, valueOffset, littleEndian) {
  const typeSizes = {
    1: 1,
    2: 1,
    3: 2,
    4: 4,
    5: 8,
    7: 1,
    9: 4,
    10: 8
  };
  const typeSize = typeSizes[type];

  if (!typeSize || count <= 0) {
    return null;
  }

  const valueLength = typeSize * count;
  const inline = valueLength <= 4;
  const relativeValueOffset = inline ? entryOffset + 8 : valueOffset;

  if (relativeValueOffset < 0 || relativeValueOffset + valueLength > tiffLength) {
    return null;
  }

  const absoluteValueOffset = tiffStart + relativeValueOffset;

  if (type === 2) {
    return cleanMetadataText(readText(data, absoluteValueOffset, valueLength));
  }

  if (type === 3) {
    return count === 1
      ? view.getUint16(relativeValueOffset, littleEndian)
      : readTiffNumberArray(view, relativeValueOffset, count, "getUint16", littleEndian);
  }

  if (type === 4) {
    return count === 1
      ? view.getUint32(relativeValueOffset, littleEndian)
      : readTiffNumberArray(view, relativeValueOffset, count, "getUint32", littleEndian);
  }

  if (type === 7) {
    return { present: true, bytes: valueLength };
  }

  return null;
}

function readTiffNumberArray(view, relativeOffset, count, method, littleEndian) {
  const step = method === "getUint16" ? 2 : 4;
  const values = [];
  const safeCount = Math.min(count, 8);

  for (let index = 0; index < safeCount; index += 1) {
    values.push(view[method](relativeOffset + index * step, littleEndian));
  }

  return values;
}

function mergeExifMetadata(metadata, exif) {
  if (!exif || !exif.hasExif) {
    return;
  }

  metadata.hasExif = true;
  metadata.make = metadata.make || exif.make || "";
  metadata.model = metadata.model || exif.model || "";
  metadata.software = metadata.software || exif.software || "";
  metadata.dateTime = metadata.dateTime || exif.dateTime || "";
  metadata.dateTimeOriginal = metadata.dateTimeOriginal || exif.dateTimeOriginal || "";
  metadata.dateTimeDigitized = metadata.dateTimeDigitized || exif.dateTimeDigitized || "";
  metadata.orientation = metadata.orientation || exif.orientation || null;
  metadata.pixelWidth = metadata.pixelWidth || exif.pixelWidth || null;
  metadata.pixelHeight = metadata.pixelHeight || exif.pixelHeight || null;
  metadata.gps = metadata.gps || Boolean(exif.gps);
  metadata.makerNote = metadata.makerNote || Boolean(exif.makerNote);
}

function parsePngTextChunk(data, start, length, metadata) {
  const text = readText(data, start, length);
  const separatorIndex = text.indexOf("\0");

  if (separatorIndex === -1) {
    return;
  }

  const keyword = cleanMetadataText(text.slice(0, separatorIndex));
  const value = cleanMetadataText(text.slice(separatorIndex + 1));
  applyTextMetadata(keyword, value, metadata);
}

function parsePngInternationalTextChunk(data, start, length, metadata) {
  const end = start + length;
  let cursor = start;
  const keywordEnd = findNullByte(data, cursor, end);

  if (keywordEnd === -1 || keywordEnd + 3 >= end) {
    return;
  }

  const keyword = cleanMetadataText(readText(data, cursor, keywordEnd - cursor));
  const compressionFlag = data[keywordEnd + 1];

  if (compressionFlag !== 0) {
    return;
  }

  cursor = keywordEnd + 3;
  const languageEnd = findNullByte(data, cursor, end);

  if (languageEnd === -1) {
    return;
  }

  cursor = languageEnd + 1;
  const translatedEnd = findNullByte(data, cursor, end);

  if (translatedEnd === -1) {
    return;
  }

  cursor = translatedEnd + 1;
  const value = cleanMetadataText(readText(data, cursor, end - cursor));
  applyTextMetadata(keyword, value, metadata);
}

function applyTextMetadata(keyword, value, metadata) {
  if (!value) {
    return;
  }

  metadata.textValues.push(`${keyword}: ${value}`);

  if (/software|creator|tool/i.test(keyword) && !metadata.software) {
    metadata.software = value;
  }

  if (/creation|date|time/i.test(keyword) && !metadata.dateTime) {
    metadata.dateTime = value;
  }

  if (/xmp|xml:com\.adobe\.xmp/i.test(keyword)) {
    metadata.hasXmp = true;
    metadata.xmpText += ` ${value}`;
  }
}

function classifySoftware(text) {
  if (!text) {
    return "";
  }

  if (GENERATIVE_SOFTWARE_PATTERN.test(text)) {
    return "generative";
  }

  if (EDITING_SOFTWARE_PATTERN.test(text)) {
    return "editor";
  }

  return "";
}

function evaluateDateRisk(metadata) {
  const rawDate = metadata.dateTimeOriginal || metadata.dateTimeDigitized || metadata.dateTime;
  const parsedDate = parseMetadataDate(rawDate);

  if (!parsedDate) {
    return null;
  }

  if (parsedDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    return {
      score: 10,
      reason: "촬영 시각 메타데이터가 현재보다 미래로 기록되어 있어 기기 시간 오류나 조작 여부를 확인해야 합니다."
    };
  }

  return null;
}

function evaluateDimensionRisk(metadata, sourceDimensions) {
  if (
    !metadata.pixelWidth ||
    !metadata.pixelHeight ||
    !sourceDimensions ||
    !sourceDimensions.width ||
    !sourceDimensions.height
  ) {
    return null;
  }

  const directDifference =
    Math.abs(metadata.pixelWidth - sourceDimensions.width) +
    Math.abs(metadata.pixelHeight - sourceDimensions.height);
  const swappedDifference =
    Math.abs(metadata.pixelWidth - sourceDimensions.height) +
    Math.abs(metadata.pixelHeight - sourceDimensions.width);
  const bestDifference = Math.min(directDifference, swappedDifference);
  const tolerance = Math.max(24, Math.max(sourceDimensions.width, sourceDimensions.height) * 0.02);

  if (bestDifference > tolerance) {
    return {
      score: 8,
      reason: "EXIF에 기록된 이미지 크기와 실제 표시 크기가 달라 크롭, 회전, 재저장 또는 편집 여부를 확인해야 합니다."
    };
  }

  return null;
}

function getMetadataDisplay(metadata, softwareRisk, hasCamera, hasCaptureTime) {
  if (!metadata.detectedType) {
    return "형식 확인 필요";
  }

  if (softwareRisk === "generative") {
    return "생성 도구";
  }

  if (softwareRisk === "editor" || metadata.photoshopApp13) {
    return "편집 흔적";
  }

  if (metadata.hasExif && hasCamera && hasCaptureTime) {
    return "촬영 정보 있음";
  }

  if (metadata.hasExif) {
    return "부분 정보";
  }

  return "원본 정보 부족";
}

function detectImageType(data) {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    data.length >= 12 &&
    readBinaryString(data, 0, 4) === "RIFF" &&
    readBinaryString(data, 8, 4) === "WEBP"
  ) {
    return "image/webp";
  }

  return "";
}

function normalizeMimeType(type) {
  if (!type) {
    return "";
  }

  return type.toLowerCase() === "image/jpg" ? "image/jpeg" : type.toLowerCase();
}

function isJpegStartOfFrame(marker) {
  return (
    marker === 0xc0 ||
    marker === 0xc1 ||
    marker === 0xc2 ||
    marker === 0xc3 ||
    marker === 0xc5 ||
    marker === 0xc6 ||
    marker === 0xc7 ||
    marker === 0xc9 ||
    marker === 0xca ||
    marker === 0xcb ||
    marker === 0xcd ||
    marker === 0xce ||
    marker === 0xcf
  );
}

function parseMetadataDate(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const match = value.match(/(\d{4})[:/-](\d{2})[:/-](\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match.map(Number);
  const parsedDate = new Date(year, month - 1, day, hour, minute, second);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function readUint16BE(data, offset) {
  return (data[offset] << 8) + data[offset + 1];
}

function readUint32BE(data, offset) {
  return (
    data[offset] * 0x1000000 +
    ((data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3])
  );
}

function readUint32LE(data, offset) {
  return (
    data[offset] +
    (data[offset + 1] << 8) +
    (data[offset + 2] << 16) +
    data[offset + 3] * 0x1000000
  );
}

function readBinaryString(data, start, length) {
  let text = "";
  const end = Math.min(data.length, start + length);

  for (let index = start; index < end; index += 1) {
    text += String.fromCharCode(data[index]);
  }

  return text;
}

function readText(data, start, length) {
  const end = Math.min(data.length, start + length);
  const slice = data.subarray(start, end);

  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder("utf-8", { fatal: false }).decode(slice);
  }

  return readBinaryString(data, start, length);
}

function cleanMetadataText(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.replace(/\0/g, "").replace(/[\u0001-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function findNullByte(data, start, end) {
  for (let index = start; index < end; index += 1) {
    if (data[index] === 0) {
      return index;
    }
  }

  return -1;
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
    .flatMap((signal) => (signal.reasons && signal.reasons.length ? signal.reasons : [signal.reason]))
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
    <article><span>경계선 자연도</span><strong>--</strong></article>
    <article><span>패턴 반복</span><strong>--</strong></article>
    <article><span>설명 일치도</span><strong>--</strong></article>
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
