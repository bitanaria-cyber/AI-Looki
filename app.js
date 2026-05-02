const ui = {
  analyzeButton: document.getElementById("analyze-button"),
  categorySelect: document.getElementById("category-select"),
  claimChips: document.getElementById("claim-chips"),
  confidenceBadge: document.getElementById("confidence-badge"),
  confidenceCopy: document.getElementById("confidence-copy"),
  confidenceScore: document.getElementById("confidence-score"),
  confidenceTitle: document.getElementById("confidence-title"),
  historyList: document.getElementById("history-list"),
  compareBadge: document.getElementById("compare-badge"),
  compareCopy: document.getElementById("compare-copy"),
  compareScore: document.getElementById("compare-score"),
  compareTitle: document.getElementById("compare-title"),
  consistencyBadge: document.getElementById("consistency-badge"),
  consistencyCopy: document.getElementById("consistency-copy"),
  consistencyScore: document.getElementById("consistency-score"),
  consistencySignalList: document.getElementById("consistency-signal-list"),
  consistencyTitle: document.getElementById("consistency-title"),
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("photo-input"),
  imageName: document.getElementById("image-name"),
  imageSpec: document.getElementById("image-spec"),
  listingDescription: document.getElementById("listing-description"),
  limitationList: document.getElementById("limitation-list"),
  liveSignals: document.getElementById("live-signal-list"),
  overlayCanvas: document.getElementById("overlay-canvas"),
  previewCanvas: document.getElementById("preview-canvas"),
  previewEmpty: document.getElementById("preview-empty"),
  recommendationList: document.getElementById("recommendation-list"),
  resetButton: document.getElementById("reset-button"),
  resultBadge: document.getElementById("result-badge"),
  resultCopy: document.getElementById("result-copy"),
  resultScore: document.getElementById("result-score"),
  resultTitle: document.getElementById("result-title"),
  sampleEditButton: document.getElementById("sample-edit-button"),
  sampleMismatchButton: document.getElementById("sample-mismatch-button"),
  sampleSafeButton: document.getElementById("sample-safe-button"),
  scenarioEditButton: document.getElementById("scenario-edit-button"),
  scenarioMismatchButton: document.getElementById("scenario-mismatch-button"),
  scenarioSafeButton: document.getElementById("scenario-safe-button"),
  saveButton: document.getElementById("save-button"),
  scanLoading: document.getElementById("scan-loading"),
  scannerNote: document.getElementById("scanner-note"),
  summaryBadge: document.getElementById("summary-badge"),
  summaryCopy: document.getElementById("summary-copy"),
  summaryScore: document.getElementById("summary-score"),
  summaryTitle: document.getElementById("summary-title"),
  thumbStrip: document.getElementById("thumb-strip"),
  typeChips: document.getElementById("type-chips"),
  typeDetailList: document.getElementById("type-detail-list"),
  metricMetadataValue: document.getElementById("metric-metadata-value"),
  metricMetadataBar: document.getElementById("metric-metadata-bar"),
  metricMetadataNote: document.getElementById("metric-metadata-note"),
  metricTextureValue: document.getElementById("metric-texture-value"),
  metricTextureBar: document.getElementById("metric-texture-bar"),
  metricTextureNote: document.getElementById("metric-texture-note"),
  metricRepeatValue: document.getElementById("metric-repeat-value"),
  metricRepeatBar: document.getElementById("metric-repeat-bar"),
  metricRepeatNote: document.getElementById("metric-repeat-note"),
  metricEdgeValue: document.getElementById("metric-edge-value"),
  metricEdgeBar: document.getElementById("metric-edge-bar"),
  metricEdgeNote: document.getElementById("metric-edge-note"),
};

const previewContext = ui.previewCanvas.getContext("2d");
const overlayContext = ui.overlayCanvas.getContext("2d");

const state = {
  activePhotoId: null,
  busy: false,
  claims: createEmptyClaims(),
  comparison: null,
  confidence: null,
  lastReport: null,
  photos: [],
  recommendations: [],
  summary: null,
  typeBreakdown: [],
  requestId: 0,
};

const HISTORY_STORAGE_KEY = "ai-looki-history-v1";

const metricDefinitions = {
  metadata: {
    value: ui.metricMetadataValue,
    bar: ui.metricMetadataBar,
    note: ui.metricMetadataNote,
  },
  texture: {
    value: ui.metricTextureValue,
    bar: ui.metricTextureBar,
    note: ui.metricTextureNote,
  },
  repeat: {
    value: ui.metricRepeatValue,
    bar: ui.metricRepeatBar,
    note: ui.metricRepeatNote,
  },
  edge: {
    value: ui.metricEdgeValue,
    bar: ui.metricEdgeBar,
    note: ui.metricEdgeNote,
  },
};

const categoryMeta = {
  general: {
    label: "일반 상품",
    placeholder: "예: 블랙 백팩, 오염 없고 사용감 적으며 구성품 포함입니다.",
  },
  phone: {
    label: "휴대폰",
    placeholder: "예: 아이폰 14 프로 블랙 256GB, 생활기스 거의 없고 박스 포함입니다.",
  },
  sneaker: {
    label: "운동화",
    placeholder: "예: 화이트 스니커즈 270, 오염 거의 없고 밑창 마모 적으며 풀박스입니다.",
  },
  device: {
    label: "전자기기",
    placeholder: "예: 닌텐도 스위치 네온, 화면 잔기스 적고 독/충전기 포함입니다.",
  },
};

const colorClaimRules = [
  { family: "black", label: "블랙", patterns: [/블랙/, /검정/, /검은색/, /\bblack\b/] },
  { family: "white", label: "화이트", patterns: [/화이트/, /흰색/, /하얀색/, /\bwhite\b/, /아이보리/] },
  { family: "silver", label: "실버", patterns: [/실버/, /은색/, /그레이/, /회색/, /\bsilver\b/, /\bgray\b/, /\bgrey\b/] },
  { family: "blue", label: "블루", patterns: [/블루/, /파랑/, /파란색/, /네이비/, /\bblue\b/, /\bnavy\b/] },
  { family: "red", label: "레드", patterns: [/레드/, /빨강/, /붉은색/, /\bred\b/] },
  { family: "pink", label: "핑크", patterns: [/핑크/, /\bpink\b/] },
  { family: "green", label: "그린", patterns: [/그린/, /초록/, /녹색/, /\bgreen\b/, /민트/] },
  { family: "yellow", label: "옐로", patterns: [/옐로/, /노랑/, /노란색/, /\byellow\b/, /골드/, /\bgold\b/] },
  { family: "purple", label: "퍼플", patterns: [/퍼플/, /보라/, /라벤더/, /\bpurple\b/] },
  { family: "brown", label: "브라운", patterns: [/브라운/, /갈색/, /베이지/, /\bbrown\b/, /탄색/] },
];

const positiveConditionRules = [
  { id: "new", label: "새상품/미사용", patterns: [/새상품/, /미개봉/, /미사용/, /사용\s*안함/, /실착\s*0/, /실사용\s*거의\s*없/] },
  { id: "clean", label: "깨끗함/하자 없음", patterns: [/하자\s*없/, /기스.{0,4}없/, /스크래치.{0,4}없/, /깨끗/, /상태\s*좋/, /민트급/] },
];

const flawRules = [
  {
    id: "scratch",
    label: "스크래치/기스",
    patterns: [/스크래치/, /생활기스/, /잔기스/, /기스/],
    unless: [/기스.{0,4}없/, /스크래치.{0,4}없/],
  },
  {
    id: "dent",
    label: "찍힘/파손",
    patterns: [/찍힘/, /크랙/, /깨짐/, /파손/, /까짐/],
  },
  {
    id: "stain",
    label: "오염/변색",
    patterns: [/오염/, /변색/, /황변/, /이염/, /얼룩/],
  },
  {
    id: "used",
    label: "사용감",
    patterns: [/사용감/, /실사용/, /마모/, /닳음/],
    unless: [/실사용\s*거의\s*없/],
  },
];

const authenticityRules = [
  { id: "real-shot", label: "실사/직접 촬영", patterns: [/실사/, /직접\s*촬영/, /직접\s*찍/, /원본\s*사진/] },
];

const accessoryRules = [
  { id: "full-box", label: "박스/풀박스", patterns: [/풀박스/, /박스\s*포함/, /박스/, /구성품\s*풀/, /full\s*box/] },
  { id: "charger", label: "충전기/케이블", patterns: [/충전기/, /케이블/, /충전\s*케이블/, /\bcable\b/, /\bcharger\b/] },
  { id: "case", label: "케이스/보호용품", patterns: [/케이스/, /커버/, /보호필름/, /스트랩/] },
  { id: "single", label: "본체만/단품", patterns: [/본체만/, /단품/, /구성품\s*없/] },
];

const colorFamilyLabels = {
  black: "블랙",
  white: "화이트",
  silver: "실버/그레이",
  blue: "블루/네이비",
  red: "레드",
  pink: "핑크",
  green: "그린",
  yellow: "옐로/골드",
  purple: "퍼플",
  brown: "브라운/베이지",
};

bindEvents();
resetInterface();

function bindOptionalClick(element, handler) {
  if (!element) {
    return;
  }

  element.addEventListener("click", handler);
}

function bindEvents() {
  ui.fileInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    await handleSelectedFiles(files);
  });

  ui.analyzeButton.addEventListener("click", () => {
    void runAnalysis();
  });

  ui.saveButton.addEventListener("click", () => {
    void saveReportCard();
  });

  ui.resetButton.addEventListener("click", () => {
    resetInterface();
    ui.fileInput.value = "";
  });

  ui.listingDescription.addEventListener("input", () => {
    if (!state.photos.length || state.busy) {
      return;
    }

    ui.scannerNote.textContent = "설명이 바뀌었다. 종합 검사 실행을 누르면 사진과 문구를 다시 맞춰 본다.";
  });

  ui.categorySelect.addEventListener("change", () => {
    updateDescriptionPlaceholder();
    if (!state.photos.length || state.busy) {
      return;
    }

    ui.scannerNote.textContent = "카테고리가 바뀌었다. 종합 검사 실행을 다시 눌러 권장 질문과 비교 규칙을 갱신한다.";
  });

  bindOptionalClick(ui.sampleSafeButton, () => {
    void loadSampleScenario("safe");
  });

  bindOptionalClick(ui.sampleEditButton, () => {
    void loadSampleScenario("edit");
  });

  bindOptionalClick(ui.sampleMismatchButton, () => {
    void loadSampleScenario("mismatch");
  });

  bindOptionalClick(ui.scenarioSafeButton, () => {
    void loadSampleScenario("safe");
  });

  bindOptionalClick(ui.scenarioEditButton, () => {
    void loadSampleScenario("edit");
  });

  bindOptionalClick(ui.scenarioMismatchButton, () => {
    void loadSampleScenario("mismatch");
  });

  const dragEvents = ["dragenter", "dragover"];
  const clearEvents = ["dragleave", "dragend", "drop"];

  dragEvents.forEach((eventName) => {
    ui.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      ui.dropzone.classList.add("is-dragover");
    });
  });

  clearEvents.forEach((eventName) => {
    ui.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      ui.dropzone.classList.remove("is-dragover");
    });
  });

  ui.dropzone.addEventListener("drop", async (event) => {
    const files = Array.from(event.dataTransfer?.files || []);
    if (!files.length) {
      return;
    }

    await handleSelectedFiles(files);
  });
}

async function handleSelectedFiles(files) {
  const imageFiles = files.filter((file) => file.type.startsWith("image/")).slice(0, 4);

  if (!imageFiles.length) {
    renderError("이미지 파일만 검사할 수 있다.");
    return;
  }

  const requestId = ++state.requestId;

  try {
    const images = await Promise.all(imageFiles.map((file) => loadImageFile(file)));
    if (requestId !== state.requestId) {
      return;
    }

    state.photos = imageFiles.map((file, index) => ({
      file,
      id: `photo-${Date.now()}-${index}`,
      image: images[index],
    }));
    state.activePhotoId = state.photos[0]?.id || null;
    state.claims = createEmptyClaims();
    state.comparison = null;
    state.recommendations = [];
    state.lastReport = null;

    ui.previewEmpty.hidden = true;
    renderPreviewForActivePhoto();
    renderThumbnailStrip();

    ui.scannerNote.textContent = imageFiles.length > 1
      ? `${imageFiles.length}장의 사진을 불러왔다. 사진별 점수와 사진 간 비교를 같이 계산한다.`
      : "사진을 불러왔다. 바로 검사하거나 설명을 넣어 종합 검사할 수 있다.";
    ui.analyzeButton.disabled = false;
    ui.saveButton.disabled = true;

    await runAnalysis();
  } catch (error) {
    renderError("사진을 읽는 중 문제가 발생했다. 다른 파일로 다시 시도해 달라.");
  }
}

async function loadSampleScenario(scenarioId) {
  if (state.busy) {
    return;
  }

  const scenario = await createSampleScenario(scenarioId);
  ui.categorySelect.value = scenario.category;
  updateDescriptionPlaceholder();
  ui.listingDescription.value = scenario.description;
  ui.scannerNote.textContent = `${scenario.label} 샘플을 불러오는 중이다.`;
  await handleSelectedFiles(scenario.files);
}

async function runAnalysis() {
  if (!state.photos.length || state.busy) {
    return;
  }

  const description = ui.listingDescription.value.trim();
  const category = ui.categorySelect.value;
  const claims = extractDescriptionClaims(description);

  setBusy(true);

  try {
    const analyzedPhotos = [];

    for (const photo of state.photos) {
      const arrayBuffer = await photo.file.arrayBuffer();
      const metadata = inspectMetadata(photo.file, arrayBuffer);
      const sample = createSample(photo.image, 448);
      const analysis = analyzeImage(sample, photo.file, metadata);
      const consistency = analyzeConsistency(description, claims, analysis.visualProfile, analysis, metadata, category);

      analyzedPhotos.push({
        ...photo,
        analysis,
        consistency,
        metadata,
        sample,
      });
    }

    state.photos = analyzedPhotos;
    state.claims = claims;
    state.comparison = analyzePhotoSet(analyzedPhotos, category);
    state.recommendations = buildRecommendations({
      activePhoto: getActivePhoto(analyzedPhotos),
      category,
      claims,
      comparison: state.comparison,
      description,
      photoCount: analyzedPhotos.length,
    });

    renderDashboard();
    saveHistoryEntry(state.lastReport, state.summary, state.typeBreakdown);
    renderHistory();
  } catch (error) {
    renderError("분석 중 오류가 발생했다. 다른 사진으로 다시 시도해 달라.");
  } finally {
    setBusy(false);
  }
}

function renderDashboard() {
  const activePhoto = getActivePhoto();
  if (!activePhoto) {
    return;
  }

  state.confidence = buildConfidenceReport({
    activePhoto,
    category: ui.categorySelect.value,
    claims: state.claims,
    comparison: state.comparison,
    photoCount: state.photos.length,
  });
  state.typeBreakdown = buildSuspicionTypes({
    activePhoto,
    comparison: state.comparison,
  });
  state.summary = buildExecutiveSummary({
    activePhoto,
    comparison: state.comparison,
    confidence: state.confidence,
    photoCount: state.photos.length,
    typeBreakdown: state.typeBreakdown,
  });

  renderPreviewForActivePhoto();
  renderPrimaryAnalysis(activePhoto);
  renderConsistency(activePhoto.consistency);
  renderCompare(state.comparison);
  renderConfidence(state.confidence);
  renderSummary(state.summary);
  renderTypeBreakdown(state.typeBreakdown);
  renderRecommendations(state.recommendations);
  renderThumbnailStrip();
  state.lastReport = buildReportSnapshot(activePhoto, state.confidence);
  ui.saveButton.disabled = !state.lastReport || state.busy;
}

function renderPreviewForActivePhoto() {
  const activePhoto = getActivePhoto();
  if (!activePhoto) {
    return;
  }

  drawPreview(activePhoto.image);
  ui.previewEmpty.hidden = true;

  const activeIndex = state.photos.findIndex((photo) => photo.id === activePhoto.id) + 1;
  const scoreText = activePhoto.analysis ? ` · AI ${activePhoto.analysis.score}` : "";

  ui.imageName.textContent = `${activeIndex}/${state.photos.length} · ${activePhoto.file.name}`;
  ui.imageSpec.textContent =
    `${activePhoto.image.naturalWidth}×${activePhoto.image.naturalHeight} · ${formatBytes(activePhoto.file.size)}${scoreText}`;
}

function renderPrimaryAnalysis(photo) {
  const { analysis, consistency, file, metadata, sample } = photo;
  const verdict = getVerdict(analysis.score);

  ui.resultScore.textContent = String(analysis.score);
  ui.resultBadge.textContent = verdict.badge;
  ui.resultBadge.style.background = verdict.badgeBackground;
  ui.resultBadge.style.color = verdict.badgeColor;
  ui.resultTitle.textContent = verdict.title;
  ui.resultCopy.textContent =
    `${analysis.suspiciousBlocks}개 영역에서 신호가 겹쳤다. ${metadataSummary(metadata)} ${sample.width}×${sample.height} 축소본으로 검사했다.`;

  setMetric("metadata", analysis.metrics.metadata, metadataNote(metadata));
  setMetric("texture", analysis.metrics.texture, textureNote(analysis));
  setMetric("repeat", analysis.metrics.repeat, repeatNote(analysis));
  setMetric("edge", analysis.metrics.edge, edgeNote(analysis));

  ui.liveSignals.innerHTML = analysis.signals
    .map((text) => `<li>${escapeHtml(text)}</li>`)
    .join("");

  ui.scannerNote.textContent =
    `${file.name} 분석 완료. 현재는 ${consistency?.available ? "설명 비교" : "이미지 포렌식"}와 ${state.comparison?.available ? "다중 사진 비교" : "단일 사진 검사"}를 함께 반영했다.`;

  drawOverlay(analysis.blocks, analysis.sampleSize, {
    height: ui.previewCanvas.height,
    width: ui.previewCanvas.width,
  });
}

function renderConsistency(consistency) {
  if (!consistency?.available) {
    ui.consistencyScore.textContent = "--";
    ui.consistencyBadge.textContent = "설명 대기";
    ui.consistencyBadge.style.background = "rgba(255, 255, 255, 0.08)";
    ui.consistencyBadge.style.color = "#f6f8fc";
    ui.consistencyTitle.textContent = "설명을 입력하면 사진과 문구 일치도를 같이 본다";
    ui.consistencyCopy.textContent = "색상, 상태 표현, 실사 주장 같은 문구를 뽑아 사진 특징과 비교한다.";
    ui.claimChips.innerHTML = '<span class="claim-chip claim-chip-muted">설명을 입력하면 키워드를 추출한다</span>';
    ui.consistencySignalList.innerHTML = consistency?.signals
      ?.map((signal) => `<li>${escapeHtml(signal)}</li>`)
      .join("")
      || "<li>설명과 사진을 함께 분석하면 여기서 불일치 포인트를 정리한다.</li>";
    return;
  }

  const verdict = getConsistencyVerdict(consistency.score);
  ui.consistencyScore.textContent = String(consistency.score);
  ui.consistencyBadge.textContent = verdict.badge;
  ui.consistencyBadge.style.background = verdict.badgeBackground;
  ui.consistencyBadge.style.color = verdict.badgeColor;
  ui.consistencyTitle.textContent = verdict.title;
  ui.consistencyCopy.textContent = consistency.summary;
  ui.claimChips.innerHTML = consistency.chips.length > 0
    ? consistency.chips
      .map((chip) => `<span class="claim-chip ${getClaimChipClass(chip.tone)}">${escapeHtml(chip.label)}</span>`)
      .join("")
    : '<span class="claim-chip claim-chip-muted">비교 가능한 키워드를 충분히 찾지 못했다</span>';
  ui.consistencySignalList.innerHTML = consistency.signals
    .map((signal) => `<li>${escapeHtml(signal)}</li>`)
    .join("");
}

function renderCompare(compare) {
  if (!compare?.available) {
    ui.compareScore.textContent = "--";
    ui.compareBadge.textContent = state.photos.length > 0 ? `사진 ${state.photos.length}장` : "사진 대기";
    ui.compareBadge.style.background = "rgba(255, 255, 255, 0.08)";
    ui.compareBadge.style.color = "#f6f8fc";
    ui.compareTitle.textContent = "여러 장을 올리면 사진끼리의 일관성도 비교한다";
    ui.compareCopy.textContent = state.photos.length <= 1
      ? "한 상품 사진을 2장 이상 올리면 배경과 톤, 보정 강도의 차이를 비교한다."
      : "분석 대기 중이다.";
    return;
  }

  const verdict = getCompareVerdict(compare.score);
  ui.compareScore.textContent = String(compare.score);
  ui.compareBadge.textContent = verdict.badge;
  ui.compareBadge.style.background = verdict.badgeBackground;
  ui.compareBadge.style.color = verdict.badgeColor;
  ui.compareTitle.textContent = verdict.title;
  ui.compareCopy.textContent = compare.summary;
}

function renderConfidence(confidence) {
  if (!confidence) {
    ui.confidenceScore.textContent = "--";
    ui.confidenceBadge.textContent = "근거 대기";
    ui.confidenceBadge.style.background = "rgba(255, 255, 255, 0.08)";
    ui.confidenceBadge.style.color = "#f6f8fc";
    ui.confidenceTitle.textContent = "검사 신뢰도는 입력 정보와 증거량에 따라 달라진다";
    ui.confidenceCopy.textContent = "사진 수, 설명 키워드, 메타데이터, 교차검증 결과를 합쳐 자동 판단의 신뢰도를 계산한다.";
    ui.limitationList.innerHTML = "<li>검사가 끝나면 자동 판독 한계와 추가 확인 포인트를 여기에 보여준다.</li>";
    return;
  }

  const verdict = getConfidenceVerdict(confidence.score);
  ui.confidenceScore.textContent = String(confidence.score);
  ui.confidenceBadge.textContent = verdict.badge;
  ui.confidenceBadge.style.background = verdict.badgeBackground;
  ui.confidenceBadge.style.color = verdict.badgeColor;
  ui.confidenceTitle.textContent = verdict.title;
  ui.confidenceCopy.textContent = confidence.summary;
  ui.limitationList.innerHTML = confidence.limits
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function renderSummary(summary) {
  if (!summary) {
    ui.summaryScore.textContent = "--";
    ui.summaryBadge.textContent = "결론 대기";
    ui.summaryBadge.style.background = "rgba(255, 255, 255, 0.08)";
    ui.summaryBadge.style.color = "#f6f8fc";
    ui.summaryTitle.textContent = "검사가 끝나면 한줄 결론을 바로 보여준다";
    ui.summaryCopy.textContent = "AI 편집 점수, 설명 일치도, 사진 교차검증, 신뢰도를 묶어 발표용 결론을 한 문장으로 정리한다.";
    return;
  }

  const verdict = getSummaryVerdict(summary.score);
  ui.summaryScore.textContent = String(summary.score);
  ui.summaryBadge.textContent = verdict.badge;
  ui.summaryBadge.style.background = verdict.badgeBackground;
  ui.summaryBadge.style.color = verdict.badgeColor;
  ui.summaryTitle.textContent = verdict.title;
  ui.summaryCopy.textContent = summary.copy;
}

function renderTypeBreakdown(typeBreakdown) {
  if (!typeBreakdown.length) {
    ui.typeChips.innerHTML = '<span class="claim-chip claim-chip-muted">분석 후 의심 유형을 자동 분류한다</span>';
    ui.typeDetailList.innerHTML = "<li>배경 합성, 하자 삭제, 설명 불일치, 사진 섞임 같은 유형을 여기에 정리한다.</li>";
    return;
  }

  ui.typeChips.innerHTML = typeBreakdown
    .map((item) => `<span class="claim-chip ${getClaimChipClass(item.tone)}">${escapeHtml(item.label)}</span>`)
    .join("");
  ui.typeDetailList.innerHTML = typeBreakdown
    .map((item) => `<li>${escapeHtml(item.detail)}</li>`)
    .join("");
}

function renderHistory() {
  const history = loadHistory();

  if (!history.length) {
    ui.historyList.innerHTML = '<p class="thumb-strip-empty">검사를 실행하면 최근 결과 카드가 여기에 쌓인다.</p>';
    return;
  }

  ui.historyList.innerHTML = history
    .map((entry) => `
      <article class="history-card">
        <div class="history-card-header">
          <strong>${escapeHtml(entry.title)}</strong>
          <span>${escapeHtml(entry.time)}</span>
        </div>
        <div class="history-score-row">
          <span class="history-pill">종합 ${escapeHtml(String(entry.summaryScore))}</span>
          <span class="history-pill">AI ${escapeHtml(String(entry.aiScore))}</span>
          <span class="history-pill">일치 ${escapeHtml(String(entry.consistencyScore))}</span>
          <span class="history-pill">비교 ${escapeHtml(String(entry.compareScore))}</span>
          <span class="history-pill">신뢰 ${escapeHtml(String(entry.confidenceScore))}</span>
        </div>
        <p>${escapeHtml(entry.copy)}</p>
      </article>
    `)
    .join("");
}

function renderRecommendations(recommendations) {
  ui.recommendationList.innerHTML = recommendations
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function renderThumbnailStrip() {
  ui.thumbStrip.innerHTML = "";

  if (!state.photos.length) {
    ui.thumbStrip.innerHTML = '<p class="thumb-strip-empty">여러 장을 올리면 여기서 사진별 결과와 비교 대상을 확인한다.</p>';
    return;
  }

  state.photos.forEach((photo, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `thumb-button ${photo.id === state.activePhotoId ? "is-active" : ""}`.trim();
    button.addEventListener("click", () => {
      setActivePhoto(photo.id);
    });

    const canvas = document.createElement("canvas");
    canvas.width = 180;
    canvas.height = 120;
    drawThumb(canvas, photo.image);

    const caption = document.createElement("div");
    caption.className = "thumb-caption";
    caption.innerHTML = `
      <strong>${escapeHtml(`${index + 1}. ${truncate(photo.file.name, 20)}`)}</strong>
      <span>${escapeHtml(buildThumbNote(photo))}</span>
    `;

    button.append(canvas, caption);
    ui.thumbStrip.append(button);
  });
}

function setActivePhoto(photoId) {
  if (state.activePhotoId === photoId) {
    return;
  }

  state.activePhotoId = photoId;
  const activePhoto = getActivePhoto();
  if (!activePhoto) {
    return;
  }

  renderPreviewForActivePhoto();
  if (activePhoto.analysis) {
    renderDashboard();
  } else {
    overlayContext.clearRect(0, 0, ui.overlayCanvas.width, ui.overlayCanvas.height);
    renderThumbnailStrip();
  }
}

function drawThumb(canvas, image) {
  const context = canvas.getContext("2d");
  const size = fitWithin(image.naturalWidth, image.naturalHeight, canvas.width, canvas.height);
  const offsetX = Math.round((canvas.width - size.width) / 2);
  const offsetY = Math.round((canvas.height - size.height) / 2);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0c1528";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, offsetX, offsetY, size.width, size.height);
}

function buildThumbNote(photo) {
  if (!photo.analysis) {
    return "분석 전";
  }

  const consistencyScore = photo.consistency?.available ? `일치 ${photo.consistency.score}` : "설명 대기";
  return `AI ${photo.analysis.score} · ${consistencyScore}`;
}

function createSample(image, maxSide) {
  const sampleCanvas = document.createElement("canvas");
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
  const size = fitWithin(image.naturalWidth, image.naturalHeight, maxSide, maxSide);

  sampleCanvas.width = size.width;
  sampleCanvas.height = size.height;
  sampleContext.drawImage(image, 0, 0, size.width, size.height);

  return {
    height: size.height,
    imageData: sampleContext.getImageData(0, 0, size.width, size.height),
    width: size.width,
  };
}

function analyzeImage(sample, file, metadata) {
  const { data } = sample.imageData;
  const { height, width } = sample;
  const pixelCount = width * height;
  const luma = new Float32Array(pixelCount);

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    luma[index] = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
  }

  const columns = clamp(Math.round(width / 40), 8, 14);
  const rows = clamp(Math.round(height / 40), 8, 14);
  const blocks = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const startX = Math.floor((column * width) / columns);
      const endX = Math.floor(((column + 1) * width) / columns);
      const startY = Math.floor((row * height) / rows);
      const endY = Math.floor(((row + 1) * height) / rows);

      let count = 0;
      let gradientCount = 0;
      let gradientSum = 0;
      let noiseCount = 0;
      let noiseSum = 0;
      let saturationSum = 0;
      let sum = 0;
      let sumSquares = 0;

      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          const pixelIndex = y * width + x;
          const offset = pixelIndex * 4;
          const red = data[offset];
          const green = data[offset + 1];
          const blue = data[offset + 2];
          const maxChannel = Math.max(red, green, blue);
          const minChannel = Math.min(red, green, blue);
          const lum = luma[pixelIndex];

          sum += lum;
          sumSquares += lum * lum;
          saturationSum += maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;
          count += 1;

          if (x + 1 < endX) {
            gradientSum += Math.abs(lum - luma[pixelIndex + 1]);
            gradientCount += 1;
          }

          if (y + 1 < endY) {
            gradientSum += Math.abs(lum - luma[pixelIndex + width]);
            gradientCount += 1;
          }

          if (x > startX && x + 1 < endX && y > startY && y + 1 < endY) {
            noiseSum += Math.abs(
              4 * lum
              - luma[pixelIndex - 1]
              - luma[pixelIndex + 1]
              - luma[pixelIndex - width]
              - luma[pixelIndex + width]
            );
            noiseCount += 1;
          }
        }
      }

      const mean = sum / count;
      const variance = Math.max(0, sumSquares / count - mean * mean);

      blocks.push({
        cloneHits: 0,
        column,
        edge: gradientSum / Math.max(gradientCount, 1),
        fingerprint: buildFingerprint(luma, width, startX, endX, startY, endY),
        height: Math.max(1, endY - startY),
        mean,
        row,
        saturation: saturationSum / count,
        scores: {
          color: 0,
          edge: 0,
          mismatch: 0,
          smooth: 0,
        },
        suspicion: 0,
        texture: noiseSum / Math.max(noiseCount, 1),
        variance,
        width: Math.max(1, endX - startX),
        x: startX,
        y: startY,
      });
    }
  }

  const textureMedian = median(blocks.map((block) => block.texture));
  const edgeMedian = median(blocks.map((block) => block.edge));

  blocks.forEach((block, index) => {
    const neighbors = getNeighbors(index, columns, rows).map((neighborIndex) => blocks[neighborIndex]);
    const neighborTexture = average(neighbors.map((neighbor) => neighbor.texture));
    const neighborEdge = average(neighbors.map((neighbor) => neighbor.edge));
    const neighborMean = average(neighbors.map((neighbor) => neighbor.mean));
    const neighborSaturation = average(neighbors.map((neighbor) => neighbor.saturation));
    const brightnessAffinity = clamp(1 - Math.abs(block.mean - neighborMean) / 42, 0, 1);

    const smoothScore =
      clamp((neighborTexture - block.texture) / Math.max(textureMedian * 0.95, 8), 0, 1) * brightnessAffinity;
    const edgeScore =
      clamp((block.edge - Math.max(neighborEdge, edgeMedian)) / Math.max(edgeMedian * 1.2, 12), 0, 1)
      * clamp((1.22 - block.texture / Math.max(neighborTexture, 1)) / 0.72, 0, 1);
    const mismatchScore =
      clamp(Math.abs(block.texture - neighborTexture) / Math.max(textureMedian * 1.4, 20), 0, 1)
      * brightnessAffinity;
    const colorScore =
      clamp(Math.abs(block.saturation - neighborSaturation) / 0.26, 0, 1)
      * clamp(1 - Math.abs(block.mean - neighborMean) / 54, 0, 1);

    block.scores = {
      color: colorScore,
      edge: edgeScore,
      mismatch: mismatchScore,
      smooth: smoothScore,
    };
    block.suspicion = clamp(
      smoothScore * 0.46 + edgeScore * 0.24 + mismatchScore * 0.2 + colorScore * 0.1,
      0,
      1
    );
  });

  let clonePairs = 0;
  for (let index = 0; index < blocks.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < blocks.length; otherIndex += 1) {
      const first = blocks[index];
      const second = blocks[otherIndex];
      const columnDistance = Math.abs(first.column - second.column);
      const rowDistance = Math.abs(first.row - second.row);

      if (columnDistance <= 1 && rowDistance <= 1) {
        continue;
      }

      if (Math.abs(first.mean - second.mean) > 18) {
        continue;
      }

      if (averageAbsoluteDifference(first.fingerprint, second.fingerprint) < 0.32) {
        first.cloneHits += 1;
        second.cloneHits += 1;
        clonePairs += 1;
      }
    }
  }

  const suspiciousBlocks = blocks.filter((block) => block.suspicion >= 0.42 || block.cloneHits >= 2);
  const hotspotBlocks = [...blocks]
    .sort((left, right) => {
      const leftScore = left.suspicion + Math.min(left.cloneHits, 4) * 0.08;
      const rightScore = right.suspicion + Math.min(right.cloneHits, 4) * 0.08;
      return rightScore - leftScore;
    })
    .slice(0, Math.max(4, Math.round(blocks.length * 0.12)));

  const metadataMetric = computeMetadataMetric(file, metadata);
  const textureMetric = clamp(
    average(hotspotBlocks.map((block) => Math.max(block.scores.smooth, block.scores.mismatch))),
    0,
    1
  );
  const repeatMetric = clamp(clonePairs / Math.max(blocks.length * 0.7, 1), 0, 1);
  const edgeMetric = clamp(average(hotspotBlocks.map((block) => block.scores.edge)), 0, 1);
  const coverageMetric = clamp(suspiciousBlocks.length / blocks.length, 0, 1);
  const bytesPerPixel = file.size / Math.max(sample.width * sample.height, 1);
  const compressionMetric = clamp((0.14 - bytesPerPixel) / 0.14, 0, 1) * clamp(edgeMedian / 20, 0, 1);
  const visualProfile = buildVisualProfile(sample, blocks, {
    edgeMetric,
    suspiciousCoverage: coverageMetric,
    textureMetric,
  });
  const evidenceStrength = [
    textureMetric >= 0.38 ? 1 : 0,
    repeatMetric >= 0.2 ? 1 : 0,
    edgeMetric >= 0.3 ? 1 : 0,
    coverageMetric >= 0.22 ? 1 : 0,
    compressionMetric >= 0.26 ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);
  const naturalRelief = clamp(
    visualProfile.focusComplexity * 0.34
    + visualProfile.focusTexture * 0.28
    + (1 - visualProfile.borderPlainness) * 0.18
    + Math.min(visualProfile.contrast, 0.62) * 0.2,
    0,
    1
  );
  const weakSignalPenalty = evidenceStrength <= 1 ? 0.7 : evidenceStrength === 2 ? 0.9 : 1;
  const metadataWeight = evidenceStrength >= 2 ? 0.08 : 0.03;

  const score = Math.round(
    clamp(
      (
        textureMetric * 0.28
        + repeatMetric * 0.2
        + edgeMetric * 0.18
        + coverageMetric * 0.16
        + metadataMetric * metadataWeight
        + compressionMetric * 0.08
        - naturalRelief * 0.18
      ) * 100,
      evidenceStrength === 0 ? 4 : 6,
      97
    ) * weakSignalPenalty
  );

  return {
    blocks,
    clonePairs,
    evidenceStrength,
    metrics: {
      edge: edgeMetric,
      metadata: metadataMetric,
      repeat: repeatMetric,
      texture: textureMetric,
    },
    sampleSize: { height, width },
    score,
    signals: buildSignals({
      bytesPerPixel,
      clonePairs,
      compressionMetric,
      edgeMetric,
      metadata,
      metadataMetric,
      repeatMetric,
      score,
      suspiciousBlocks: suspiciousBlocks.length,
      textureMetric,
    }),
    suspiciousBlocks: suspiciousBlocks.length,
    visualProfile,
  };
}

function buildVisualProfile(sample, blocks, metrics) {
  const { imageData, width, height } = sample;
  const focusBounds = {
    endX: Math.ceil(width * 0.82),
    endY: Math.ceil(height * 0.84),
    startX: Math.floor(width * 0.18),
    startY: Math.floor(height * 0.16),
  };
  const fullStats = computeRegionStats(imageData, {
    endX: width,
    endY: height,
    startX: 0,
    startY: 0,
  });
  const focusStats = computeRegionStats(imageData, focusBounds);
  const borderStats = computeBorderStats(imageData, width, height);
  const fullColors = collectColorProfile(imageData, {
    endX: width,
    endY: height,
    startX: 0,
    startY: 0,
  });
  const focusColors = collectColorProfile(imageData, focusBounds);
  const centerBlocks = blocks.filter((block) => {
    const centerX = block.x + block.width / 2;
    const centerY = block.y + block.height / 2;
    return centerX >= focusBounds.startX
      && centerX <= focusBounds.endX
      && centerY >= focusBounds.startY
      && centerY <= focusBounds.endY;
  });

  return {
    borderPlainness: clamp((1 - borderStats.stddev / 52) * (1 - borderStats.saturation / 0.42), 0, 1),
    brightness: fullStats.mean / 255,
    contrast: clamp(focusStats.stddev / 68, 0, 1),
    editPressure: clamp(metrics.textureMetric * 0.5 + metrics.edgeMetric * 0.3 + metrics.suspiciousCoverage * 0.2, 0, 1),
    focusBrightness: focusStats.mean / 255,
    focusColors,
    focusComplexity: clamp(average(centerBlocks.map((block) => block.edge)) / 24, 0, 1),
    focusTexture: clamp(average(centerBlocks.map((block) => block.texture)) / 40, 0, 1),
    fullColors,
    suspiciousCoverage: metrics.suspiciousCoverage,
  };
}

function computeRegionStats(imageData, bounds) {
  const { data, width } = imageData;
  let count = 0;
  let saturationSum = 0;
  let sum = 0;
  let sumSquares = 0;

  for (let y = bounds.startY; y < bounds.endY; y += 1) {
    for (let x = bounds.startX; x < bounds.endX; x += 1) {
      const offset = (y * width + x) * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const maxChannel = Math.max(red, green, blue);
      const minChannel = Math.min(red, green, blue);
      const luma = red * 0.299 + green * 0.587 + blue * 0.114;

      sum += luma;
      sumSquares += luma * luma;
      saturationSum += maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;
      count += 1;
    }
  }

  const mean = count > 0 ? sum / count : 0;
  const variance = count > 0 ? Math.max(0, sumSquares / count - mean * mean) : 0;

  return {
    mean,
    saturation: count > 0 ? saturationSum / count : 0,
    stddev: Math.sqrt(variance),
  };
}

function computeBorderStats(imageData, width, height) {
  const stripX = Math.max(8, Math.floor(width * 0.12));
  const stripY = Math.max(8, Math.floor(height * 0.12));
  const regions = [
    { endX: width, endY: stripY, startX: 0, startY: 0 },
    { endX: width, endY: height, startX: 0, startY: height - stripY },
    { endX: stripX, endY: height - stripY, startX: 0, startY: stripY },
    { endX: width, endY: height - stripY, startX: width - stripX, startY: stripY },
  ];
  const stats = regions.map((region) => computeRegionStats(imageData, region));

  return {
    saturation: average(stats.map((entry) => entry.saturation)),
    stddev: average(stats.map((entry) => entry.stddev)),
  };
}

function collectColorProfile(imageData, bounds) {
  const { data, width } = imageData;
  const counts = new Map();
  const step = Math.max(1, Math.floor(Math.min(bounds.endX - bounds.startX, bounds.endY - bounds.startY) / 80));
  let total = 0;

  for (let y = bounds.startY; y < bounds.endY; y += step) {
    for (let x = bounds.startX; x < bounds.endX; x += step) {
      const offset = (y * width + x) * 4;
      const family = classifyColorFamily(data[offset], data[offset + 1], data[offset + 2]);
      counts.set(family, (counts.get(family) || 0) + 1);
      total += 1;
    }
  }

  return [...counts.entries()]
    .map(([family, count]) => ({
      family,
      label: colorFamilyLabels[family],
      share: count / Math.max(total, 1),
    }))
    .filter((entry) => entry.share >= 0.06)
    .sort((left, right) => right.share - left.share)
    .slice(0, 4);
}

function classifyColorFamily(red, green, blue) {
  const { hue, saturation, value } = rgbToHsv(red, green, blue);

  if (value <= 0.18) {
    return "black";
  }

  if (saturation <= 0.12) {
    if (value >= 0.84) {
      return "white";
    }

    return value >= 0.56 ? "silver" : "black";
  }

  if (hue < 18 || hue >= 345) {
    return "red";
  }

  if (hue < 42) {
    return "brown";
  }

  if (hue < 72) {
    return "yellow";
  }

  if (hue < 170) {
    return "green";
  }

  if (hue < 262) {
    return "blue";
  }

  if (hue < 318) {
    return "purple";
  }

  return "pink";
}

function rgbToHsv(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
  }

  return {
    hue: hue * 60 < 0 ? hue * 60 + 360 : hue * 60,
    saturation: max === 0 ? 0 : delta / max,
    value: max,
  };
}

function buildSignals(context) {
  const signals = [];

  if (context.textureMetric >= 0.34) {
    signals.push({
      score: context.textureMetric,
      text: `주변보다 지나치게 매끈한 블록이 ${context.suspiciousBlocks}개 감지돼 지우기나 채우기 편집 가능성이 있다.`,
    });
  }

  if (context.repeatMetric >= 0.22 || context.clonePairs >= 2) {
    signals.push({
      score: Math.max(context.repeatMetric, context.clonePairs / 10),
      text: `서로 떨어진 구간에서 비슷한 패턴이 ${context.clonePairs}쌍 반복돼 복제·인페인팅 흔적을 의심할 수 있다.`,
    });
  }

  if (context.edgeMetric >= 0.28) {
    signals.push({
      score: context.edgeMetric,
      text: "경계부 선명도와 내부 질감이 맞지 않는 구간이 있어 합성 테두리나 선택 보정 흔적처럼 보인다.",
    });
  }

  if (context.metadataMetric >= 0.22) {
    signals.push({
      score: context.metadataMetric,
      text: context.metadata.hasMetadata
        ? "촬영 메타데이터는 일부 남아 있지만 원본 카메라 정보가 충분하지 않다."
        : "촬영 메타데이터가 거의 없어 원본 파일인지 판단할 근거가 약하다.",
    });
  }

  if (context.compressionMetric >= 0.24) {
    signals.push({
      score: context.compressionMetric,
      text: `파일 용량 대비 질감이 균일해 강한 후처리나 재저장 흔적이 섞였을 가능성이 있다. (${context.bytesPerPixel.toFixed(2)} BPP)`,
    });
  }

  if (context.score < 36 && signals.length === 0) {
    signals.push({
      score: 0.1,
      text: "강한 AI 편집 신호는 제한적이다. 다만 이 결과만으로 원본 사진이라고 확정할 수는 없다.",
    });
  }

  return signals
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((signal) => signal.text);
}

function extractDescriptionClaims(description) {
  if (!description) {
    return createEmptyClaims();
  }

  const normalized = description.toLowerCase();
  const colors = collectClaimMatches(colorClaimRules, normalized);
  const positiveCondition = collectClaimMatches(positiveConditionRules, normalized);
  const flaws = collectClaimMatches(flawRules, normalized);
  const authenticity = collectClaimMatches(authenticityRules, normalized);
  const accessories = collectClaimMatches(accessoryRules, normalized);

  return {
    accessories,
    authenticity,
    chips: [
      ...colors.map((claim) => ({ label: `색상 ${claim.label}`, tone: "default" })),
      ...positiveCondition.map((claim) => ({ label: claim.label, tone: "default" })),
      ...flaws.map((claim) => ({ label: claim.label, tone: "warning" })),
      ...authenticity.map((claim) => ({ label: claim.label, tone: "muted" })),
      ...accessories.map((claim) => ({ label: claim.label, tone: "muted" })),
    ],
    colors,
    comparableClaimCount:
      colors.length + positiveCondition.length + flaws.length + authenticity.length,
    flaws,
    positiveCondition,
  };
}

function createEmptyClaims() {
  return {
    accessories: [],
    authenticity: [],
    chips: [],
    colors: [],
    comparableClaimCount: 0,
    flaws: [],
    positiveCondition: [],
  };
}

function collectClaimMatches(rules, normalizedText) {
  return rules.filter((rule) => {
    const matched = rule.patterns.some((pattern) => pattern.test(normalizedText));
    const blocked = rule.unless?.some((pattern) => pattern.test(normalizedText));
    return matched && !blocked;
  });
}

function analyzeConsistency(description, claims, visualProfile, analysis, metadata, category) {
  if (!description) {
    return {
      available: false,
      chips: [],
      signals: ["설명을 입력하면 색상, 상태 표현, 실사 주장까지 같이 비교한다."],
    };
  }

  let score = 76;
  const signals = [];
  const confirmations = [];
  const focusColors = visualProfile.focusColors;
  const focusColorFamilies = focusColors.map((entry) => entry.family);
  const focusColorLabels = focusColors.map((entry) => entry.label).join(" · ") || "주요 색상 추출 실패";
  const anomalyMetric = clamp(
    visualProfile.editPressure * 0.56 + analysis.metrics.repeat * 0.14 + visualProfile.contrast * 0.3,
    0,
    1
  );

  if (claims.colors.length > 0) {
    const matchedColors = claims.colors.filter((claim) => focusColorFamilies.includes(claim.family));
    if (matchedColors.length > 0) {
      score += 11;
      confirmations.push(
        `설명 색상(${matchedColors.map((claim) => claim.label).join(", ")})이 사진 중심부 색상과 대체로 맞는다.`
      );
    } else {
      score -= 22;
      signals.push(
        `설명은 ${claims.colors.map((claim) => claim.label).join(", ")} 계열인데 사진 중심부는 ${focusColorLabels} 톤이 더 강하다.`
      );
    }
  }

  if (claims.positiveCondition.length > 0) {
    if (anomalyMetric >= 0.44) {
      score -= 18;
      signals.push(
        `설명은 ${claims.positiveCondition.map((claim) => claim.label).join(", ")}인데 사진에는 편집 또는 표면 불균일 신호가 남아 있다.`
      );
    } else {
      score += 8;
      confirmations.push(
        `상태 설명(${claims.positiveCondition.map((claim) => claim.label).join(", ")})과 크게 충돌하는 강한 신호는 적다.`
      );
    }
  }

  if (claims.flaws.length > 0) {
    if (anomalyMetric >= 0.24 || visualProfile.focusTexture >= 0.28) {
      score += 6;
      confirmations.push(
        `설명에 적은 ${claims.flaws.map((claim) => claim.label).join(", ")} 관련 불균일이 사진에도 일부 보인다.`
      );
    } else {
      score -= 4;
      signals.push(
        `설명에 ${claims.flaws.map((claim) => claim.label).join(", ")}를 적었지만 자동 판독만으로는 근거가 약하다. 확대 사진 확인이 필요하다.`
      );
    }
  }

  if (claims.authenticity.length > 0) {
    const rawPhotoRisk = clamp(
      metadata.hasMetadata ? anomalyMetric * 0.68 : anomalyMetric * 0.78 + analysis.metrics.metadata * 0.22,
      0,
      1
    );
    if (rawPhotoRisk >= 0.48 || visualProfile.borderPlainness >= 0.78) {
      score -= 14;
      signals.push("설명은 실사/직접 촬영을 강조하지만 메타데이터나 보정 신호상 추가 확인이 필요하다.");
    } else {
      score += 4;
      confirmations.push("실사 주장과 정면으로 충돌하는 강한 편집 신호는 크지 않다.");
    }
  }

  if (claims.accessories.length > 0) {
    signals.push(
      `구성품(${claims.accessories.map((claim) => claim.label).join(", ")})은 현재 자동 판독 신뢰도가 낮아 추가 사진 요청이 필요하다.`
    );
  }

  if (claims.comparableClaimCount === 0) {
    score = Math.min(score, 58);
    signals.push("설명에서 비교 가능한 색상·상태 키워드가 적어 일치도 판정 강도가 낮다.");
  }

  if (category === "sneaker" && claims.colors.length === 0) {
    signals.push("운동화는 갑피 색상, 밑창 마모, 사이즈 탭 정보까지 문구로 받는 편이 좋다.");
  }

  if (category === "phone" && claims.accessories.length === 0) {
    signals.push("휴대폰은 박스, 충전 케이블, 전면 전원 켠 화면 사진까지 같이 받는 편이 좋다.");
  }

  score = clamp(Math.round(score), 18, 96);

  const allSignals = [...signals, ...confirmations];
  if (allSignals.length === 0) {
    allSignals.push("설명과 사진이 크게 어긋난다는 강한 신호는 제한적이다.");
  }

  const visibleColorSummary = focusColors.length > 0
    ? `사진 중심부 주요 색상은 ${focusColorLabels}다.`
    : "사진 중심부 색상 요약을 충분히 추출하지 못했다.";

  return {
    available: true,
    chips: claims.chips,
    score,
    signals: allSignals.slice(0, 4),
    summary: `${claims.chips.length}개 키워드를 추출했다. ${visibleColorSummary}`,
  };
}

function analyzePhotoSet(photos, category) {
  if (photos.length < 2) {
    return {
      available: false,
      count: photos.length,
      score: null,
      signals: [],
      summary: "한 상품 사진을 2장 이상 올리면 배경과 톤, 보정 강도의 차이를 비교한다.",
    };
  }

  const signals = [];
  const pairScores = [];

  for (let index = 0; index < photos.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < photos.length; otherIndex += 1) {
      const first = photos[index];
      const second = photos[otherIndex];
      const firstProfile = first.analysis.visualProfile;
      const secondProfile = second.analysis.visualProfile;
      const colorOverlap = computeColorOverlap(firstProfile.focusColors, secondProfile.focusColors);
      const backgroundGap = Math.abs(firstProfile.borderPlainness - secondProfile.borderPlainness);
      const brightnessGap = Math.abs(firstProfile.focusBrightness - secondProfile.focusBrightness);
      const editGap = Math.abs(firstProfile.editPressure - secondProfile.editPressure);
      const aspectGap = Math.abs(
        first.image.naturalWidth / first.image.naturalHeight
        - second.image.naturalWidth / second.image.naturalHeight
      );

      const pairScore = clamp(
        (1 - colorOverlap) * 0.34
        + backgroundGap * 0.22
        + brightnessGap * 0.14
        + editGap * 0.18
        + clamp(aspectGap / 0.35, 0, 1) * 0.12,
        0,
        1
      );
      pairScores.push(pairScore);

      const pairLabel = `${index + 1}번 사진과 ${otherIndex + 1}번 사진`;
      if (colorOverlap < 0.42) {
        signals.push({
          score: 0.58 - colorOverlap,
          text: `${pairLabel}의 주요 색상 구성이 달라 같은 상품 연속 촬영본인지 확인이 필요하다.`,
        });
      }

      if (backgroundGap >= 0.24) {
        signals.push({
          score: backgroundGap,
          text: `${pairLabel}의 배경 단순도 차이가 커서 다른 장소 사진을 섞었거나 일부만 편집했을 가능성이 있다.`,
        });
      }

      if (editGap >= 0.2) {
        signals.push({
          score: editGap,
          text: `${pairLabel} 중 일부 사진에서만 보정 신호가 강해 특정 각도만 수정했을 수 있다.`,
        });
      }

      if (brightnessGap >= 0.22 && category !== "general") {
        signals.push({
          score: brightnessGap * 0.8,
          text: `${pairLabel}의 밝기 차이가 커 ${categoryMeta[category].label} 상태가 사진마다 다르게 보일 수 있다.`,
        });
      }
    }
  }

  const score = Math.round(clamp(average(pairScores) * 100, 8, 94));
  const topSignals = signals
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((signal) => signal.text);

  const summary = topSignals.length > 0
    ? topSignals.join(" ")
    : `${photos.length}장의 사진 사이에서 큰 어긋남은 제한적이다. 같은 상품을 연속 촬영한 흐름처럼 보인다.`;

  return {
    available: true,
    count: photos.length,
    score,
    signals: topSignals,
    summary,
  };
}

function buildConfidenceReport(context) {
  const { activePhoto, category, claims, comparison, photoCount } = context;
  let score = 44;
  const supports = [];
  const limits = [];

  if (photoCount >= 2) {
    score += 18;
    supports.push(`사진 ${photoCount}장을 비교해 단일 컷보다 근거가 많다.`);
  } else {
    limits.push("단일 사진이라 각도별 차이와 사진 섞임 여부를 충분히 확인하기 어렵다.");
  }

  if (claims.comparableClaimCount > 0 && activePhoto.consistency?.available) {
    score += 12;
    supports.push(`설명 키워드 ${claims.comparableClaimCount}개를 사진과 함께 비교했다.`);
  } else {
    limits.push("설명 문구가 적거나 없어 사진-설명 불일치 검수 근거가 약하다.");
  }

  if (activePhoto.metadata.hasMetadata) {
    score += 8;
    supports.push("메타데이터 단서가 일부 남아 있어 원본성 판단 근거를 조금 더 확보했다.");
  } else {
    limits.push("촬영 메타데이터가 부족해 원본 파일 여부는 추가 확인이 필요하다.");
  }

  if (comparison?.available) {
    score += 10;
    supports.push("여러 장 사진 사이의 배경·톤·보정 차이까지 함께 반영했다.");
  }

  if (category !== "general") {
    score += 6;
    supports.push(`${categoryMeta[category].label} 기준 질문과 확인 포인트를 적용했다.`);
  } else {
    limits.push("카테고리가 일반 상품으로 되어 있어 세부 품목 특화 규칙은 제한적이다.");
  }

  const aiScore = activePhoto.analysis.score;
  if (aiScore >= 68 || aiScore <= 24) {
    score += 10;
    supports.push("위험도 점수가 극단 구간이라 해석 방향이 비교적 분명하다.");
  } else if (aiScore >= 42 && aiScore <= 58) {
    limits.push("위험도가 중간 구간이라 추가 촬영본과 판매자 확인이 특히 중요하다.");
  } else {
    score += 4;
  }

  if (activePhoto.analysis.signals.length >= 2) {
    score += 4;
  }

  if (activePhoto.consistency?.available && activePhoto.consistency.score < 50) {
    score += 6;
    supports.push("사진-설명 불일치가 별도 근거로 잡혀 단일 신호보다 설득력이 높다.");
  }

  if (comparison?.available && comparison.score >= 55) {
    score += 6;
    supports.push("사진끼리의 어긋남이 커 교차검증 근거가 강화됐다.");
  }

  if (claims.accessories.length > 0) {
    limits.push("구성품 포함 여부는 자동 판독보다 추가 실사 사진 확인이 더 정확하다.");
  }

  score = clamp(Math.round(score), 28, 94);

  const leadSupport = supports[0] || "현재 입력 정보 기준으로 자동 판단을 계산했다.";
  const leadLimit = limits[0] || "자동 판독이므로 원본 파일과 판매자 확인을 병행해야 한다.";

  return {
    limits: uniqueStrings([...limits, "자동 판독 결과이므로 거래 확정 전에 원본 파일과 추가 사진을 함께 확인해야 한다."]).slice(0, 4),
    score,
    summary: `${leadSupport} 다만 ${leadLimit}`,
  };
}

function buildSuspicionTypes(context) {
  const { activePhoto, comparison } = context;
  const types = [];
  const analysis = activePhoto.analysis;

  if (analysis.metrics.texture >= 0.42) {
    types.push({
      detail: "질감이 주변보다 과하게 매끈한 구간이 있어 하자 삭제나 인페인팅 편집을 의심할 수 있다.",
      label: "하자 삭제 의심",
      tone: "warning",
    });
  }

  if (analysis.metrics.edge >= 0.34 || analysis.visualProfile.borderPlainness >= 0.78) {
    types.push({
      detail: "경계 선명도와 내부 질감이 어긋나거나 배경이 과하게 단순해 배경 합성 가능성이 있다.",
      label: "배경 합성 의심",
      tone: "warning",
    });
  }

  if (analysis.metrics.repeat >= 0.22 || analysis.clonePairs >= 2) {
    types.push({
      detail: "멀리 떨어진 구간의 패턴이 반복돼 복제 붙여넣기 또는 생성형 채우기 흔적처럼 보인다.",
      label: "반복 패턴 편집",
      tone: "danger",
    });
  }

  if (activePhoto.consistency?.available && activePhoto.consistency.score < 56) {
    types.push({
      detail: "판매글 설명과 사진의 색상·상태·구성품 표현이 어긋나 설명 불일치 가능성이 있다.",
      label: "설명 불일치",
      tone: "danger",
    });
  }

  if (comparison?.available && comparison.score >= 35) {
    types.push({
      detail: "사진들 사이 배경, 톤, 보정 강도가 달라 다른 촬영본을 섞었을 가능성을 본다.",
      label: "사진 섞임 의심",
      tone: "warning",
    });
  }

  if (activePhoto.metadata && !activePhoto.metadata.hasMetadata) {
    types.push({
      detail: "메타데이터가 거의 없어 원본 파일 여부는 판매자 추가 확인이 필요하다.",
      label: "원본성 추가 확인",
      tone: "muted",
    });
  }

  if (!types.length) {
    types.push({
      detail: "강한 편집 유형 하나로 단정되기보다는 정상에 가까운 패턴으로 본다.",
      label: "강한 의심 유형 없음",
      tone: "muted",
    });
  }

  return types.slice(0, 4);
}

function buildExecutiveSummary(context) {
  const { activePhoto, comparison, confidence, photoCount, typeBreakdown } = context;
  const consistencyPenalty = activePhoto.consistency?.available
    ? clamp((100 - activePhoto.consistency.score) / 100, 0, 1)
    : 0.18;
  const comparePenalty = comparison?.available
    ? comparison.score / 100
    : (photoCount > 1 ? 0.12 : 0.08);
  const confidenceRelief = confidence ? confidence.score / 100 : 0.5;
  const score = Math.round(clamp(
    activePhoto.analysis.score * 0.5
    + consistencyPenalty * 100 * 0.22
    + comparePenalty * 100 * 0.18
    + (1 - confidenceRelief) * 100 * 0.1,
    8,
    96
  ));

  const primaryType = typeBreakdown[0]?.label || "특이 의심 없음";
  const reasons = [];
  reasons.push(`주요 유형: ${primaryType}`);

  if (activePhoto.analysis.score >= 68) {
    reasons.push("포렌식 신호가 강해 원본 확인 전 거래 진행은 위험하다.");
  } else if (activePhoto.analysis.score >= 42) {
    reasons.push("일부 각도에서만 의심 구간이 보여 확대 사진 재요청이 필요하다.");
  } else {
    reasons.push("강한 편집 신호는 낮지만 자동 판독만으로 확정 판정은 어렵다.");
  }

  if (activePhoto.consistency?.available) {
    reasons.push(
      activePhoto.consistency.score < 56
        ? "설명과 사진이 어긋나 판매 문구를 다시 검증해야 한다."
        : "설명과 사진은 대체로 맞는 편이다."
    );
  }

  if (comparison?.available) {
    reasons.push(
      comparison.score >= 60
        ? "사진들 사이 차이가 커 같은 상품 연속 촬영본인지 재확인이 필요하다."
        : "여러 장 비교에서는 큰 어긋남이 제한적이다."
    );
  }

  return {
    copy: reasons.slice(0, 3).join(" "),
    score,
  };
}

function computeColorOverlap(firstColors, secondColors) {
  const secondMap = new Map(secondColors.map((entry) => [entry.family, entry.share]));
  let overlap = 0;

  firstColors.forEach((entry) => {
    overlap += Math.min(entry.share, secondMap.get(entry.family) || 0);
  });

  return clamp(overlap, 0, 1);
}

function buildRecommendations(context) {
  const recommendations = [];
  const { activePhoto, category, claims, comparison, description, photoCount } = context;

  if (!description) {
    recommendations.push("하자 여부, 구성품, 실촬영 여부를 한 줄 설명으로 먼저 받아라.");
  }

  if (photoCount < 2) {
    recommendations.push("정면·후면·모서리·하자 부위를 포함해 2~4장 사진을 더 요청해 비교 범위를 넓혀라.");
  }

  if (activePhoto.analysis.score >= 68) {
    recommendations.push("원본 사진 또는 편집 전 원본 파일을 요청하고, 의심 영역은 확대 사진으로 다시 받아라.");
  } else if (activePhoto.analysis.score >= 42) {
    recommendations.push("의심 영역이 보이는 부위는 같은 각도로 다시 찍은 확대 사진을 요청해라.");
  }

  if (activePhoto.consistency?.available && activePhoto.consistency.score < 56) {
    recommendations.push("설명에 적은 색상·상태·구성품을 항목별로 다시 확인하고, 누락된 정보는 문구로 보완받아라.");
  }

  if (comparison?.available && comparison.score >= 60) {
    recommendations.push("같은 배경과 조명에서 다시 3면 사진을 요청해 사진 섞임 여부를 확인해라.");
  } else if (comparison?.available && comparison.score >= 35) {
    recommendations.push("사진마다 배경과 톤이 달라 보여 같은 날 같은 상품을 촬영한 것인지 물어봐라.");
  }

  if (claims.accessories.length > 0) {
    recommendations.push("구성품은 자동 판독이 약하니 박스·충전기·케이스를 한 프레임에 담은 사진을 따로 요청해라.");
  }

  switch (category) {
    case "phone":
      recommendations.push("전원이 켜진 화면, 모서리 4곳, IMEI 또는 모델 정보 화면 사진을 추가로 받아라.");
      break;
    case "sneaker":
      recommendations.push("운동화는 밑창 마모, 힐컵, 인솔 사이즈 탭, 앞코 오염을 각각 가까이 찍은 사진을 받아라.");
      break;
    case "device":
      recommendations.push("전자기기는 포트, 나사, 전원 켠 상태, 시리얼 라벨을 별도 사진으로 받아라.");
      break;
    default:
      recommendations.push("정면·측면·후면을 같은 장소에서 다시 찍은 실사 사진을 요청해 전체 상태를 확인해라.");
      break;
  }

  return uniqueStrings(recommendations).slice(0, 5);
}

function buildReportSnapshot(activePhoto, confidence) {
  if (!activePhoto?.analysis) {
    return null;
  }

  return {
    activePhoto,
    category: ui.categorySelect.value,
    categoryLabel: categoryMeta[ui.categorySelect.value].label,
    compare: state.comparison,
    consistency: activePhoto.consistency,
    confidence,
    createdAt: new Date(),
    description: ui.listingDescription.value.trim(),
    photoCount: state.photos.length,
    recommendations: [...state.recommendations],
    signals: [...activePhoto.analysis.signals],
    summary: state.summary,
    typeBreakdown: [...state.typeBreakdown],
  };
}

async function saveReportCard() {
  if (!state.lastReport) {
    return;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 1440;
  canvas.height = 980;

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#0b1324");
  gradient.addColorStop(1, "#122242");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(255, 255, 255, 0.06)";
  for (let x = 0; x < canvas.width; x += 48) {
    context.fillRect(x, 0, 1, canvas.height);
  }
  for (let y = 0; y < canvas.height; y += 48) {
    context.fillRect(0, y, canvas.width, 1);
  }

  drawRoundedRect(context, 52, 52, 1336, 876, 34, "rgba(9, 16, 30, 0.72)");

  context.fillStyle = "#9fe9ff";
  context.font = "700 20px 'Space Grotesk', sans-serif";
  context.fillText("AI Looki Guard Report", 92, 112);

  context.fillStyle = "#f6f8fc";
  context.font = "700 48px 'Noto Sans KR', sans-serif";
  context.fillText(state.lastReport.activePhoto.file.name, 92, 176, 760);

  context.fillStyle = "#a8b5d3";
  context.font = "500 24px 'Noto Sans KR', sans-serif";
  context.fillText(
    `${state.lastReport.categoryLabel} · 사진 ${state.lastReport.photoCount}장 · ${formatReportDate(state.lastReport.createdAt)}`,
    92,
    222
  );

  if (state.lastReport.confidence) {
    const confidenceVerdict = getConfidenceVerdict(state.lastReport.confidence.score);
    context.fillStyle = "#65f5c7";
    context.font = "700 20px 'Space Grotesk', sans-serif";
    context.fillText(
      `Confidence ${state.lastReport.confidence.score} · ${confidenceVerdict.badge}`,
      92,
      254
    );
  }

  if (state.lastReport.summary) {
    context.fillStyle = "#f6f8fc";
    context.font = "600 20px 'Noto Sans KR', sans-serif";
    context.fillText(truncate(state.lastReport.summary.copy, 68), 520, 254, 828);
  }

  drawScoreCard(context, 92, 276, 240, 160, "AI Edit Risk", state.lastReport.activePhoto.analysis.score, "#ff7b78");
  drawScoreCard(
    context,
    356,
    276,
    240,
    160,
    "Photo vs Description",
    state.lastReport.consistency?.available ? state.lastReport.consistency.score : "--",
    "#f5c665"
  );
  drawScoreCard(
    context,
    620,
    276,
    240,
    160,
    "Cross-Photo Check",
    state.lastReport.compare?.available ? state.lastReport.compare.score : "--",
    "#9fe9ff"
  );

  drawRoundedRect(context, 900, 276, 448, 300, 26, "rgba(255, 255, 255, 0.04)");
  drawImageCover(
    context,
    state.lastReport.activePhoto.image,
    920,
    296,
    408,
    260
  );

  drawSection(
    context,
    92,
    480,
    560,
    370,
    "탐지 신호",
    [...state.lastReport.signals, ...(state.lastReport.compare?.signals || [])].slice(0, 5)
  );
  drawSection(
    context,
    676,
    480,
    672,
    370,
    "다음 확인 행동",
    state.lastReport.recommendations
  );

  if (state.lastReport.description) {
    drawRoundedRect(context, 92, 874, 1256, 62, 20, "rgba(255, 255, 255, 0.04)");
    context.fillStyle = "#a8b5d3";
    context.font = "500 18px 'Noto Sans KR', sans-serif";
    drawWrappedText(context, `판매글: ${state.lastReport.description}`, 112, 910, 1216, 30);
  }

  const blob = await canvasToBlob(canvas, "image/png");
  const filename = `ai-looki-report-${Date.now()}.png`;
  downloadBlob(blob, filename);
}

function drawScoreCard(context, x, y, width, height, label, value, accentColor) {
  drawRoundedRect(context, x, y, width, height, 24, "rgba(255, 255, 255, 0.05)");
  context.fillStyle = "#9fe9ff";
  context.font = "700 18px 'Space Grotesk', sans-serif";
  context.fillText(label, x + 24, y + 38);

  context.fillStyle = accentColor;
  context.font = "700 64px 'Space Grotesk', sans-serif";
  context.fillText(String(value), x + 24, y + 112);
}

function drawSection(context, x, y, width, height, title, items) {
  drawRoundedRect(context, x, y, width, height, 24, "rgba(255, 255, 255, 0.04)");
  context.fillStyle = "#9fe9ff";
  context.font = "700 20px 'Space Grotesk', sans-serif";
  context.fillText(title, x + 24, y + 40);

  context.fillStyle = "#f6f8fc";
  context.font = "500 22px 'Noto Sans KR', sans-serif";

  let cursorY = y + 90;
  const lines = items.length > 0 ? items : ["표시할 내용이 없다."];

  lines.slice(0, 5).forEach((item, index) => {
    context.fillStyle = "#65f5c7";
    context.fillText(String(index + 1).padStart(2, "0"), x + 24, cursorY);
    context.fillStyle = "#f6f8fc";
    const lineCount = drawWrappedText(context, item, x + 70, cursorY, width - 98, 34);
    cursorY += 38 + lineCount * 30;
  });
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  let lines = 0;

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, cursorY);
      lines += 1;
      line = word;
      cursorY += lineHeight;
      return;
    }

    line = testLine;
  });

  if (line) {
    context.fillText(line, x, cursorY);
    lines += 1;
  }

  return lines;
}

function drawRoundedRect(context, x, y, width, height, radius, fillStyle) {
  context.save();
  context.fillStyle = fillStyle;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
  context.fill();
  context.restore();
}

function drawImageCover(context, image, x, y, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;

  context.save();
  context.beginPath();
  context.moveTo(x + 20, y);
  context.arcTo(x + width, y, x + width, y + height, 20);
  context.arcTo(x + width, y + height, x, y + height, 20);
  context.arcTo(x, y + height, x, y, 20);
  context.arcTo(x, y, x + width, y, 20);
  context.closePath();
  context.clip();
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  context.restore();
}

function drawPreview(image) {
  const size = fitWithin(image.naturalWidth, image.naturalHeight, 960, 720);
  resizeCanvas(ui.previewCanvas, size.width, size.height);
  resizeCanvas(ui.overlayCanvas, size.width, size.height);

  previewContext.clearRect(0, 0, size.width, size.height);
  previewContext.drawImage(image, 0, 0, size.width, size.height);
  overlayContext.clearRect(0, 0, size.width, size.height);
}

function drawOverlay(blocks, sampleSize, previewSize) {
  overlayContext.clearRect(0, 0, previewSize.width, previewSize.height);

  const scaleX = previewSize.width / sampleSize.width;
  const scaleY = previewSize.height / sampleSize.height;
  let highlighted = 0;

  blocks.forEach((block) => {
    const intensity = clamp(block.suspicion + Math.min(block.cloneHits, 3) * 0.09, 0, 1);
    if (intensity < 0.34) {
      return;
    }

    highlighted += 1;

    overlayContext.fillStyle = `hsla(${28 - intensity * 24}, 100%, 58%, ${0.13 + intensity * 0.22})`;
    overlayContext.fillRect(
      block.x * scaleX,
      block.y * scaleY,
      block.width * scaleX,
      block.height * scaleY
    );

    if (intensity >= 0.56) {
      overlayContext.lineWidth = 1.4;
      overlayContext.strokeStyle = `hsla(${20 - intensity * 16}, 100%, 72%, ${0.32 + intensity * 0.2})`;
      overlayContext.strokeRect(
        block.x * scaleX + 0.5,
        block.y * scaleY + 0.5,
        block.width * scaleX - 1,
        block.height * scaleY - 1
      );
    }
  });

  if (highlighted > 0) {
    overlayContext.fillStyle = "rgba(5, 11, 22, 0.8)";
    overlayContext.fillRect(14, 14, 164, 40);
    overlayContext.fillStyle = "#f6f8fc";
    overlayContext.font = "700 14px 'Space Grotesk', sans-serif";
    overlayContext.fillText(`의심 영역 ${highlighted}곳`, 28, 39);
  }
}

function resetInterface() {
  state.activePhotoId = null;
  state.busy = false;
  state.claims = createEmptyClaims();
  state.comparison = null;
  state.confidence = null;
  state.lastReport = null;
  state.photos = [];
  state.recommendations = [];
  state.summary = null;
  state.typeBreakdown = [];
  state.requestId += 1;

  resizeCanvas(ui.previewCanvas, 960, 720);
  resizeCanvas(ui.overlayCanvas, 960, 720);
  previewContext.clearRect(0, 0, ui.previewCanvas.width, ui.previewCanvas.height);
  overlayContext.clearRect(0, 0, ui.overlayCanvas.width, ui.overlayCanvas.height);

  ui.previewEmpty.hidden = false;
  ui.scanLoading.hidden = true;
  ui.imageName.textContent = "업로드 대기";
  ui.imageSpec.textContent = "JPG / PNG / WEBP";
  ui.listingDescription.value = "";
  ui.categorySelect.value = "general";
  updateDescriptionPlaceholder();

  ui.resultScore.textContent = "--";
  ui.resultBadge.textContent = "대기 중";
  ui.resultBadge.style.background = "rgba(255, 255, 255, 0.08)";
  ui.resultBadge.style.color = "#f6f8fc";
  ui.resultTitle.textContent = "사진을 올리면 검사 결과가 여기에 나온다";
  ui.resultCopy.textContent = "한 장의 사진 안에서 AI 보정 흔적이 의심되는 구간을 찾아 점수와 신호로 정리한다.";
  ui.liveSignals.innerHTML = "<li>이미지를 업로드하면 감지한 신호와 이유를 여기에 정리한다.</li>";
  ui.scannerNote.textContent = "현재 버전은 브라우저 기반 1차 검수 프로토타입이다. 법적 판정이나 원본 증명 용도로는 쓸 수 없다.";
  ui.analyzeButton.disabled = true;
  ui.saveButton.disabled = true;
  ui.resetButton.disabled = false;

  renderConsistency({
    available: false,
    signals: ["설명과 사진을 함께 분석하면 여기서 불일치 포인트를 정리한다."],
  });
  renderCompare({
    available: false,
    count: 0,
  });
  renderConfidence(null);
  renderSummary(null);
  renderTypeBreakdown([]);
  renderRecommendations([
    "검사 결과가 나오면 판매자에게 요청할 사진과 질문을 추천한다.",
  ]);
  renderThumbnailStrip();
  renderHistory();

  setMetric("metadata", null, "촬영 정보와 저장 포맷 단서를 본다.");
  setMetric("texture", null, "지우기·채우기 흔적처럼 매끈한 블록을 찾는다.");
  setMetric("repeat", null, "서로 떨어진 곳의 비슷한 패턴을 비교한다.");
  setMetric("edge", null, "합성 테두리처럼 보이는 경계부를 살핀다.");
}

function renderError(message) {
  ui.resultScore.textContent = "--";
  ui.resultBadge.textContent = "오류";
  ui.resultBadge.style.background = "rgba(255, 123, 120, 0.16)";
  ui.resultBadge.style.color = "#ffd8d7";
  ui.resultTitle.textContent = "검사를 완료하지 못했다";
  ui.resultCopy.textContent = message;
  ui.liveSignals.innerHTML = `<li>${escapeHtml(message)}</li>`;
  ui.scannerNote.textContent = "지원 형식은 JPG, PNG, WEBP다.";
  ui.saveButton.disabled = true;
  overlayContext.clearRect(0, 0, ui.overlayCanvas.width, ui.overlayCanvas.height);
  renderConsistency({
    available: false,
    signals: ["설명 비교는 이미지 로딩이 끝난 뒤 함께 수행된다."],
  });
  renderCompare({
    available: false,
    count: state.photos.length,
  });
  renderConfidence(null);
  renderSummary(null);
  renderTypeBreakdown([]);
}

function setBusy(isBusy) {
  state.busy = isBusy;
  ui.scanLoading.hidden = !isBusy;
  ui.analyzeButton.disabled = isBusy || !state.photos.length;
  ui.saveButton.disabled = isBusy || !state.lastReport;
  ui.resetButton.disabled = isBusy;

  [
    ui.sampleSafeButton,
    ui.sampleEditButton,
    ui.sampleMismatchButton,
    ui.scenarioSafeButton,
    ui.scenarioEditButton,
    ui.scenarioMismatchButton,
  ].forEach((button) => {
    if (button) {
      button.disabled = isBusy;
    }
  });
}

function setMetric(key, value, note) {
  const metric = metricDefinitions[key];
  if (value === null) {
    metric.value.textContent = "--";
    metric.bar.style.width = "0%";
  } else {
    const score = Math.round(value * 100);
    metric.value.textContent = `${score}`;
    metric.bar.style.width = `${score}%`;
  }

  metric.note.textContent = note;
}

function getVerdict(score) {
  if (score >= 68) {
    return {
      badge: "의심 높음",
      badgeBackground: "rgba(255, 123, 120, 0.16)",
      badgeColor: "#ffd8d7",
      title: "AI 편집 또는 강한 후처리 흔적이 뚜렷하다",
    };
  }

  if (score >= 42) {
    return {
      badge: "추가 확인",
      badgeBackground: "rgba(245, 198, 101, 0.16)",
      badgeColor: "#ffe7b2",
      title: "일부 구간에서 AI 보정 신호가 보여 추가 확인이 필요하다",
    };
  }

  return {
    badge: "낮은 편",
    badgeBackground: "rgba(101, 245, 199, 0.14)",
    badgeColor: "#d4ffef",
    title: "강한 AI 편집 신호는 제한적이지만 확정 판정은 아니다",
  };
}

function getConsistencyVerdict(score) {
  if (score >= 78) {
    return {
      badge: "일치 높음",
      badgeBackground: "rgba(101, 245, 199, 0.14)",
      badgeColor: "#d4ffef",
      title: "사진과 설명이 대체로 맞아 보인다",
    };
  }

  if (score >= 56) {
    return {
      badge: "추가 확인",
      badgeBackground: "rgba(245, 198, 101, 0.16)",
      badgeColor: "#ffe7b2",
      title: "일부 문구는 맞지만 확인이 더 필요한 구간이 있다",
    };
  }

  return {
    badge: "불일치 의심",
    badgeBackground: "rgba(255, 123, 120, 0.16)",
    badgeColor: "#ffd8d7",
    title: "설명과 사진 사이에 어긋나는 포인트가 보인다",
  };
}

function getCompareVerdict(score) {
  if (score >= 60) {
    return {
      badge: "섞임 의심",
      badgeBackground: "rgba(255, 123, 120, 0.16)",
      badgeColor: "#ffd8d7",
      title: "사진들 사이 차이가 커 같은 상품 연속 촬영본인지 의심된다",
    };
  }

  if (score >= 35) {
    return {
      badge: "추가 비교",
      badgeBackground: "rgba(245, 198, 101, 0.16)",
      badgeColor: "#ffe7b2",
      title: "사진 사이에 일부 차이가 있어 추가 촬영본 확인이 필요하다",
    };
  }

  return {
    badge: "일관성 높음",
    badgeBackground: "rgba(101, 245, 199, 0.14)",
    badgeColor: "#d4ffef",
    title: "사진들 사이 큰 어긋남은 제한적이다",
  };
}

function getConfidenceVerdict(score) {
  if (score >= 76) {
    return {
      badge: "신뢰도 높음",
      badgeBackground: "rgba(101, 245, 199, 0.14)",
      badgeColor: "#d4ffef",
      title: "입력 근거가 비교적 충분해 자동 판독 신뢰도가 높은 편이다",
    };
  }

  if (score >= 56) {
    return {
      badge: "보통",
      badgeBackground: "rgba(245, 198, 101, 0.16)",
      badgeColor: "#ffe7b2",
      title: "자동 판독 근거는 있지만 추가 사진과 판매자 확인이 필요하다",
    };
  }

  return {
    badge: "낮은 편",
    badgeBackground: "rgba(255, 123, 120, 0.16)",
    badgeColor: "#ffd8d7",
    title: "증거가 부족해 자동 판독만으로 단정하기 어렵다",
  };
}

function getSummaryVerdict(score) {
  if (score >= 70) {
    return {
      badge: "위험도 높음",
      badgeBackground: "rgba(255, 123, 120, 0.16)",
      badgeColor: "#ffd8d7",
      title: "거래 전에 원본 확인과 추가 촬영본 검증이 꼭 필요하다",
    };
  }

  if (score >= 44) {
    return {
      badge: "추가 검증",
      badgeBackground: "rgba(245, 198, 101, 0.16)",
      badgeColor: "#ffe7b2",
      title: "지금 정보만으로는 안심하기 어려워 추가 확인이 필요하다",
    };
  }

  return {
    badge: "상대적 안정",
    badgeBackground: "rgba(101, 245, 199, 0.14)",
    badgeColor: "#d4ffef",
    title: "현재 입력 기준으로는 상대적으로 안정적인 편이다",
  };
}

function getClaimChipClass(tone) {
  if (tone === "warning") {
    return "claim-chip-warning";
  }

  if (tone === "danger") {
    return "claim-chip-danger";
  }

  if (tone === "muted") {
    return "claim-chip-muted";
  }

  return "";
}

function computeMetadataMetric(file, metadata) {
  if (metadata.format === "jpeg") {
    return metadata.hasExif ? 0.02 : 0.18;
  }

  if (metadata.format === "png" || metadata.format === "webp") {
    return metadata.hasMetadata ? 0.04 : 0.1;
  }

  return file.type.startsWith("image/") ? 0.08 : 0.16;
}

function inspectMetadata(file, arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const metadata = {
    format: "unknown",
    hasExif: false,
    hasMetadata: false,
  };

  if (isJpeg(bytes)) {
    metadata.format = "jpeg";
    let offset = 2;

    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = bytes[offset + 1];
      if (marker === 0xda || marker === 0xd9) {
        break;
      }

      const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (size < 2) {
        break;
      }

      const chunkText = readAscii(bytes, offset + 4, Math.min(size - 2, 24));
      if (chunkText.startsWith("Exif")) {
        metadata.hasExif = true;
        metadata.hasMetadata = true;
      }

      offset += size + 2;
    }

    return metadata;
  }

  if (isPng(bytes)) {
    metadata.format = "png";
    let offset = 8;

    while (offset + 8 < bytes.length) {
      const length = readUint32BE(bytes, offset);
      const type = readAscii(bytes, offset + 4, 4);
      if (type === "eXIf" || type === "iTXt" || type === "tEXt") {
        metadata.hasMetadata = true;
      }
      offset += length + 12;
    }

    return metadata;
  }

  if (isWebp(bytes)) {
    metadata.format = "webp";
    let offset = 12;

    while (offset + 8 <= bytes.length) {
      const type = readAscii(bytes, offset, 4);
      const size = readUint32LE(bytes, offset + 4);
      if (type === "EXIF" || type === "XMP ") {
        metadata.hasMetadata = true;
      }
      offset += 8 + size + (size % 2);
    }

    return metadata;
  }

  metadata.format = file.type.replace("image/", "") || "unknown";
  return metadata;
}

function buildFingerprint(luma, width, startX, endX, startY, endY) {
  const samples = [];
  const gridSize = 3;

  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      const x = Math.min(endX - 1, Math.floor(startX + ((column + 0.5) * (endX - startX)) / gridSize));
      const y = Math.min(endY - 1, Math.floor(startY + ((row + 0.5) * (endY - startY)) / gridSize));
      samples.push(luma[y * width + x]);
    }
  }

  const mean = average(samples);
  const deviation = Math.sqrt(average(samples.map((value) => (value - mean) ** 2))) || 1;
  return samples.map((value) => (value - mean) / deviation);
}

function getNeighbors(index, columns, rows) {
  const row = Math.floor(index / columns);
  const column = index % columns;
  const neighbors = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) {
        continue;
      }

      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (nextRow < 0 || nextRow >= rows || nextColumn < 0 || nextColumn >= columns) {
        continue;
      }

      neighbors.push(nextRow * columns + nextColumn);
    }
  }

  return neighbors;
}

function metadataSummary(metadata) {
  if (metadata.format === "jpeg") {
    return metadata.hasExif ? "JPEG EXIF가 일부 남아 있다." : "JPEG EXIF가 보이지 않는다.";
  }

  if (metadata.hasMetadata) {
    return `${metadata.format.toUpperCase()} 메타데이터가 일부 남아 있다.`;
  }

  return `${metadata.format.toUpperCase()} 메타데이터는 거의 없다.`;
}

function metadataNote(metadata) {
  if (metadata.format === "jpeg" && !metadata.hasExif) {
    return "JPEG EXIF가 없지만 단독 의심 근거로는 쓰지 않는다.";
  }

  if (metadata.hasMetadata) {
    return "메타데이터는 원본성 판단의 약한 보조 신호로만 본다.";
  }

  return "메타데이터 단서는 약하게만 반영하고, 질감·반복·경계 신호를 더 본다.";
}

function textureNote(analysis) {
  if (analysis.metrics.texture >= 0.52) {
    return `주변보다 매끈한 블록이 ${analysis.suspiciousBlocks}개 겹친다.`;
  }

  if (analysis.metrics.texture >= 0.28) {
    return "일부 영역에서 질감 단절이 보여 확대 확인이 필요하다.";
  }

  return "질감 불연속 신호는 비교적 약하다.";
}

function repeatNote(analysis) {
  if (analysis.clonePairs >= 4) {
    return `유사 패턴 ${analysis.clonePairs}쌍이 반복된다.`;
  }

  if (analysis.clonePairs >= 2) {
    return "작은 반복 패턴이 보여 복제 편집 가능성을 본다.";
  }

  return "강한 반복 패턴 신호는 많지 않다.";
}

function edgeNote(analysis) {
  if (analysis.metrics.edge >= 0.44) {
    return "경계 선명도와 내부 질감의 차이가 크다.";
  }

  if (analysis.metrics.edge >= 0.24) {
    return "일부 테두리에서 선택 보정 흔적이 의심된다.";
  }

  return "경계 이질감은 비교적 낮은 편이다.";
}

function getActivePhoto(photos = state.photos) {
  return photos.find((photo) => photo.id === state.activePhotoId) || photos[0] || null;
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image-load-failed"));
    };

    image.src = objectUrl;
  });
}

async function createSampleScenario(scenarioId) {
  switch (scenarioId) {
    case "safe":
      return {
        category: "phone",
        description: "아이폰 14 프로 블랙 256GB 실사입니다. 생활기스 거의 없고 박스 포함입니다.",
        files: [
          await createPhoneSampleFile("sample-safe-1.png", { angle: -4, color: "#1e2430", scratches: false, suspicious: false }),
          await createPhoneSampleFile("sample-safe-2.png", { angle: 5, color: "#1e2430", scratches: false, suspicious: false, background: "#dfe4e8" }),
        ],
        label: "정상 예시",
      };
    case "edit":
      return {
        category: "phone",
        description: "갤럭시 블랙 256GB 실사입니다. 상태 좋고 기스 거의 없습니다.",
        files: [
          await createPhoneSampleFile("sample-edit-1.png", { angle: -6, color: "#20232c", scratches: false, suspicious: true }),
          await createPhoneSampleFile("sample-edit-2.png", { angle: 7, color: "#20232c", scratches: false, suspicious: true, background: "#c6d8df" }),
        ],
        label: "편집 의심 예시",
      };
    default:
      return {
        category: "sneaker",
        description: "화이트 스니커즈 270, 새상품급이고 오염 없으며 풀박스입니다.",
        files: [
          await createSneakerSampleFile("sample-mismatch-1.png", { color: "#c84a42", background: "#b9ada0", dirty: true }),
          await createSneakerSampleFile("sample-mismatch-2.png", { color: "#7e6653", background: "#8ea5af", dirty: true, altBackground: true }),
        ],
        label: "불일치 예시",
      };
  }
}

async function createPhoneSampleFile(name, options) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 720;
  const context = canvas.getContext("2d");

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, options.background || "#e8ecef");
  background.addColorStop(1, "#cfd6dc");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawGridTexture(context, canvas.width, canvas.height, {
    color: "rgba(255,255,255,0.18)",
    gap: 44,
    lineWidth: 1,
  });
  sprinkleNoise(context, canvas.width, canvas.height, 2800, "rgba(255,255,255,0.04)");

  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((options.angle || 0) * Math.PI / 180);

  context.shadowColor = "rgba(0,0,0,0.22)";
  context.shadowBlur = 36;
  context.shadowOffsetY = 16;
  drawRoundedRect(context, -170, -260, 340, 520, 42, options.color || "#222834");
  context.shadowColor = "transparent";

  drawRoundedRect(context, -142, -228, 284, 458, 28, "#0a0d13");
  const screenGradient = context.createLinearGradient(-100, -210, 140, 210);
  screenGradient.addColorStop(0, "#2f3848");
  screenGradient.addColorStop(1, "#0e1118");
  drawRoundedRect(context, -126, -212, 252, 426, 20, screenGradient);

  context.fillStyle = "rgba(255,255,255,0.08)";
  context.fillRect(-118, -204, 84, 240);
  context.fillStyle = "rgba(255,255,255,0.04)";
  context.fillRect(22, -180, 76, 182);

  if (options.scratches) {
    context.strokeStyle = "rgba(255,255,255,0.22)";
    context.lineWidth = 2.2;
    context.beginPath();
    context.moveTo(-30, -48);
    context.lineTo(60, 14);
    context.moveTo(-84, 22);
    context.lineTo(-8, 64);
    context.stroke();
  }

  if (options.suspicious) {
    context.fillStyle = "rgba(215,224,230,0.95)";
    context.fillRect(-82, 24, 122, 82);

    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        context.fillStyle = (row + column) % 2 === 0 ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)";
        context.fillRect(54 + column * 18, -228 + row * 18, 14, 14);
      }
    }

    context.fillStyle = "rgba(255,255,255,0.72)";
    context.fillRect(-150, -36, 54, 110);
  }

  context.restore();

  return canvasToFile(canvas, name);
}

async function createSneakerSampleFile(name, options) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 720;
  const context = canvas.getContext("2d");

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, options.background || "#d9d2c7");
  background.addColorStop(1, options.altBackground ? "#758c97" : "#c4b5a8");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawGridTexture(context, canvas.width, canvas.height, {
    color: "rgba(255,255,255,0.1)",
    gap: 52,
    lineWidth: 1,
  });
  sprinkleNoise(context, canvas.width, canvas.height, 3200, "rgba(0,0,0,0.04)");

  context.save();
  context.translate(260, 420);
  context.rotate(-8 * Math.PI / 180);

  context.shadowColor = "rgba(0,0,0,0.18)";
  context.shadowBlur = 28;
  context.shadowOffsetY = 16;
  context.beginPath();
  context.moveTo(0, 90);
  context.bezierCurveTo(80, 18, 216, -28, 398, 18);
  context.bezierCurveTo(472, 36, 504, 64, 540, 78);
  context.lineTo(540, 132);
  context.lineTo(0, 132);
  context.closePath();
  context.fillStyle = options.color || "#f5f5f2";
  context.fill();
  context.shadowColor = "transparent";

  context.fillStyle = "#f1efe9";
  context.fillRect(12, 108, 520, 28);
  context.fillStyle = "#272a2f";
  context.fillRect(406, 26, 56, 24);
  context.fillStyle = "rgba(255,255,255,0.62)";
  context.fillRect(86, 26, 182, 12);
  context.fillRect(86, 48, 162, 10);

  if (options.dirty) {
    context.fillStyle = "rgba(101,72,52,0.36)";
    context.beginPath();
    context.ellipse(150, 78, 42, 20, 0.1, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(88,60,42,0.32)";
    context.beginPath();
    context.ellipse(298, 64, 54, 18, -0.2, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();

  return canvasToFile(canvas, name);
}

function drawGridTexture(context, width, height, options) {
  context.save();
  context.strokeStyle = options.color;
  context.lineWidth = options.lineWidth;
  for (let x = 0; x <= width; x += options.gap) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += options.gap) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();
}

function sprinkleNoise(context, width, height, count, color) {
  context.save();
  context.fillStyle = color;
  for (let index = 0; index < count; index += 1) {
    context.fillRect(
      Math.random() * width,
      Math.random() * height,
      1 + Math.random() * 2,
      1 + Math.random() * 2
    );
  }
  context.restore();
}

function updateDescriptionPlaceholder() {
  ui.listingDescription.placeholder = categoryMeta[ui.categorySelect.value].placeholder;
}

function resizeCanvas(canvas, width, height) {
  canvas.width = width;
  canvas.height = height;
}

function fitWithin(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    height: Math.max(1, Math.round(height * ratio)),
    width: Math.max(1, Math.round(width * ratio)),
  };
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageAbsoluteDifference(first, second) {
  let total = 0;
  for (let index = 0; index < first.length; index += 1) {
    total += Math.abs(first[index] - second[index]);
  }
  return total / first.length;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function truncate(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes}B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function formatReportDate(date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isJpeg(bytes) {
  return bytes[0] === 0xff && bytes[1] === 0xd8;
}

function isPng(bytes) {
  return bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a;
}

function isWebp(bytes) {
  return readAscii(bytes, 0, 4) === "RIFF" && readAscii(bytes, 8, 4) === "WEBP";
}

function readAscii(bytes, start, length) {
  return Array.from(bytes.slice(start, start + length), (value) => String.fromCharCode(value)).join("");
}

function readUint32BE(bytes, offset) {
  return (
    (bytes[offset] << 24)
    | (bytes[offset + 1] << 16)
    | (bytes[offset + 2] << 8)
    | bytes[offset + 3]
  ) >>> 0;
}

function readUint32LE(bytes, offset) {
  return (
    bytes[offset]
    | (bytes[offset + 1] << 8)
    | (bytes[offset + 2] << 16)
    | (bytes[offset + 3] << 24)
  ) >>> 0;
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("canvas-blob-failed"));
        return;
      }
      resolve(blob);
    }, type);
  });
}

async function canvasToFile(canvas, name) {
  const blob = await canvasToBlob(canvas, "image/png");
  return new File([blob], name, { type: "image/png" });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function loadHistory() {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveHistoryEntry(report, summary, typeBreakdown) {
  if (!report || !summary) {
    return;
  }

  const entry = {
    aiScore: report.activePhoto.analysis.score,
    compareScore: report.compare?.available ? report.compare.score : "--",
    confidenceScore: report.confidence?.score ?? "--",
    consistencyScore: report.consistency?.available ? report.consistency.score : "--",
    copy: summary.copy,
    summaryScore: summary.score,
    time: formatHistoryTime(report.createdAt),
    title: `${report.categoryLabel} · ${truncate(report.activePhoto.file.name, 28)}`,
    types: typeBreakdown.map((item) => item.label),
  };

  const history = loadHistory();
  const nextHistory = [entry, ...history].slice(0, 5);

  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  } catch (error) {
    // Ignore storage failures in private browsing or quota limits.
  }
}

function formatHistoryTime(date) {
  const value = date instanceof Date ? date : new Date(date);
  return `${String(value.getMonth() + 1).padStart(2, "0")}.${String(value.getDate()).padStart(2, "0")} ${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}
