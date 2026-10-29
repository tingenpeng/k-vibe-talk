// K-Vibe Talk 極簡實戰控制核心
// 徹底簡化：3 秒一眼看懂，點選品項即時抽換句子發音！

const appState = {
  scene: 'bbq',         // 當前大場景: bbq | soup | cafe | clinic | shopping | pharmacy | daily
  templateIndex: 0,     // 當前選中的主幹句型索引
  slotIndex: 0,         // 當前選中的填空品項索引
  speechSpeed: 1.0
};

let activeSpeechUtter = null;

document.addEventListener('DOMContentLoaded', () => {
  renderCurrentScene();
});

// 發音引擎（防卡死與防垃圾回收）
function speakKorean(text, customRate = null) {
  if (!('speechSynthesis' in window)) return;
  try {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
  } catch (e) {}

  const clean = text.replace(/\([^)]*\)/g, '').trim();
  if (!clean) return;

  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = 'ko-KR';
  utter.rate = customRate !== null ? customRate : appState.speechSpeed;

  const voices = window.speechSynthesis.getVoices();
  const krVoice = voices.find(v => v.lang && (v.lang === 'ko-KR' || v.lang.startsWith('ko')) && (v.name.includes('Yuna') || v.name.includes('Google') || v.name.includes('Siri')))
               || voices.find(v => v.lang && v.lang.startsWith('ko'));
  if (krVoice) utter.voice = krVoice;

  activeSpeechUtter = utter;
  setTimeout(() => {
    try {
      window.speechSynthesis.speak(utter);
    } catch (err) {}
  }, 20);
}

// 切換場景
function switchScene(sceneKey) {
  appState.scene = sceneKey;
  appState.templateIndex = 0;
  appState.slotIndex = 0;

  // 更新頂部按鈕高亮
  document.querySelectorAll('.scene-tab').forEach(btn => {
    btn.className = 'scene-tab py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-white text-stone-600 border border-stone-200 transition';
  });
  const activeBtn = document.getElementById(`scene-${sceneKey}`);
  if (activeBtn) {
    activeBtn.className = 'scene-tab py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-espresso text-white shadow-sm transition';
  }

  renderCurrentScene();
}

// 切換句型骨架
function selectTemplate(idx) {
  appState.templateIndex = idx;
  appState.slotIndex = 0;
  renderCurrentScene();
  playCurrentSentence();
}

// 點選抽換詞
function selectSlot(idx) {
  appState.slotIndex = idx;
  updateSentenceDisplay();
  playCurrentSentence();
}

// 渲染當前場景的完整介面
function renderCurrentScene() {
  const data = K_VIBE_MINI[appState.scene];
  if (!data) return;

  // 場景徽章
  document.getElementById('sceneBadge').textContent = data.badge;

  // 1. 渲染句型骨架選擇器 (Template Selector)
  const tmplBox = document.getElementById('templateSelector');
  tmplBox.innerHTML = data.templates.map((t, idx) => {
    const active = idx === appState.templateIndex;
    return `
      <button onclick="selectTemplate(${idx})" class="py-2 px-2.5 rounded-xl text-xs font-bold transition text-center ${
        active ? 'bg-point text-white shadow-sm' : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
      }">
        ${t.title}
      </button>
    `;
  }).join('');

  // 2. 渲染抽換品項按鈕庫 (Slot Pills)
  const curTmpl = data.templates[appState.templateIndex];
  document.getElementById('slotSectionTitle').textContent = `2. ${curTmpl.slotLabel}`;

  const pillsBox = document.getElementById('slotPillsContainer');
  pillsBox.innerHTML = curTmpl.slots.map((s, idx) => {
    const active = idx === appState.slotIndex;
    return `
      <button onclick="selectSlot(${idx})" class="slot-pill px-3 py-2 rounded-2xl text-xs sm:text-sm font-bold border transition flex items-center gap-1.5 ${
        active
          ? 'bg-point text-white border-point shadow-sm scale-105'
          : 'bg-white hover:bg-pointLight text-espresso border-stone-200'
      }">
        <span class="font-kr">${s.kr}</span>
        <span class="${active ? 'text-rose-100' : 'text-stone-400'} text-[11px] font-normal">= ${s.zh}</span>
      </button>
    `;
  }).join('');

  // 3. 更新句子舞台
  updateSentenceDisplay();

  // 4. 更新店員快嘴連珠炮
  document.getElementById('clerkKr').textContent = data.clerk.kr;
  document.getElementById('clerkZh').textContent = data.clerk.zh;
  document.getElementById('clerkTip').textContent = data.clerk.tip;
  document.getElementById('replyKr').textContent = data.clerk.replyKr;
  document.getElementById('replyZh').textContent = data.clerk.replyZh;
}

// 即時更新畫面中央的拼裝句子
function updateSentenceDisplay() {
  const data = K_VIBE_MINI[appState.scene];
  const curTmpl = data.templates[appState.templateIndex];
  const curSlot = curTmpl.slots[appState.slotIndex] || curTmpl.slots[0];

  document.getElementById('displayOpener').textContent = curTmpl.opener;
  document.getElementById('displaySlot').textContent = curSlot.kr;
  document.getElementById('displayEnding').textContent = curTmpl.ending;

  // 實際連音標示
  const fullSentence = `${curTmpl.opener} ${curSlot.kr} ${curTmpl.ending}`.replace(/\s+/g, ' ').trim();
  document.getElementById('displayLiaison').textContent = `[ 連音讀法：${curSlot.liaison} ]`;

  // 中文翻譯
  document.getElementById('displayZh').textContent = `${curSlot.zh}，${curTmpl.endingZh}`;
}

// 播放目前組合的句子
function playCurrentSentence(customRate = null) {
  const data = K_VIBE_MINI[appState.scene];
  const curTmpl = data.templates[appState.templateIndex];
  const curSlot = curTmpl.slots[appState.slotIndex] || curTmpl.slots[0];
  const fullSentence = `${curTmpl.opener} ${curSlot.kr} ${curTmpl.ending}`;
  speakKorean(fullSentence, customRate);
}

// 播放店員快嘴發音 (1.2x 速)
function playClerkVoice() {
  const data = K_VIBE_MINI[appState.scene];
  speakKorean(data.clerk.kr, 1.2);
}

// 播放秒回韓語發音
function playReplyVoice() {
  const data = K_VIBE_MINI[appState.scene];
  speakKorean(data.clerk.replyKr, 1.0);
}

// 放大給店員看大字卡
function openShowCard() {
  const data = K_VIBE_MINI[appState.scene];
  const curTmpl = data.templates[appState.templateIndex];
  const curSlot = curTmpl.slots[appState.slotIndex] || curTmpl.slots[0];
  const fullSentence = `${curTmpl.opener} ${curSlot.kr} ${curTmpl.ending}`;

  document.getElementById('showModalKr').textContent = fullSentence;
  document.getElementById('showModalZh').textContent = `${curSlot.zh}，${curTmpl.endingZh}`;
  document.getElementById('showCardModal').classList.remove('hidden');
  speakKorean(fullSentence, 0.95);
}

function closeShowCard() {
  document.getElementById('showCardModal').classList.add('hidden');
}

// 語速切換
function toggleSpeed() {
  if (appState.speechSpeed === 1.0) {
    appState.speechSpeed = 0.8;
    document.getElementById('speedBtn').textContent = '🐢 慢速 0.8x';
  } else {
    appState.speechSpeed = 1.0;
    document.getElementById('speedBtn').textContent = '🎧 正常速 1.0x';
  }
}
