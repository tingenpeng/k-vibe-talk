// K-Vibe Talk 極簡實戰資料庫
// 嚴格審查：絕無虛構用不到的句子！每個情境精選真實核心主幹，搭配大按鈕自由抽換真實品項。

const K_VIBE_MINI = {
  // 1. 🥩 烤肉與烤腸店
  bbq: {
    badge: '🥩 烤肉與烤腸專用句',
    templates: [
      {
        id: 't_bbq_order',
        title: '點肉品份數',
        opener: '사장님,',
        ending: '2인분 주세요.',
        endingZh: '請給我 2 人份。',
        slotLabel: '點選想吃的肉品部位：',
        slots: [
          { kr: '삼겹살', liaison: '삼겹쌀', zh: '五花肉' },
          { kr: '목살', liaison: '목쌀', zh: '豬頸肉/梅花肉' },
          { kr: '항정살', liaison: '항정쌀', zh: '松阪豬 (脆口必點)' },
          { kr: '차돌박이', liaison: '차돌바기', zh: '牛五花薄片' },
          { kr: '소곱창', liaison: '소곱창', zh: '烤牛小腸' },
          { kr: '한우 등심', liaison: '한우 등심', zh: '韓牛里肌肉' }
        ]
      },
      {
        id: 't_bbq_service',
        title: '換烤盤 / 續小菜',
        opener: '사장님, 죄송한데',
        ending: '좀 해 주실 수 있나요?',
        endingZh: '可以幫我們處理一下嗎？',
        slotLabel: '點選需要的桌邊服務：',
        slots: [
          { kr: '불판 교체', liaison: '불판 교체', zh: '更換烤網' },
          { kr: '쌈채소 리필', liaison: '쌈채소 리필', zh: '續包肉生菜(免費)' },
          { kr: '마늘이랑 쌈장 추가', liaison: '마느리랑 쌈장 추가', zh: '加蒜頭跟包飯醬' },
          { kr: '앞치마 2개', liaison: '압치마 두 개', zh: '拿 2 件圍裙' }
        ]
      },
      {
        id: 't_bbq_after',
        title: '肉吃完後的追加',
        opener: '여기',
        ending: '하나 추가할게요!',
        endingZh: '我要追加一份！',
        slotLabel: '點選想追加的副餐：',
        slots: [
          { kr: '볶음밥', liaison: '보끔빱', zh: '鐵板炒飯 (經典結尾)' },
          { kr: '물냉면', liaison: '물랭면', zh: '水冷麵 (解膩必點)' },
          { kr: '비빔냉면', liaison: '비빔냉면', zh: '辣拌冷麵' },
          { kr: '된장찌개', liaison: '된장찌개', zh: '大醬湯' },
          { kr: '계란찜', liaison: '계란찜', zh: '韓式火山蒸蛋' }
        ]
      }
    ],
    clerk: {
      kr: '고기 직접 구워 드릴게요. 다 익으면 드세요!',
      zh: '我們會親自幫您烤，烤熟後再夾來吃喔！',
      tip: '💡 聽到直接 구워 드릴게요（親自幫你烤）不要自己動夾子翻肉，等店員剪好放邊邊再吃。',
      replyKr: '네, 알겠습니다! 맛있게 구워 주세요~',
      replyZh: '好，知道了！拜託幫我們烤得美味一點囉～'
    }
  },

  // 2. 🍲 湯飯與燉鍋店（徹底去除香菜，換成真實的去蔥、去韭菜、去紫蘇粉）
  soup: {
    badge: '🍲 湯飯燉鍋專用句',
    templates: [
      {
        id: 't_soup_custom',
        title: '湯底去辛香料 (忌口必備)',
        opener: '이모님,',
        ending: '빼 주실 수 있나요?',
        endingZh: '可以幫我拿掉不要放嗎？',
        slotLabel: '點選你不吃的辛香配料：',
        slots: [
          { kr: '파랑 부추', liaison: '파랑 부추', zh: '蔥跟韭菜' },
          { kr: '들깨가루', liaison: '들깨가루', zh: '紫蘇籽粉 (中藥籽味濃)' },
          { kr: '다대기(양념장)', liaison: '다대기', zh: '湯底辣醬 (想喝清白湯必選)' },
          { kr: '후추', liaison: '후추', zh: '胡椒粉' }
        ]
      },
      {
        id: 't_soup_order',
        title: '點熱門鍋物品項',
        opener: '여기',
        ending: '하나 주세요.',
        endingZh: '請給我一份。',
        slotLabel: '點選想吃的道地湯飯/鍋：',
        slots: [
          { kr: '순대국밥', liaison: '순대국빱', zh: '血腸湯飯' },
          { kr: '돼지국밥', liaison: '돼지국빱', zh: '豬肉湯飯' },
          { kr: '설렁탕', liaison: '설렁탕', zh: '雪濃湯 (牛骨白湯)' },
          { kr: '뼈해장국', liaison: '뼈해장국', zh: '醒酒排骨湯 (個人鍋)' },
          { kr: '닭한마리', liaison: '다칸마리', zh: '一隻雞' }
        ]
      },
      {
        id: 't_soup_extra',
        title: '加高湯 / 加麵條',
        opener: '죄송한데',
        ending: '추가해 주실 수 있나요?',
        endingZh: '可以幫忙加一下嗎？',
        slotLabel: '點選想加的內容：',
        slots: [
          { kr: '육수 리필', liaison: '육쑤 리필', zh: '續加高湯 (免費)' },
          { kr: '라면사리', liaison: '라면사리', zh: '拉麵包麵條' },
          { kr: '수제비', liaison: '수제비', zh: '麵疙瘩' },
          { kr: '공깃밥', liaison: '공기빱', zh: '一碗白飯' }
        ]
      }
    ],
    clerk: {
      kr: '다대기 기본으로 들어가는데 빼 드릴까요?',
      zh: '原本就有加辣醬，需要幫您拿掉嗎？',
      tip: '💡 不想喝辣湯的人，聽到 다대기(辣醬) 記得馬上點頭說 네(對)！',
      replyKr: '네, 다대기 빼고 맑게 부탁드려요!',
      replyZh: '對，請幫我拿掉辣醬，做清湯！'
    }
  },

  // 3. ☕ 咖啡甜點店
  cafe: {
    badge: '☕ 咖啡跑咖專用句',
    templates: [
      {
        id: 't_cafe_custom',
        title: '客製冰塊與奶類',
        opener: '아메리카노',
        ending: '해 주세요.',
        endingZh: '請幫我這樣做。',
        slotLabel: '點選你想調整的飲品細節：',
        slots: [
          { kr: '연하게 (1샷만)', liaison: '여나게', zh: '做淡一點 (只加 1 Shot)' },
          { kr: '얼음 적게', liaison: '어름 적께', zh: '少冰 (不要整杯都是冰塊)' },
          { kr: '오트밀크로 변경', liaison: '오트밀크로 변경', zh: '換燕麥奶 (不喝牛奶必換)' },
          { kr: '디카페인으로', liaison: '디카페이느로', zh: '換低咖啡因' }
        ]
      },
      {
        id: 't_cafe_dinein',
        title: '內用還是外帶',
        opener: '음료는',
        ending: '감사합니다.',
        endingZh: '謝謝。',
        slotLabel: '點選你要在哪裡喝：',
        slots: [
          { kr: '매장에서 먹고 갈게요.', liaison: '매장에서 먹꼬 갈께요', zh: '在店裡喝完再走 (內用)' },
          { kr: '테이크아웃(포장)할게요.', liaison: '테이크아욷할께요', zh: '外帶帶走 (外帶)' },
          { kr: '캐리어 하나 챙겨 주세요.', liaison: '캐리어 하나 챙겨 주세요', zh: '請給我一個外帶杯架提袋' }
        ]
      }
    ],
    clerk: {
      kr: '매장에서 드시고 가세요, 포장해 드릴까요?',
      zh: '請問是在店裡喝，還是外帶呢？',
      tip: '💡 韓國環保法規嚴格，說內用就不能給外帶紙杯喔！',
      replyKr: '매장에서 먹고 갈게요!',
      replyZh: '我要在店內享用！'
    }
  },

  // 4. 💉 醫美診所
  clinic: {
    badge: '💉 醫美診所專用句',
    templates: [
      {
        id: 't_clinic_concern',
        title: '向室長表達困擾部位',
        opener: '요즘',
        ending: '좀 신경 쓰여서요.',
        endingZh: '最近有點在意，想諮詢。',
        slotLabel: '點選想改善的臉部/身體困擾：',
        slots: [
          { kr: '이중턱이랑 턱선', liaison: '이중터기랑 턱썬', zh: '雙下巴與下顎線下垂' },
          { kr: '팔자주름', liaison: '팔짜주름', zh: '法令紋凹陷' },
          { kr: '모공이랑 속건조', liaison: '모공이랑 속껀조', zh: '毛孔粗大與底層缺水' },
          { kr: '눈밑 다크서클', liaison: '눈믿 다크써클', zh: '眼下淚溝與黑眼圈' },
          { kr: '사각턱 근육', liaison: '사각턱 끈육', zh: '咀嚼肌肥大 (打肉毒)' },
          { kr: '승모근', liaison: '승모근', zh: '肩頸斜方肌 (打瘦肩肉毒)' }
        ]
      },
      {
        id: 't_clinic_reject',
        title: '優雅拒絕加購 (守住預算)',
        opener: '추천 감사한데 오늘은',
        ending: '진행할게요.',
        endingZh: '謝謝推薦，但今天只做這個就好。',
        slotLabel: '點選你今天堅持要做的底線：',
        slots: [
          { kr: '원래 생각했던 것만', liaison: '월래 생가캤떤 건만', zh: '原本預約的項目就好' },
          { kr: '리쥬란 힐러 2cc만', liaison: '리쥬란 힐러 이씨씨만', zh: '麗珠蘭水光 2cc 就好' },
          { kr: '인모드 FX만', liaison: '인모드 에프엑쓰만', zh: 'InMode 雙下巴超塑就好' },
          { kr: '이벤트 가격인 걸로만', liaison: '이벤트 가격인 걸로만', zh: '特價活動款就好' }
        ]
      },
      {
        id: 't_clinic_comfort',
        title: '麻藥要求與調低能量',
        opener: '제가 아파서',
        ending: '부탁드려요.',
        endingZh: '因為我很怕痛，拜託您了。',
        slotLabel: '點選想提醒護理師/醫生的事：',
        slots: [
          { kr: '마취크림 두껍게', liaison: '마취크림 두껍께', zh: '麻藥請塗厚一點' },
          { kr: '강도 살짝만 낮춰서', liaison: '강도 살짱만 낮춰서', zh: '能量強度稍微調低一點' },
          { kr: '새 앰플 개봉 확인', liaison: '새 앰플 개봉 화긴', zh: '確認正貨安瓶開封' }
        ]
      }
    ],
    clerk: {
      kr: '패키지로 같이 하시면 할인 많이 되는데 같이 하실래요?',
      zh: '搭配套餐一起做折扣非常多，要一起做嗎？',
      tip: '💡 室長推銷必講這句！不想做就微笑用這句擋掉。',
      replyKr: '다음에 해볼게요! 오늘은 이것만 할게요.',
      replyZh: '下次再試試看！今天先做這個就好。'
    }
  },

  // 5. 👗 漢南洞服飾與鞋店
  shopping: {
    badge: '👗 服飾鞋店專用句',
    templates: [
      {
        id: 't_shop_stock',
        title: '要求拿全新庫存 (未拆封)',
        opener: '이걸로 할게요.',
        ending: '꺼내 주실 수 있나요?',
        endingZh: '能幫我拿新的出來嗎？',
        slotLabel: '點選你想要的庫存狀態：',
        slots: [
          { kr: '진열 상품 말고 새 상품으로', liaison: '지녈 상품 말고 새 상푸므로', zh: '不要展示品，拿未拆封全新品' },
          { kr: '한 치수 더 큰 걸로', liaison: '한 치수 더 큰 걸로', zh: '拿大一個尺寸的' },
          { kr: '한 치수 작은 걸로', liaison: '한 치수 자근 걸로', zh: '拿小一個尺寸的' },
          { kr: '다른 컬러로', liaison: '다른 컬러로', zh: '換別的顏色' }
        ]
      },
      {
        id: 't_shop_shoe',
        title: '鞋店試穿尺寸',
        opener: '혹시 이 신발',
        ending: '신어 봐도 될까요?',
        endingZh: '可以試穿看看嗎？',
        slotLabel: '點選你的鞋碼 (韓版公釐)：',
        slots: [
          { kr: '235(이백삼십오) 사이즈', liaison: '이백쌈시보 싸이즈', zh: '235 號 (37號)' },
          { kr: '240(이백사십) 사이즈', liaison: '이백싸십 싸이즈', zh: '240 號 (38號)' },
          { kr: '245(이백사십오) 사이즈', liaison: '이백싸시보 싸이즈', zh: '245 號 (39號)' },
          { kr: '발볼 넓은데 240', liaison: '발볼 너븐데 이백싸십', zh: '腳板偏寬試 240' }
        ]
      }
    ],
    clerk: {
      kr: '이 제품은 디피된 게 마지막 하나인데 괜찮으세요?',
      zh: '這個款式展示架上的是最後一件了，可以接受嗎？',
      tip: '💡 디피(DP)就是展示品。介意的話請他查別的分店！',
      replyKr: '아, 그럼 다른 지점 재고 있나요?',
      replyZh: '啊，那其他分店還有庫存嗎？'
    }
  },

  // 6. 💊 藥局採買急救
  pharmacy: {
    badge: '💊 藥局採買急救專用句',
    templates: [
      {
        id: 't_pharm_buy',
        title: '指名購買韓國熱門神藥',
        opener: '약사님,',
        ending: '효과 좋은 걸로 주세요.',
        endingZh: '請給我效果好的。',
        slotLabel: '點選你想買的藥品種類：',
        slots: [
          { kr: '시술 후 마시는 붓기 약', liaison: '시술 후 마시는 붇끼 약', zh: '醫美術後喝的消腫水' },
          { kr: '멍 크림(베노플러스)', liaison: '멍 크림', zh: '退瘀青藥膏' },
          { kr: '짜 먹는 위장약', liaison: '짜 멍는 위장약', zh: '吃辣胃灼熱擠著喝的胃乳' },
          { kr: '화농성 여드름 연고(애크논)', liaison: '화농썽 여드름 연고', zh: '紅腫大悶痘藥膏' },
          { kr: '흉터 치료제(노스카나)', liaison: '흉터 치료제', zh: '去痘疤凝膠' },
          { kr: '피로회복제(글루콤)', liaison: '피로회복쩨', zh: '喝的活力恢復B群安瓶' }
        ]
      }
    ],
    clerk: {
      kr: '하루 세 번 식후 30분에 드세요.',
      zh: '請一天三次、飯後30分鐘服用。',
      tip: '💡 怕回飯店忘記怎麼吃，請藥師直接把數字寫在盒子上！',
      replyKr: '박스 위에 숫자로 좀 적어 주세요!',
      replyZh: '請幫我把數字寫在藥盒上！'
    }
  },

  // 7. 🚕 計程車與退稅
  daily: {
    badge: '🚕 計程車與退稅專用句',
    templates: [
      {
        id: 't_daily_taxi',
        title: '計程車指定地點下車',
        opener: '기사님,',
        ending: '세워 주시면 돼요.',
        endingZh: '幫我停在這邊就可以了。',
        slotLabel: '點選你想下車的位置：',
        slots: [
          { kr: '여기 큰길가에', liaison: '여기 큰길까에', zh: '這裡大馬路邊' },
          { kr: '저기 사거리 앞에서', liaison: '저기 사거리 아페서', zh: '前面十字路口前' },
          { kr: '호텔 정문 앞에', liaison: '호텔 정문 아페', zh: '飯店大門口前' }
        ]
      },
      {
        id: 't_daily_tax',
        title: '結帳要求現場退稅',
        opener: '여권 있어요.',
        ending: '적용해 주세요.',
        endingZh: '我有護照，請幫我辦理。',
        slotLabel: '點選結帳退稅要求：',
        slots: [
          { kr: '택스리펀 즉시 환급', liaison: '택쓰리펀 즉씨 환급', zh: '現場直接退稅(折抵)' },
          { kr: '한국 원화(KRW)로 결제', liaison: '한국 원화로 결쪠', zh: '用韓元計價刷卡(免DCC手續費)' }
        ]
      }
    ],
    clerk: {
      kr: '골목 안은 막히는데 큰길에 내려 드려도 돼요?',
      zh: '巷子裡面很塞車，在大馬路邊讓您下車可以嗎？',
      tip: '💡 司機常在塞車時問這句，直接說好下車走進去更快！',
      replyKr: '네, 괜찮아요! 여기서 내릴게요.',
      replyZh: '好，沒關係！我在這裡下車。'
    }
  }
};
