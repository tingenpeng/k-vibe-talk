// K-Vibe Talk 主應用程式邏輯
// 支援：Web Speech API 韓語標準/快嘴朗讀、麥克風語音跟讀比對、萬用句型積木組裝、店員連珠炮盲聽、RPG分支闖關、AI自由對談、SOS現場救急大字卡

const state = {
  currentTab: 'patterns',       // 'patterns' | 'rapid' | 'rpg' | 'sos'
  currentCategory: 'all',       // 'all' | 'clinic' | 'pharmacy' | 'shopping' | 'dining' | 'daily'
  practiceMode: 'speaking',     // 'speaking' (開口實戰) | 'commute' (通勤免開口)
  speechSpeed: 1.0,             // 0.85 (慢速清晰) | 1.0 (正常速) | 1.2 (店員快嘴速)
  showLiaison: true,
  showChunkNote: true,
  blindListenMode: false,
  selectedBlocks: {},           // 紀錄每個 pattern 當前選擇的 { opener: 0, target: 0, ending: 0 }
  activeScenarioId: 'rpg_clinic',
  activeScenarioStep: 1,
  rpgSubMode: 'script',         // 'script' | 'ai'
  aiPersona: 'clinic',
  customSosCards: [],
  drillQuestions: [],
  drillIndex: 0
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadLocalData();
  initPatternSelections();
  renderCategoryFilter();
  renderAllViews();
  initAiChatWelcome();
  updateApiKeyBadge();
});

function loadLocalData() {
  try {
    const savedCustom = localStorage.getItem('kvibe_custom_sos');
    if (savedCustom) {
      state.customSosCards = JSON.parse(savedCustom);
    }
  } catch (e) {
    console.warn('LocalStorage 讀取略過', e);
  }
}

function initPatternSelections() {
  K_VIBE_DATA.patterns.forEach(pat => {
    state.selectedBlocks[pat.id] = { opener: 0, target: 0, ending: 0 };
  });
}

// ==================== 韓文語音合成 (TTS) 與麥克風跟讀評分 (STT) ====================
let activeUtterance = null; // 保留參照避免被垃圾回收

function speakKorean(text, customRate = null) {
  if (!('speechSynthesis' in window)) {
    alert('您的瀏覽器目前不支援語音朗讀功能');
    return;
  }

  // 1. 若處於暫停或卡死狀態，先強制 resume 再 cancel
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();
  } catch (e) {
    console.warn('SpeechSynthesis reset warn', e);
  }

  // 過濾掉括號內的數字提示避免重複念
  const cleanText = text.replace(/\([^)]*\)/g, '').trim();
  if (!cleanText) return;

  const utter = new SpeechSynthesisUtterance(cleanText);
  utter.lang = 'ko-KR';
  utter.rate = customRate !== null ? customRate : (state.speechSpeed || 1.0);
  utter.pitch = 1.0;

  // 尋找韓文發音聲音
  const voices = window.speechSynthesis.getVoices();
  const krVoice = voices.find(v => v.lang && (v.lang === 'ko-KR' || v.lang.startsWith('ko')) && (v.name.includes('Yuna') || v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Korean')))
               || voices.find(v => v.lang && (v.lang === 'ko-KR' || v.lang.startsWith('ko')));
  if (krVoice) {
    utter.voice = krVoice;
  }

  utter.onend = () => {
    activeUtterance = null;
  };

  utter.onerror = (e) => {
    console.warn('SpeechSynthesis error:', e);
    activeUtterance = null;
  };

  activeUtterance = utter;

  // 避免 Safari / Chrome 背景佇列卡住，延遲 20ms 觸發
  setTimeout(() => {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utter);
    } catch (err) {
      console.error('Speech speak failed', err);
    }
  }, 20);
}

// 確保部分瀏覽器非同步載入語音包
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

// 麥克風跟讀練習比對
function startShadowingPractice(targetKr, resultElemId) {
  const resultEl = document.getElementById(resultElemId);
  if (!resultEl) return;

  if (state.practiceMode === 'commute') {
    resultEl.classList.remove('hidden');
    resultEl.innerHTML = `<span class="text-amber-800">🚇 目前為「通勤免開口模式」：請在心裡默念跟讀三次「<strong class="font-kr">${targetKr}</strong>」，即可過關！</span>`;
    speakKorean(targetKr);
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    resultEl.classList.remove('hidden');
    resultEl.innerHTML = `<span class="text-rose-700">💡 您的瀏覽器未開放語音辨識權限，已為您播放標準韓文發音，請直接開口跟讀！</span>`;
    speakKorean(targetKr);
    return;
  }

  const rec = new SpeechRecognition();
  rec.lang = 'ko-KR';
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `<span class="text-rose-600 font-semibold animate-pulse">🎙️ 請開口說韓文... 正在聆聽中（請放心用自然語速講出來）</span>`;

  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const score = calcKoreanSimilarity(targetKr, transcript);
    let badge = '';
    if (score >= 70) {
      badge = `<span class="px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 font-bold">🌟 韓國人秒懂！(${score}% 契合)</span>`;
    } else if (score >= 40) {
      badge = `<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">👍 語意有通！再順一次連音更自然 (${score}%)</span>`;
    } else {
      badge = `<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">💪 再試一次！注意紅字連音喔</span>`;
    }
    resultEl.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>你說的是：<strong class="font-kr text-espresso">${transcript}</strong></div>
        ${badge}
      </div>
    `;
  };

  rec.onerror = () => {
    resultEl.innerHTML = `<span class="text-mocha">🎙️ 沒有聽清楚或未允許麥克風權限，請點「🔊 聽發音」邊聽邊開口跟讀練習喔！</span>`;
  };

  rec.start();
}

function calcKoreanSimilarity(target, spoken) {
  const clean = s => s.replace(/[^가-힣0-9]/g, '');
  const a = clean(target);
  const b = clean(spoken);
  if (!a || !b) return 50;
  let match = 0;
  const setA = new Set(a.split(''));
  for (const ch of b) {
    if (setA.has(ch)) match++;
  }
  const ratio = Math.min(100, Math.round((match / Math.max(1, Math.min(a.length, b.length))) * 100));
  return Math.max(35, ratio);
}

// ==================== 頂部狀態與分類切換 ====================
function togglePracticeMode() {
  state.practiceMode = state.practiceMode === 'speaking' ? 'commute' : 'speaking';
  const icon = document.getElementById('practiceModeIcon');
  const label = document.getElementById('practiceModeLabel');
  if (state.practiceMode === 'commute') {
    icon.textContent = '🚇';
    label.textContent = '通勤免開口';
  } else {
    icon.textContent = '🗣️';
    label.textContent = '開口實戰';
  }
  renderAllViews();
}

function toggleSpeechSpeed() {
  if (state.speechSpeed === 1.0) {
    state.speechSpeed = 1.22;
    document.getElementById('speedToggleLabel').textContent = '店員快嘴 1.2x';
  } else if (state.speechSpeed === 1.22) {
    state.speechSpeed = 0.82;
    document.getElementById('speedToggleLabel').textContent = '慢速清晰 0.8x';
  } else {
    state.speechSpeed = 1.0;
    document.getElementById('speedToggleLabel').textContent = '正常速 1.0x';
  }
}

function updateDisplayPrefs() {
  state.showLiaison = document.getElementById('toggleLiaison').checked;
  state.showChunkNote = document.getElementById('toggleChunkNote').checked;
  renderAllViews();
}

function switchMainTab(tabId) {
  state.currentTab = tabId;
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('text-rose-600', 'font-bold');
    btn.classList.add('text-mocha', 'font-medium');
  });
  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-mocha', 'font-medium');
    activeBtn.classList.add('text-rose-600', 'font-bold');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCategoryFilter() {
  const bar = document.getElementById('categoryFilterBar');
  bar.innerHTML = K_VIBE_DATA.categories.map(cat => {
    const active = state.currentCategory === cat.id;
    return `
      <button onclick="selectCategory('${cat.id}')" class="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
        active
          ? 'bg-espresso text-white shadow-sm'
          : 'bg-oat/80 text-mocha hover:bg-oat hover:text-espresso'
      }">
        <span>${cat.icon}</span>
        <span>${cat.name}</span>
      </button>
    `;
  }).join('');
}

function selectCategory(catId) {
  state.currentCategory = catId;
  renderCategoryFilter();
  renderAllViews();
}

function renderAllViews() {
  renderPatterns();
  renderRapidFire();
  renderScenarios();
  renderSosCards();
}

// ==================== TAB 1: 萬用句型積木 (Pattern Lego) ====================
function renderPatterns() {
  const container = document.getElementById('patternsContainer');
  const list = K_VIBE_DATA.patterns.filter(
    p => state.currentCategory === 'all' || p.category === state.currentCategory
  );

  if (list.length === 0) {
    container.innerHTML = `<div class="bg-white rounded-3xl p-8 text-center text-mocha text-sm border border-oat">此分類的句型積木即將擴充，請先切換至「全部情境」或查看「韓國現場救急面板」喔！</div>`;
    return;
  }

  container.innerHTML = list.map(pat => {
    const sel = state.selectedBlocks[pat.id] || { opener: 0, target: 0, ending: 0 };
    const bOpen = pat.blocks.opener[sel.opener];
    const bTarget = pat.blocks.target[sel.target];
    const bEnd = pat.blocks.ending[sel.ending];

    const fullKr = `${bOpen.kr} ${bTarget.kr} ${bEnd.kr}`;
    const fullLiaison = `${bOpen.liaison} ${bTarget.liaison} ${bEnd.liaison}`;
    const fullZh = `${bOpen.zh} ${bTarget.zh}${bEnd.zh}`;
    const shadowId = `shadow-pat-${pat.id}`;

    return `
      <article class="bg-white rounded-3xl border border-oat shadow-sm overflow-hidden">
        <!-- 卡片標題區 -->
        <div class="p-4 sm:p-5 border-b border-oat/80 bg-cream/40 flex flex-wrap items-start justify-between gap-2">
          <div>
            <span class="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 mb-1">${getCategoryName(pat.category)}</span>
            <h3 class="font-bold text-base sm:text-lg text-espresso">${pat.title}</h3>
            <p class="text-xs text-mocha mt-0.5">${pat.subtitle}</p>
          </div>
          <span class="text-[11px] px-2.5 py-1 rounded-xl bg-sage-50 text-sage-700 font-semibold border border-sage-100">
            ✨ ${pat.goodTone}
          </span>
        </div>

        <!-- 動態組裝成品展示舞台 -->
        <div class="p-4 sm:p-5 bg-gradient-to-br from-cream to-oat/50 border-b border-oat">
          <div class="text-[11px] font-bold text-mocha uppercase tracking-wider mb-1.5">👇 點選下方色塊即時換句・點句子聽發音</div>
          <div onclick="speakKorean('${escapeQuotes(fullKr)}')" class="cursor-pointer group bg-white rounded-2xl p-4 border-2 border-rose-200 hover:border-rose-400 transition shadow-sm">
            <!-- 韓文三色語塊拼圖 -->
            <div class="font-kr font-extrabold text-xl sm:text-2xl leading-relaxed flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span class="px-2 py-0.5 rounded-lg bg-amber-100/90 text-amber-950">${bOpen.kr}</span>
              <span class="px-2 py-0.5 rounded-lg bg-rose-100/90 text-rose-900">${bTarget.kr}</span>
              <span class="px-2 py-0.5 rounded-lg bg-sage-100/90 text-sage-900">${bEnd.kr}</span>
              <span class="text-rose-500 text-base ml-1 group-hover:scale-110 transition inline-block">🔊</span>
            </div>

            <!-- 實際連音標示 -->
            ${state.showLiaison ? `
              <div class="mt-2 flex items-center gap-1.5 text-xs sm:text-sm font-kr text-rose-600 font-semibold">
                <span class="px-1.5 py-0.5 rounded bg-rose-50 text-[11px] border border-rose-200">韓國人實際連音</span>
                <span>[ ${fullLiaison} ]</span>
              </div>
            ` : ''}

            <!-- 中文語意 -->
            <p class="mt-2 text-sm sm:text-base font-bold text-espresso">${fullZh}</p>

            <!-- 語塊迷你文法拆解 -->
            ${state.showChunkNote ? `
              <div class="mt-3 pt-2.5 border-t border-oat grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-mocha">
                <div><strong class="text-amber-900">開場：</strong>${bOpen.note}</div>
                <div><strong class="text-rose-800">核心：</strong>${bTarget.note}</div>
                <div><strong class="text-sage-800">語尾：</strong>${bEnd.note}</div>
              </div>
            ` : ''}
          </div>

          <!-- 互動操作按鈕列 -->
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <button onclick="speakKorean('${escapeQuotes(fullKr)}', 1.0)" class="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-sm transition">
              🔊 正常語速朗讀
            </button>
            <button onclick="speakKorean('${escapeQuotes(fullKr)}', 0.78)" class="px-3 py-2 rounded-xl bg-white hover:bg-oat text-espresso border border-stone-300 text-xs font-semibold transition">
              🐢 慢速聽連音 (0.78x)
            </button>
            <button onclick="startShadowingPractice('${escapeQuotes(fullKr)}', '${shadowId}')" class="px-3.5 py-2 rounded-xl bg-sage-600 hover:bg-sage-700 text-white text-xs font-bold shadow-sm transition">
              ${state.practiceMode === 'commute' ? '🚇 通勤默念檢測' : '🎙️ 開口跟讀檢測'}
            </button>
            <button onclick="openBigCard('${escapeQuotes(fullKr)}', '${escapeQuotes(fullLiaison)}', '${escapeQuotes(fullZh)}', '${escapeQuotes(pat.title)}')" class="ml-auto px-3 py-2 rounded-xl bg-oat hover:bg-stone-200 text-espresso text-xs font-semibold transition">
              🔍 放大給店員看
            </button>
          </div>
          <div id="${shadowId}" class="hidden mt-2.5 p-3 rounded-xl bg-white border border-oat text-xs"></div>
        </div>

        <!-- 三欄替換積木選擇器 -->
        <div class="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Column 1: Opener -->
          <div>
            <div class="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>1. 選擇「禮貌緩衝開場」</span>
            </div>
            <div class="space-y-1.5">
              ${pat.blocks.opener.map((item, idx) => `
                <button onclick="selectPatternBlock('${pat.id}', 'opener', ${idx})" class="chunk-pill w-full text-left p-2.5 rounded-xl border text-xs transition ${
                  sel.opener === idx
                    ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400 font-bold text-espresso'
                    : 'bg-cream/50 border-oat hover:bg-amber-50/40 text-mocha'
                }">
                  <div class="font-kr text-sm text-espresso">${item.kr}</div>
                  <div class="text-[11px] text-mocha mt-0.5">${item.zh}</div>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Column 2: Target -->
          <div>
            <div class="text-xs font-bold text-rose-800 mb-2 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>2. 替換「你的核心需求」</span>
            </div>
            <div class="space-y-1.5">
              ${pat.blocks.target.map((item, idx) => `
                <button onclick="selectPatternBlock('${pat.id}', 'target', ${idx})" class="chunk-pill w-full text-left p-2.5 rounded-xl border text-xs transition ${
                  sel.target === idx
                    ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-400 font-bold text-espresso'
                    : 'bg-cream/50 border-oat hover:bg-rose-50/40 text-mocha'
                }">
                  <div class="font-kr text-sm text-espresso">${item.kr}</div>
                  <div class="text-[11px] text-mocha mt-0.5">${item.zh}</div>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Column 3: Ending -->
          <div>
            <div class="text-xs font-bold text-sage-800 mb-2 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-sage-600"></span>
              <span>3. 選擇「不卑不亢結尾」</span>
            </div>
            <div class="space-y-1.5">
              ${pat.blocks.ending.map((item, idx) => `
                <button onclick="selectPatternBlock('${pat.id}', 'ending', ${idx})" class="chunk-pill w-full text-left p-2.5 rounded-xl border text-xs transition ${
                  sel.ending === idx
                    ? 'bg-sage-50 border-sage-600 ring-1 ring-sage-600 font-bold text-espresso'
                    : 'bg-cream/50 border-oat hover:bg-sage-50/40 text-mocha'
                }">
                  <div class="font-kr text-sm text-espresso">${item.kr}</div>
                  <div class="text-[11px] text-mocha mt-0.5">${item.zh}</div>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- 韓國人語感潛台詞與 NG 對照 -->
        ${state.showChunkNote ? `
          <div class="px-4 sm:px-5 py-3 bg-oat/40 border-t border-oat flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div class="text-espresso">${pat.politeTip}</div>
            <div class="shrink-0 px-2.5 py-1 rounded-lg bg-stone-200/80 text-mocha text-[11px]">
              🚫 避免生硬說法：<span class="font-kr">${pat.badExample.kr}</span>（${pat.badExample.reason}）
            </div>
          </div>
        ` : ''}
      </article>
    `;
  }).join('');
}

function selectPatternBlock(patId, slot, idx) {
  state.selectedBlocks[patId][slot] = idx;
  renderPatterns();
  // 自動朗讀新組合出的句子
  const pat = K_VIBE_DATA.patterns.find(p => p.id === patId);
  if (pat) {
    const sel = state.selectedBlocks[patId];
    const fullKr = `${pat.blocks.opener[sel.opener].kr} ${pat.blocks.target[sel.target].kr} ${pat.blocks.ending[sel.ending].kr}`;
    speakKorean(fullKr);
  }
}

// ==================== TAB 2: 店員連珠炮破解 (Rapid-Fire Decoder) ====================
function toggleBlindMode() {
  state.blindListenMode = !state.blindListenMode;
  const btn = document.getElementById('blindListenToggle');
  if (state.blindListenMode) {
    btn.textContent = '👀 顯示全部韓文字與解析（關閉盲聽）';
    btn.classList.add('bg-amber-500', 'text-white');
    btn.classList.remove('bg-white', 'text-amber-900');
  } else {
    btn.textContent = '🙈 開啟「盲聽挑戰模式」（先聽聲音不看字）';
    btn.classList.remove('bg-amber-500', 'text-white');
    btn.classList.add('bg-white', 'text-amber-900');
  }
  renderRapidFire();
}

function renderRapidFire() {
  const container = document.getElementById('rapidFireContainer');
  const list = K_VIBE_DATA.rapidFire.filter(
    item => state.currentCategory === 'all' || item.category === state.currentCategory
  );

  if (list.length === 0) {
    container.innerHTML = `<div class="bg-white rounded-3xl p-8 text-center text-mocha text-sm border border-oat">此分類目前無連珠炮題目，請切換至「全部情境」練習！</div>`;
    return;
  }

  container.innerHTML = list.map(rf => {
    const blindClass = state.blindListenMode ? 'blur-md select-none hover:blur-none transition duration-300' : '';
    return `
      <article class="bg-white rounded-3xl border border-oat shadow-sm p-4 sm:p-6 space-y-4">
        <!-- 店員出招區 -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">📍 ${rf.scene}</span>
            <span class="text-xs text-mocha font-semibold">${rf.clerkRole} 連珠炮提問</span>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="speakKorean('${escapeQuotes(rf.clerkKr)}', 1.22)" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition">
              ⚡ 聽店員真實快嘴 (1.2x)
            </button>
            <button onclick="speakKorean('${escapeQuotes(rf.clerkKr)}', 0.85)" class="px-3 py-1.5 rounded-xl bg-oat hover:bg-stone-200 text-espresso text-xs font-semibold transition">
              🐢 慢速拆解聽 (0.85x)
            </button>
          </div>
        </div>

        <!-- 店員台詞本體 -->
        <div class="bg-cream rounded-2xl p-4 border border-oat ${blindClass}" title="滑鼠移上或點擊可看答案">
          <p class="font-kr font-extrabold text-lg sm:text-xl text-espresso">${rf.clerkKr}</p>
          ${state.showLiaison ? `<p class="font-kr text-xs sm:text-sm text-rose-600 font-semibold mt-1">連音聽感：[ ${rf.clerkLiaison} ]</p>` : ''}
          <p class="text-sm font-bold text-mocha mt-1.5">${rf.clerkZh}</p>

          <!-- 關鍵字積木拆解 -->
          <div class="mt-3 flex flex-wrap gap-1.5">
            ${rf.chunks.map(c => `
              <span onclick="speakKorean('${escapeQuotes(c.kr)}', 0.9)" class="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-xs hover:border-rose-400">
                <strong class="font-kr text-espresso">${c.kr}</strong>
                <span class="text-mocha">= ${c.mean}</span>
              </span>
            `).join('')}
          </div>
        </div>

        <!-- 聽力破解秘訣與韓國潛台詞 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div class="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-amber-950">
            <strong>🎧 抓關鍵字秒懂法：</strong>${rf.speedNote}
          </div>
          <div class="p-3 rounded-xl bg-sage-50/70 border border-sage-200/60 text-sage-900">
            <strong>💡 韓國當地潛規則：</strong>${rf.subtext}
          </div>
        </div>

        <!-- 你的不卑不亢秒回選項 -->
        <div class="space-y-2.5 pt-1">
          <div class="text-xs font-bold text-espresso">👇 挑選你的得體秒回（點擊即可聽發音＆跟讀）：</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${rf.responses.map((res, idx) => {
              const shadowId = `shadow-rf-${rf.id}-${idx}`;
              return `
                <div class="rounded-2xl border border-rose-200 bg-rose-50/30 p-3.5 flex flex-col justify-between space-y-2">
                  <div>
                    <span class="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 mb-1.5">${res.badge}</span>
                    <p onclick="speakKorean('${escapeQuotes(res.kr)}')" class="cursor-pointer font-kr font-bold text-base text-espresso hover:text-rose-600 transition">
                      ${res.kr} <span class="text-xs text-rose-500">🔊</span>
                    </p>
                    ${state.showLiaison ? `<p class="font-kr text-xs text-rose-600 mt-0.5">[ ${res.liaison} ]</p>` : ''}
                    <p class="text-xs font-semibold text-mocha mt-1">${res.zh}</p>
                    ${state.showChunkNote ? `<p class="text-[11px] text-sage-700 mt-1.5">✨ ${res.why}</p>` : ''}
                  </div>
                  <div class="pt-2 border-t border-rose-100 flex items-center gap-2">
                    <button onclick="speakKorean('${escapeQuotes(res.kr)}')" class="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 text-[11px] font-semibold hover:bg-rose-100">
                      🔊 聽示範
                    </button>
                    <button onclick="startShadowingPractice('${escapeQuotes(res.kr)}', '${shadowId}')" class="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-semibold hover:bg-rose-600">
                      🎙️ 開口秒回練習
                    </button>
                  </div>
                  <div id="${shadowId}" class="hidden text-[11px] p-2 rounded-lg bg-white border border-oat"></div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ==================== TAB 3: 實戰劇本 RPG 與 AI 對談教練 ====================
function switchRpgMode(mode) {
  state.rpgSubMode = mode;
  const scriptBtn = document.getElementById('subTabScriptBtn');
  const aiBtn = document.getElementById('subTabAiBtn');
  const scriptPanel = document.getElementById('rpgScriptPanel');
  const aiPanel = document.getElementById('rpgAiPanel');

  if (mode === 'script') {
    scriptBtn.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-espresso shadow-sm transition';
    aiBtn.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-mocha hover:text-espresso transition';
    scriptPanel.classList.remove('hidden');
    aiPanel.classList.add('hidden');
  } else {
    aiBtn.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-espresso shadow-sm transition';
    scriptBtn.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-mocha hover:text-espresso transition';
    aiPanel.classList.remove('hidden');
    scriptPanel.classList.add('hidden');
  }
}

function renderScenarios() {
  const selector = document.getElementById('scenarioSelector');
  const stage = document.getElementById('scenarioStage');
  if (!selector || !stage) return;

  selector.innerHTML = K_VIBE_DATA.scenarios.map(sc => {
    const active = sc.id === state.activeScenarioId;
    return `
      <button onclick="selectScenario('${sc.id}')" class="text-left p-3.5 rounded-2xl border transition ${
        active
          ? 'bg-espresso text-white border-espresso shadow-md'
          : 'bg-white text-espresso border-oat hover:border-rose-300'
      }">
        <div class="text-xl mb-1">${sc.avatar}</div>
        <div class="font-bold text-xs sm:text-sm line-clamp-1">${sc.title}</div>
        <div class="text-[11px] ${active ? 'text-stone-300' : 'text-mocha'} mt-0.5">${sc.place}</div>
      </button>
    `;
  }).join('');

  const currentSc = K_VIBE_DATA.scenarios.find(s => s.id === state.activeScenarioId) || K_VIBE_DATA.scenarios[0];
  if (state.activeScenarioStep === 'done') {
    stage.innerHTML = `
      <div class="text-center py-8 space-y-4">
        <div class="text-4xl">🎉</div>
        <h3 class="font-bold text-xl text-espresso">太棒了！你已完美通關「${currentSc.title}」</h3>
        <p class="text-xs sm:text-sm text-mocha max-w-md mx-auto">
          你剛剛使用的全都是韓國人最欣賞、溫和得體又不失氣場的 해요體 與緩衝句型！下次去韓國直接這樣講準沒錯！
        </p>
        <div class="flex justify-center gap-3 pt-2">
          <button onclick="selectScenario('${currentSc.id}')" class="px-5 py-2.5 rounded-2xl bg-rose-500 text-white text-xs font-bold shadow-sm hover:bg-rose-600">
            🔄 再複習一次這個劇本
          </button>
          <button onclick="switchRpgMode('ai')" class="px-5 py-2.5 rounded-2xl bg-oat text-espresso text-xs font-bold hover:bg-stone-200">
            🤖 切換跟 AI 室長/店員自由對談
          </button>
        </div>
      </div>
    `;
    return;
  }

  const stepObj = currentSc.steps.find(st => st.step === state.activeScenarioStep) || currentSc.steps[0];
  stage.innerHTML = `
    <div class="space-y-5">
      <!-- 劇本背景介紹 -->
      <div class="flex items-center justify-between border-b border-oat pb-3">
        <div class="flex items-center gap-2.5">
          <span class="text-3xl">${currentSc.avatar}</span>
          <div>
            <h4 class="font-bold text-sm sm:text-base text-espresso">${currentSc.npcName}</h4>
            <p class="text-xs text-mocha">${currentSc.intro}</p>
          </div>
        </div>
        <span class="shrink-0 px-2.5 py-1 rounded-full bg-oat text-espresso text-xs font-bold">
          回合 ${stepObj.step} / ${currentSc.steps.length}
        </span>
      </div>

      <!-- 對方說的話氣泡 -->
      <div class="bg-cream rounded-2xl p-4 border border-oat space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-rose-600">💬 ${currentSc.npcName} 對你說：</span>
          <button onclick="speakKorean('${escapeQuotes(stepObj.npcKr)}')" class="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-xs font-semibold">
            🔊 播放對方語音
          </button>
        </div>
        <p class="font-kr font-extrabold text-base sm:text-lg text-espresso">${stepObj.npcKr}</p>
        ${state.showLiaison ? `<p class="font-kr text-xs text-rose-600">[ ${stepObj.npcLiaison} ]</p>` : ''}
        <p class="text-xs sm:text-sm text-mocha font-medium">${stepObj.npcZh}</p>
      </div>

      <!-- 語感提示 -->
      <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
        💡 <strong>過招提示：</strong>${stepObj.hint}
      </div>

      <!-- 玩家回應選項 -->
      <div class="space-y-3">
        <div class="text-xs font-bold text-espresso">👇 請選擇你的回應方式（選完會自動發音並解析語氣差異）：</div>
        ${stepObj.options.map((opt, idx) => `
          <div onclick="chooseScenarioOption(${idx})" class="cursor-pointer rounded-2xl p-4 border-2 border-oat hover:border-rose-400 bg-white transition space-y-1.5">
            <div class="text-xs font-bold text-rose-700">${opt.label}</div>
            <div class="font-kr font-bold text-base text-espresso">${opt.kr}</div>
            ${state.showLiaison ? `<div class="font-kr text-xs text-rose-600">[ ${opt.liaison} ]</div>` : ''}
            <div class="text-xs text-mocha">${opt.zh}</div>
          </div>
        `).join('')}
      </div>

      <!-- 回饋顯示區 -->
      <div id="rpgFeedbackBox" class="hidden rounded-2xl p-4 bg-sage-50 border border-sage-200 space-y-3"></div>
    </div>
  `;
}

function selectScenario(scId) {
  state.activeScenarioId = scId;
  state.activeScenarioStep = 1;
  renderScenarios();
}

function chooseScenarioOption(optIdx) {
  const currentSc = K_VIBE_DATA.scenarios.find(s => s.id === state.activeScenarioId);
  const stepObj = currentSc.steps.find(st => st.step === state.activeScenarioStep);
  const opt = stepObj.options[optIdx];

  speakKorean(opt.kr);

  const fbBox = document.getElementById('rpgFeedbackBox');
  fbBox.classList.remove('hidden');
  fbBox.innerHTML = `
    <div class="text-xs sm:text-sm text-espresso font-medium">${opt.feedback}</div>
    <div class="flex flex-wrap items-center gap-2 pt-1">
      <button onclick="speakKorean('${escapeQuotes(opt.kr)}')" class="px-3 py-1.5 rounded-xl bg-white border border-sage-300 text-sage-800 text-xs font-semibold">
        🔊 再聽一次這句
      </button>
      <button onclick="advanceScenarioStep('${opt.nextStep}')" class="px-4 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold shadow-sm hover:bg-rose-600">
        ${opt.nextStep === 'done' ? '🎉 完成劇本領取總結' : '👉 進入下一回合對話'}
      </button>
    </div>
  `;
}

function advanceScenarioStep(nextStep) {
  state.activeScenarioStep = nextStep === 'done' ? 'done' : Number(nextStep);
  renderScenarios();
}

// ==================== AI 自由對談與造句教練 (混合雙引擎：內建智慧導師 + 可選 Gemini API) ====================
function toggleApiKeyBox() {
  const drawer = document.getElementById('apiKeyDrawer');
  drawer.classList.toggle('hidden');
}

function saveApiKey() {
  const key = document.getElementById('geminiApiKeyInput').value.trim();
  if (key) {
    localStorage.setItem('kvibe_gemini_key', key);
    updateApiKeyBadge();
    document.getElementById('apiKeyDrawer').classList.add('hidden');
  }
}

function clearApiKey() {
  localStorage.removeItem('kvibe_gemini_key');
  document.getElementById('geminiApiKeyInput').value = '';
  updateApiKeyBadge();
}

function updateApiKeyBadge() {
  const badge = document.getElementById('apiKeyStatusBadge');
  const key = localStorage.getItem('kvibe_gemini_key');
  if (key) {
    badge.textContent = 'Gemini AI 已連線';
    badge.className = 'ml-1 px-1.5 py-0.5 rounded bg-sage-600 text-white text-[10px]';
  } else {
    badge.textContent = '內建離線導師';
    badge.className = 'ml-1 px-1.5 py-0.5 rounded bg-stone-300 text-espresso text-[10px]';
  }
}

function setAiPersona(persona) {
  state.aiPersona = persona;
  document.querySelectorAll('.persona-btn').forEach(btn => {
    btn.className = 'persona-btn px-3 py-1.5 rounded-xl bg-oat text-espresso font-medium transition';
  });
  const active = document.getElementById(`persona-${persona}`);
  if (active) {
    active.className = 'persona-btn px-3 py-1.5 rounded-xl bg-rose-500 text-white font-semibold transition';
  }
  initAiChatWelcome();
}

function initAiChatWelcome() {
  const box = document.getElementById('aiChatHistory');
  if (!box) return;
  const greetings = {
    clinic: {
      name: '👩‍⚕️ 江南醫美室長',
      kr: '안녕하세요 고객님~ 오늘 어떤 부위나 피부 고민 때문에 오셨어요?',
      liaison: '안녕하세요 고객님~ 오늘 어떤 부위나 피부 고민 때무네 오셔써요?',
      zh: '貴賓您好～今天是因為哪個部位或什麼肌膚困擾來的呢？（您可以直接用韓文回答，或打中文說你想表達什麼！）'
    },
    pharmacy: {
      name: '💊 弘大藥局藥師',
      kr: '어서 오세요~ 찾으시는 약이나 불편한 곳 있으신가요?',
      liaison: '어서 오세요~ 차즈시는 야기나 불펴난 곧 이쓰신가요?',
      zh: '歡迎光臨～有在找什麼藥或是哪裡不舒服嗎？'
    },
    shopping: {
      name: '👗 漢南洞服飾店員',
      kr: '안녕하세요~ 찾으시는 사이즈나 컬러 있으시면 편하게 말씀해 주세요!',
      liaison: '안녕하세요~ 차즈시는 싸이즈나 컬러 이쓰시면 펴나게 말쓰매 주세요!',
      zh: '您好～有在找的尺寸或顏色請自在地跟我說喔！'
    },
    dining: {
      name: '🍲 烤肉店熱情老闆',
      kr: '어서 오세요! 몇 분이세요? 주문 도와드릴까요?',
      liaison: '어서 오세요! 몇 뿌니세요? 주문 도와드릴까요?',
      zh: '歡迎光臨！請問幾位呢？要幫您點餐嗎？'
    },
    translator: {
      name: '✨ 專屬造句與語氣微調教練',
      kr: '하고 싶은 말을 중국어나 한국어로 적어 주세요!',
      liaison: '하고 시픈 마를 중고거나 항구거로 저거 주세요!',
      zh: '請直接輸入任何你在韓國想講的「中文意思」（例如：我想問這雙鞋有沒有245號、或我想拒絕推銷），我會幫你轉換成最得體、不卑不亢的 해요體 並附上連音！'
    }
  };

  const g = greetings[state.aiPersona];
  box.innerHTML = `
    <div class="bg-white rounded-2xl p-3.5 border border-oat shadow-sm space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-rose-600">${g.name}</span>
        <button onclick="speakKorean('${escapeQuotes(g.kr)}')" class="text-xs text-rose-500 font-semibold">🔊 聽語音</button>
      </div>
      <p class="font-kr font-bold text-base text-espresso">${g.kr}</p>
      <p class="font-kr text-xs text-rose-600">[ ${g.liaison} ]</p>
      <p class="text-xs text-mocha">${g.zh}</p>
    </div>
  `;
}

async function sendAiMessage() {
  const input = document.getElementById('aiUserInput');
  const text = input.value.trim();
  if (!text) return;

  const box = document.getElementById('aiChatHistory');
  // 加入使用者訊息
  box.innerHTML += `
    <div class="flex justify-end">
      <div class="bg-rose-500 text-white rounded-2xl px-4 py-2.5 max-w-md text-xs sm:text-sm font-medium shadow-sm">
        ${escapeHtml(text)}
      </div>
    </div>
  `;
  input.value = '';
  box.scrollTop = box.scrollHeight;

  const apiKey = localStorage.getItem('kvibe_gemini_key');
  if (apiKey) {
    await callGeminiCoach(text, apiKey, box);
  } else {
    renderSmartOfflineCoachReply(text, box);
  }
}

function renderSmartOfflineCoachReply(userInput, box) {
  // 智慧比對題庫中與使用者輸入最相關的情境句
  const allSentences = [
    ...K_VIBE_DATA.sosCards.map(c => ({ kr: c.kr, liaison: c.liaison, zh: c.zhIntent, note: c.nuance })),
    ...K_VIBE_DATA.rapidFire.flatMap(r => r.responses.map(res => ({ kr: res.kr, liaison: res.liaison, zh: res.zh, note: res.why })))
  ];

  const matched = allSentences.find(s =>
    userInput.split('').some(ch => ch.length > 0 && '麻藥痛推銷退稅痘消腫胃藥新貨尺寸試穿少辣生菜結帳袋子收據冰外帶'.includes(ch) && (s.zh.includes(ch) || s.note.includes(ch)))
  ) || allSentences[Math.floor(Math.random() * 5)];

  const replyHtml = `
    <div class="bg-white rounded-2xl p-3.5 border border-oat shadow-sm space-y-2">
      <div class="text-xs font-bold text-sage-700">✨ 韓語語感教練建議說法（自然不卑不亢 해요體）：</div>
      <div class="p-3 rounded-xl bg-cream border border-rose-200">
        <p onclick="speakKorean('${escapeQuotes(matched.kr)}')" class="cursor-pointer font-kr font-bold text-base text-espresso">
          ${matched.kr} <span class="text-rose-500 text-xs">🔊 點擊發音</span>
        </p>
        <p class="font-kr text-xs text-rose-600 mt-1">實際連音：[ ${matched.liaison} ]</p>
        <p class="text-xs text-mocha mt-1">${matched.zh}</p>
      </div>
      <p class="text-[11px] text-mocha">💡 <strong>語感解析：</strong>${matched.note}（若想針對任何自訂句子進行無限 AI 生成，可點上方「🔑 設定 Gemini API Key」！）</p>
    </div>
  `;
  box.innerHTML += replyHtml;
  box.scrollTop = box.scrollHeight;
  speakKorean(matched.kr);
}

async function callGeminiCoach(userInput, apiKey, box) {
  const loadingId = 'ai-loading-' + Date.now();
  box.innerHTML += `<div id="${loadingId}" class="text-xs text-mocha animate-pulse">🤖 正在為您構思最自然得體的韓文回應與連音解析...</div>`;
  box.scrollTop = box.scrollHeight;

  const prompt = `
你是一位專精於「韓國旅遊實戰（醫美診所、藥局、漢南洞服飾鞋店、韓國餐廳）」的韓語口說教練。
學生已經學過四十音，但不想講死板生硬的教科書文法（不要用 ~습니다），希望能用最自然、有禮貌卻不卑微的「해요體」與韓國緩衝詞（혹시, 죄송한데, ~주실 수 있나요?, ~할게요）對談。
目前練習情境：${state.aiPersona}
學生的輸入：「${userInput}」

請用 JSON 格式回覆（不要加 markdown code fence），欄位包含：
{
  "recommendedKr": "最推薦你開口講的道地韓文句子（해요體）",
  "liaison": "用韓文字標出韓國人實際連音念法",
  "zhMeaning": "中文意思",
  "npcReplyKr": "韓國店員/室長聽到後會接著回你的韓文",
  "npcReplyZh": "店員回覆的中文翻譯",
  "nuanceTip": "為什麼這樣講最得體、不卑不亢的語感小祕訣（50字內）"
}`;

  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    const data = await resp.json();
    document.getElementById(loadingId)?.remove();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawText);

    box.innerHTML += `
      <div class="bg-white rounded-2xl p-4 border border-oat shadow-sm space-y-2.5">
        <div class="text-xs font-bold text-sage-700">✨ 推薦你這樣說（不卑不亢道地韓文）：</div>
        <div class="p-3 rounded-xl bg-cream border border-rose-200">
          <p onclick="speakKorean('${escapeQuotes(parsed.recommendedKr)}')" class="cursor-pointer font-kr font-extrabold text-base text-espresso">
            ${parsed.recommendedKr} <span class="text-rose-500 text-xs">🔊</span>
          </p>
          <p class="font-kr text-xs text-rose-600 mt-1">連音標示：[ ${parsed.liaison} ]</p>
          <p class="text-xs text-mocha mt-1">${parsed.zhMeaning}</p>
        </div>
        <div class="text-xs text-espresso bg-amber-50 p-2.5 rounded-xl border border-amber-200">
          💡 <strong>語感心法：</strong>${parsed.nuanceTip}
        </div>
        <div class="pt-2 border-t border-oat">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-rose-600">💬 對方接著回應你：</span>
            <button onclick="speakKorean('${escapeQuotes(parsed.npcReplyKr)}')" class="text-xs text-rose-500 font-semibold">🔊 聽對方說</button>
          </div>
          <p class="font-kr font-bold text-sm text-espresso mt-0.5">${parsed.npcReplyKr}</p>
          <p class="text-xs text-mocha">${parsed.npcReplyZh}</p>
        </div>
      </div>
    `;
    box.scrollTop = box.scrollHeight;
    speakKorean(parsed.recommendedKr);
  } catch (err) {
    document.getElementById(loadingId)?.remove();
    renderSmartOfflineCoachReply(userInput, box);
  }
}

function startAiVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('您的瀏覽器目前不支援語音輸入，請直接打字輸入喔！');
    return;
  }
  const rec = new SpeechRecognition();
  rec.lang = 'ko-KR';
  const btn = document.getElementById('aiMicBtn');
  btn.classList.add('animate-pulse', 'bg-rose-500', 'text-white');
  rec.onresult = (e) => {
    document.getElementById('aiUserInput').value = e.results[0][0].transcript;
    btn.classList.remove('animate-pulse', 'bg-rose-500', 'text-white');
  };
  rec.onerror = () => {
    btn.classList.remove('animate-pulse', 'bg-rose-500', 'text-white');
  };
  rec.start();
}

// ==================== TAB 4: 韓國現場救急 SOS 面板 ====================
function renderSosCards() {
  const container = document.getElementById('sosCardsContainer');
  if (!container) return;

  const query = (document.getElementById('sosSearchInput')?.value || '').trim().toLowerCase();
  const allCards = [...state.customSosCards, ...K_VIBE_DATA.sosCards];

  const filtered = allCards.filter(card => {
    const matchCat = state.currentCategory === 'all' || card.category === state.currentCategory;
    const matchQuery = !query ||
      card.zhIntent.toLowerCase().includes(query) ||
      card.kr.toLowerCase().includes(query) ||
      card.tag.toLowerCase().includes(query) ||
      card.nuance.toLowerCase().includes(query);
    return matchCat && matchQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="col-span-full bg-white rounded-3xl p-8 text-center text-mocha text-sm border border-oat">找不到符合「${escapeHtml(query)}」的救急卡，點選上方「＋ 新增我的私房詞彙」即可立刻建立專屬卡片！</div>`;
    return;
  }

  container.innerHTML = filtered.map(card => `
    <div class="bg-white rounded-3xl border border-oat p-4 sm:p-5 shadow-sm hover:border-rose-300 transition flex flex-col justify-between space-y-3">
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold">
            ${getCategoryName(card.category)}・${card.tag}
          </span>
          <button onclick="openBigCard('${escapeQuotes(card.kr)}', '${escapeQuotes(card.liaison)}', '${escapeQuotes(card.zhIntent)}', '${escapeQuotes(card.tag)}')" class="px-2.5 py-1 rounded-xl bg-oat hover:bg-stone-200 text-espresso text-[11px] font-bold transition">
            🔍 放大出示
          </button>
        </div>

        <!-- 中文需求意圖 -->
        <p class="font-bold text-sm sm:text-base text-espresso">${card.zhIntent}</p>

        <!-- 韓文大字與連音 -->
        <div onclick="speakKorean('${escapeQuotes(card.kr)}')" class="cursor-pointer p-3 rounded-2xl bg-cream border border-oat hover:border-rose-300 transition">
          <p class="font-kr font-extrabold text-lg text-espresso leading-snug">
            ${card.kr} <span class="text-rose-500 text-sm">🔊</span>
          </p>
          ${state.showLiaison ? `<p class="font-kr text-xs text-rose-600 font-semibold mt-1.5">連音照念：[ ${card.liaison} ]</p>` : ''}
        </div>
      </div>

      <div class="pt-1 flex items-center justify-between gap-2 text-[11px] text-mocha">
        <span>💡 ${card.nuance}</span>
      </div>
    </div>
  `).join('');
}

// ==================== 全螢幕大字出示卡 & 語感潛規則 & 3分鐘閃電刷題 ====================
function openBigCard(kr, liaison, zh, tag) {
  document.getElementById('bigCardTag').textContent = tag || '韓國現場溝通卡';
  document.getElementById('bigCardZh').textContent = zh;
  document.getElementById('bigCardKr').textContent = kr;
  document.getElementById('bigCardLiaison').textContent = `發音連音：[ ${liaison} ]`;
  const speakBtn = document.getElementById('bigCardSpeakBtn');
  speakBtn.onclick = () => speakKorean(kr, 0.95);
  document.getElementById('bigCardModal').classList.remove('hidden');
  speakKorean(kr, 0.95);
}

function closeBigCardModal() {
  document.getElementById('bigCardModal').classList.add('hidden');
}

function openEtiquetteModal() {
  const listEl = document.getElementById('etiquetteList');
  listEl.innerHTML = K_VIBE_DATA.etiquetteRules.map(rule => `
    <div class="bg-white rounded-2xl p-4 border border-oat space-y-2">
      <h4 class="font-bold text-sm sm:text-base text-espresso">${rule.title}</h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div class="p-2.5 rounded-xl bg-stone-100 text-mocha">
          🚫 <strong>生硬/不自然：</strong><span class="font-kr">${rule.bad}</span>
        </div>
        <div onclick="speakKorean('${escapeQuotes(rule.good.split('/')[0])}')" class="cursor-pointer p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
          ✨ <strong>得體自然 (點擊聽)：</strong><span class="font-kr font-bold">${rule.good}</span> 🔊
        </div>
      </div>
      <p class="text-xs text-mocha leading-relaxed">${rule.desc}</p>
    </div>
  `).join('');
  document.getElementById('etiquetteModal').classList.remove('hidden');
}

function closeEtiquetteModal() {
  document.getElementById('etiquetteModal').classList.add('hidden');
}

// 抓空檔 3 分鐘閃電刷題 (隨機抽 5 題聽力與情境反應)
function openFlashDrill() {
  const pool = [
    ...K_VIBE_DATA.rapidFire.map(rf => ({
      type: '店員連珠炮聽力反應',
      scene: rf.scene,
      promptKr: rf.clerkKr,
      promptLiaison: rf.clerkLiaison,
      promptZh: rf.clerkZh,
      bestReplyKr: rf.responses[0].kr,
      bestReplyLiaison: rf.responses[0].liaison,
      bestReplyZh: rf.responses[0].zh
    })),
    ...K_VIBE_DATA.sosCards.slice(0, 8).map(c => ({
      type: '韓國現場開口造句挑戰',
      scene: `${getCategoryName(c.category)}・${c.tag}`,
      promptKr: c.kr,
      promptLiaison: c.liaison,
      promptZh: `情境：你想跟韓國人說「${c.zhIntent}」`,
      bestReplyKr: c.kr,
      bestReplyLiaison: c.liaison,
      bestReplyZh: c.zhIntent
    }))
  ];

  // 洗牌取 5 題
  state.drillQuestions = pool.sort(() => Math.random() - 0.5).slice(0, 5);
  state.drillIndex = 0;
  document.getElementById('flashDrillModal').classList.remove('hidden');
  renderCurrentDrillQuestion();
}

function renderCurrentDrillQuestion() {
  const content = document.getElementById('flashDrillContent');
  const progress = document.getElementById('drillProgressText');
  if (state.drillIndex >= state.drillQuestions.length) {
    progress.textContent = '特訓完成！';
    content.innerHTML = `
      <div class="text-center py-6 space-y-3">
        <div class="text-4xl">🏆</div>
        <h4 class="font-bold text-lg text-espresso">3 分鐘空檔特訓完成！</h4>
        <p class="text-xs text-mocha">你剛剛刷完了 5 個韓國高頻實戰情境，語感肌肉記憶又更強了！</p>
        <div class="flex justify-center gap-2 pt-2">
          <button onclick="openFlashDrill()" class="px-4 py-2.5 rounded-2xl bg-rose-500 text-white text-xs font-bold">⚡ 再刷一組 (5題)</button>
          <button onclick="closeFlashDrill()" class="px-4 py-2.5 rounded-2xl bg-oat text-espresso text-xs font-semibold">完成休息</button>
        </div>
      </div>
    `;
    return;
  }

  const q = state.drillQuestions[state.drillIndex];
  progress.textContent = `第 ${state.drillIndex + 1} / ${state.drillQuestions.length} 題｜${q.type}`;

  content.innerHTML = `
    <div class="bg-white rounded-2xl p-4 border border-oat space-y-3">
      <div class="flex items-center justify-between">
        <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">📍 ${q.scene}</span>
        <button onclick="speakKorean('${escapeQuotes(q.promptKr)}', 1.1)" class="px-3 py-1 rounded-xl bg-rose-500 text-white text-xs font-bold">
          🔊 播放韓文語音
        </button>
      </div>
      <p class="text-sm font-bold text-espresso">${q.promptZh}</p>
      <div id="drillAnswerBox" class="hidden p-3.5 rounded-xl bg-cream border border-rose-200 space-y-1.5">
        <div class="text-[11px] font-bold text-sage-700">✨ 推薦得體說法（點擊跟讀）：</div>
        <p onclick="speakKorean('${escapeQuotes(q.bestReplyKr)}')" class="cursor-pointer font-kr font-extrabold text-lg text-espresso">
          ${q.bestReplyKr} 🔊
        </p>
        <p class="font-kr text-xs text-rose-600 font-semibold">連音：[ ${q.bestReplyLiaison} ]</p>
        <p class="text-xs text-mocha">${q.bestReplyZh}</p>
      </div>
      <div class="flex items-center gap-2 pt-2">
        <button onclick="revealDrillAnswer('${escapeQuotes(q.bestReplyKr)}')" class="flex-1 py-2.5 rounded-xl bg-oat hover:bg-stone-200 text-espresso text-xs font-bold transition">
          👀 看韓文答案＆聽發音
        </button>
        <button onclick="nextDrillQuestion()" class="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition">
          👉 我會了，下一題
        </button>
      </div>
    </div>
  `;
  speakKorean(q.promptKr, 1.05);
}

function revealDrillAnswer(kr) {
  document.getElementById('drillAnswerBox')?.classList.remove('hidden');
  speakKorean(kr, 0.95);
}

function nextDrillQuestion() {
  state.drillIndex++;
  renderCurrentDrillQuestion();
}

function closeFlashDrill() {
  document.getElementById('flashDrillModal').classList.add('hidden');
}

// ==================== 新增私房詞彙 Modal ====================
function openCustomPhraseModal() {
  document.getElementById('customPhraseModal').classList.remove('hidden');
}

function closeCustomPhraseModal() {
  document.getElementById('customPhraseModal').classList.add('hidden');
}

function saveCustomPhrase() {
  const cat = document.getElementById('customCat').value;
  const zh = document.getElementById('customZh').value.trim();
  let kr = document.getElementById('customKr').value.trim();
  let liaison = document.getElementById('customLiaison').value.trim();

  if (!zh) {
    alert('請輸入您想表達的中文意思喔！');
    return;
  }
  if (!kr) {
    kr = '혹시 이거 있나요? 추천 좀 부탁드려요.';
    liaison = '혹씨 이거 인나요? 추천 좀 부탁뜨려요.';
  }
  if (!liaison) {
    liaison = kr;
  }

  const newCard = {
    id: 'custom_' + Date.now(),
    category: cat,
    tag: '我的私房句',
    zhIntent: zh,
    kr,
    liaison,
    nuance: '您自訂收藏的韓國實戰專屬句！'
  };

  state.customSosCards.unshift(newCard);
  try {
    localStorage.setItem('kvibe_custom_sos', JSON.stringify(state.customSosCards));
  } catch (e) {}

  document.getElementById('customZh').value = '';
  document.getElementById('customKr').value = '';
  document.getElementById('customLiaison').value = '';
  closeCustomPhraseModal();
  switchMainTab('sos');
  renderSosCards();
}

// ==================== 工具函式 ====================
function getCategoryName(catId) {
  const found = K_VIBE_DATA.categories.find(c => c.id === catId);
  return found ? `${found.icon} ${found.name}` : '✨ 實用';
}

function escapeQuotes(str = '') {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
