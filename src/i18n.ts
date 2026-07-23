import { assetUrl } from '@/lib/assetUrl'

export type Lang = 'zh' | 'en'

export type AdmissionInlineLink = {
  label: string
  url: string
}

export type AdmissionTicketItem = {
  kind: 'item' | 'heading' | 'note' | 'lead'
  text: string
  url?: string
  inlineLinks?: readonly AdmissionInlineLink[]
}

const ACCUPASS_ORGANIZER_URL =
  'https://www.accupass.com/organizer/detail/1807130939251014675956'

const FVL_FACEBOOK_URL = 'https://www.facebook.com/CLAB.FUTUREVISIONLAB/'
const FVL_INSTAGRAM_URL = 'https://www.instagram.com/clab.futurevisionlab/'

/** 8/1、8/2、8/21、8/28 共用同一組節目 */
const AUG_SHARED_DATES = ['2026-08-01', '2026-08-02', '2026-08-21', '2026-08-29'] as const

const zhUnitOneIntro =
  '凝視自然、生態與地景的變遷，從生命之初到萬物循環，在穹頂視野中展開一場跨越時間與環境的沉浸旅程。'
const zhUnitTwoIntro =
  '光影、演算法與意識彼此交織，打開觀看的多重維度，重新探索科技媒介如何形塑我們感知世界的方式。'
const zhUnitThreeIntro =
  '在科技、文明與自然交會的世界裡，作品描繪未來的多重樣貌，邀請觀眾展開對未知世界的感知與想像。'
const zhUnitFourIntro =
  '即時生成的聲音與影像在穹頂空間交會，藝術家與觀眾共同參與一場持續生成的沉浸體驗，讓觀看成為彼此感知與回應的過程。'

const enUnitOneIntro =
  'Contemplating the transformations of nature, ecology, and landscape—from the dawn of life to the cycle of all things—an immersive journey across time and environment unfolds in the dome.'
const enUnitTwoIntro =
  'Light, algorithms, and consciousness intertwine to open multiple dimensions of viewing, reexamining how technology shapes the way we perceive the world.'
const enUnitThreeIntro =
  'At the intersection of technology, civilization, and nature, these works portray multiple visions of the future, inviting audiences to sense and imagine unknown worlds.'
const enUnitFourIntro =
  'Sound and image generated in real time, as artists and audiences take part in an ever-evolving immersive experience where watching becomes a process of mutual perception and response.'

const zhAugSharedPrograms = [
  { name: '萬象之初', creator: '浮點設計', duration: '3 mins', region: '臺灣' },
  { name: '入岫：穹頂', creator: '李宸安X鄭乃銓', duration: '9 mins', region: '臺灣' },
  {
    name: '油井之殤：鯨落4993尺',
    creator: '陳蘇楊X冼筱然X盧德昕',
    duration: '13 mins',
    region: '臺灣',
  },
  {
    name: 'SAT Fest 2026 獲獎作品',
    duration: '48 mins',
    region: '加拿大',
  },
] as const

const enAugSharedPrograms = [
  { name: 'Genesis', creator: 'FPA (Floating Point Art)', duration: '3 mins', region: 'Taiwan' },
  {
    name: 'Enter the Cave: Dome',
    creator: 'LEE Chen-An X Daniel CHENG',
    duration: '9 mins',
    region: 'Taiwan',
  },
  {
    name: '4993 Feet Under',
    creator: 'Ina CHEN, Calvin SIN, LU Te-Hsing',
    duration: '13 mins',
    region: 'Taiwan',
  },
  {
    name: 'SAT Fest 2026',
    duration: '48 mins',
    region: 'Canada',
  },
] as const

/** 8/7、8/8、8/9、8/22、8/29 共用同一組節目（節目二） */
const AUG_SET_B_DATES = [
  '2026-08-07',
  '2026-08-08',
  '2026-08-09',
  '2026-08-22',
  '2026-08-30',
] as const

const zhAugSetBPrograms = [
  { name: '幻幕', creator: '葉澈', duration: '3 mins', region: '臺灣' },
  { name: '角鯨之殤', creator: '張簡長倫', duration: '10 mins', region: '臺灣' },
  { name: '誤差追獵', creator: '魏廷宇', duration: '8 mins', region: '臺灣' },
  { name: '光所到之處', creator: '謝鎮璘', duration: '5 mins', region: '臺灣' },
  { name: '意識之維', creator: 'MONOCOLOR', duration: '15 mins', region: '奧地利' },
  { name: '時間層理', creator: '吳秉聖X劉承杰', duration: '22 mins', region: '臺灣' },
] as const

const enAugSetBPrograms = [
  { name: 'What A Screen!', creator: 'YEH Che', duration: '3 mins', region: 'Taiwan' },
  { name: 'Narstalgia', creator: 'Robert Chang Chien', duration: '10 mins', region: 'Taiwan' },
  { name: 'Stalking for Errors', creator: 'Tim WEI', duration: '8 mins', region: 'Taiwan' },
  {
    name: 'Where Light Arrives',
    creator: 'Damonxart (Damon HSIEH)',
    duration: '5 mins',
    region: 'Taiwan',
  },
  { name: 'NOOSPHERE', creator: 'MONOCOLOR', duration: '15 mins', region: 'Austria' },
  {
    name: 'Temporal Strata',
    creator: 'WU Ping-Sheng X Jie LIOU',
    duration: '22 mins',
    region: 'Taiwan',
  },
] as const

/** 8/14、8/15、8/16、8/30 共用同一組節目（節目三） */
const AUG_SET_C_DATES = [
  '2026-08-14',
  '2026-08-15',
  '2026-08-16',
  '2026-08-23',
] as const

const zhAugSetCPrograms = [
  { name: '第二自然', creator: '吳克軍 X 林柏勳', duration: '3 mins', region: '臺灣' },
  {
    name: '循鹿',
    creator: '桑德琳．德米耶 X 拉爾夫．基爾赫茲',
    duration: '12 mins',
    region: '法國、西班牙',
  },
  { name: '影像雜技', creator: '莊禾 X 蕭禹琦', duration: '10 mins', region: '臺灣' },
  {
    name: '新摩登時代',
    creator: '初未來 X 超維度 X 江戶未來世 X Kivi X 賴皮 X 林強',
    duration: '20 mins',
    region: '臺灣',
  },
  {
    name: '虛迷山',
    creator: '姚瑞中 X 郭一 X Meuko! Meuko!',
    duration: '12 mins',
    region: '臺灣',
  },
] as const

const enAugSetCPrograms = [
  { name: 'Second Nature', creator: 'WU Ke-Jyun X LIN Bo-Xun', duration: '3 mins', region: 'Taiwan' },
  {
    name: 'Following the deer',
    creator: 'Sandrine DEUMIER X Ralph KILLHERTZ',
    duration: '12 mins',
    region: 'France, Spain',
  },
  { name: 'Demo: Dome', creator: 'CHUANG Ho X YuChi HSIAO', duration: '10 mins', region: 'Taiwan' },
  {
    name: 'NEW MODERN TIMES',
    creator: 'Hello World x Dimension Plus x Hello Edo! x Kivi x Mr. Skin x LIM Giong',
    duration: '20 mins',
    region: 'Taiwan',
  },
  {
    name: 'Mount Ecstasy',
    creator: 'YAO Jui-Chung X Yi KUO X Meuko Meuko',
    duration: '12 mins',
    region: 'Taiwan',
  },
] as const

/** 單元一節目標題（中英），供作品字卡橘色外框對應 */
export const UNIT_ONE_PROGRAM_TITLES = [
  ...zhAugSharedPrograms.map((p) => p.name),
  ...enAugSharedPrograms.map((p) => p.name),
] as const

/** 單元二節目標題（中英） */
export const UNIT_TWO_PROGRAM_TITLES = [
  ...zhAugSetBPrograms.map((p) => p.name),
  ...enAugSetBPrograms.map((p) => p.name),
] as const

/** 單元三節目標題（中英） */
export const UNIT_THREE_PROGRAM_TITLES = [
  ...zhAugSetCPrograms.map((p) => p.name),
  ...enAugSetCPrograms.map((p) => p.name),
] as const

/** 作品字卡／行事曆：單元色對應（一橘、二藍、三紫） */
export const UNIT_ACCENT_PROGRAM_GROUPS = [
  { accent: 'orange' as const, titles: UNIT_ONE_PROGRAM_TITLES },
  { accent: 'blue' as const, titles: UNIT_TWO_PROGRAM_TITLES },
  { accent: 'purple' as const, titles: UNIT_THREE_PROGRAM_TITLES },
] as const

/** 8/23 節目四 */
const AUG_SET_D_DATES = ['2026-08-28'] as const

const zhAugSetDPrograms = [
  { name: '音像表演', duration: '50 mins', region: '臺灣' },
] as const

const enAugSetDPrograms = [
  { name: 'Live A/VJ Performance', duration: '50 mins', region: 'Taiwan' },
] as const

/** 節目表（中／英）→ 作品 API 標題關鍵字；供場次點擊開啟作品詳情 */
export type ScheduleProgramMatch = {
  zh: string
  en: string
  workKeys: readonly string[]
}

function zipScheduleProgramMatches(
  zh: readonly { name: string }[],
  en: readonly { name: string }[],
  workKeys: readonly (readonly string[])[],
): ScheduleProgramMatch[] {
  return zh.map((program, index) => ({
    zh: program.name,
    en: en[index]?.name ?? program.name,
    workKeys: workKeys[index] ?? [program.name, en[index]?.name ?? program.name],
  }))
}

export const SCHEDULE_PROGRAM_MATCHES: readonly ScheduleProgramMatch[] = [
  ...zipScheduleProgramMatches(
    zhAugSharedPrograms.filter((p) => !p.name.includes('SAT Fest')),
    enAugSharedPrograms.filter((p) => !p.name.includes('SAT Fest')),
    [
      ['萬象之初', 'Genesis'],
      ['入岫', 'Enter the Cave'],
      ['油井之殤', '4993 Feet'],
    ],
  ),
  ...zipScheduleProgramMatches(zhAugSetBPrograms, enAugSetBPrograms, [
    ['幻幕', 'What A Screen', 'Ｗhat A Screen'],
    ['角鯨之殤', 'Narstalgia'],
    ['誤差追獵', 'Stalking for Errors'],
    ['光所到之處', 'Where Light Arrives'],
    ['意識之維', 'NOOSPHERE'],
    ['時間層理', 'Temporal Strata'],
  ]),
  ...zipScheduleProgramMatches(zhAugSetCPrograms, enAugSetCPrograms, [
    ['第二自然', 'Second Nature'],
    ['循鹿', 'Following the deer'],
    ['影像雜技', 'Demo: Dome'],
    ['新摩登時代', 'NEW MODERN TIMES'],
    ['虛迷山', 'Mount Ecstasy'],
  ]),
  ...zipScheduleProgramMatches(zhAugSetDPrograms, enAugSetDPrograms, [
    ['音像表演', 'Live A/VJ Performance', 'A/VJ'],
  ]),
]

export const messages = {
  zh: {
    siteName: '2026晴空季',
    siteTagline: '臺灣文博會 CREATIVE EXPO TAIWAN 2026',
    nav: {
      admission: '入場須知',
      about: '關於我們',
      schedule: '場次',
      map: '地圖',
      works: '作品介紹',
    },
    hero: {
      kicker: '2026',
      title: '台灣文博會',
      subtitle: '藝術節',
      cta: '查看場次',
      card: {
        ariaLabel: '活動資訊',
        zhLine: '空總臺灣當代文化實驗場 - 古蹟大樓',
        enLine1: 'Taiwan Contemporary Culture Lab -',
        enLine2: 'Building',
        date: '08.01 [六] — 8.31 [一]',
      },
    },
    admission: {
      title: '入場須知',
      tabNotes: '注意事項',
      tabTickets: '入場方式',
      notesItems: [
        '演出內容有部分包含強烈閃光，敬請斟酌入場。',
        '因活動場地為鏡面地板，建議請穿著「褲裝」進場觀賞。',
        '因場內空間有限，禁止鋪設野餐墊、椅子；若有其他需求，請洽詢現場工作人員協助。',
        '播映過程可拍照、即時動態拍攝，但禁止使用閃光燈及腳架。',
        '主辦單位保有調整與變更活動之權利。',
      ],
      ticketsItems: [
        { kind: 'item', text: '採現場排隊依序入場，場內人數額滿為止。' },
        { kind: 'note', text: '＊註：8/28(五) 為現場表演，入場方式請見【索票節目】說明。' },
        { kind: 'item', text: '場內人數上限為100人，若額滿請等候場內觀眾離場後，依現場人數管制進場。' },
        { kind: 'item', text: '開放入場時若排隊人員不在現場即視同放棄，需重新排隊依序等候入場。' },
        { kind: 'heading', text: '【索票節目】' },
        { kind: 'lead', text: '索票節目共1檔：8/28(五) 17:00 / 19:00｜《音像表演》' },
        { kind: 'item', text: '一人一票憑票入場。' },
        { kind: 'item', text: '開演前10分鐘開放入場，並不開放遲到觀眾入場。' },
        {
          kind: 'item',
          text: '本節目預計在8/5(三)中午12:00於ACCUPASS開放索票。',
          inlineLinks: [{ label: 'ACCUPASS', url: ACCUPASS_ORGANIZER_URL }],
        },
        {
          kind: 'item',
          text: '索票資訊請鎖定「C-LAB 未來視覺實驗室」臉書 或 IG。',
          inlineLinks: [
            { label: '臉書', url: FVL_FACEBOOK_URL },
            { label: 'IG', url: FVL_INSTAGRAM_URL },
          ],
        },
      ] as const satisfies readonly AdmissionTicketItem[],
    },
    about: {
      eyebrow: '關於我們',
      title: 'FUTURE VISION LAB @ 晴空季',
      body: `C-LAB 未來視覺實驗室自2020年起持續推動實驗展演計畫「FUTURE VISION LAB」，以數位實驗建築為起點，建構直徑15公尺、全臺唯一的巨型移動式戶外沉浸空間「C-LAB穹頂劇場」(FVL DOME)，探索科技媒體的感知邊界，並展現臺灣科技藝術創作的跨域能量。

為呼應晴空季策展概念，在曾經承載飛行的場域中，穹頂成為新的感知介面，帶領觀眾穿梭於現實與未來之間的觀看視角，重新思考人類與科技、生態、時間與空間之間的關係，呈現當代科技藝術對未來感知的多重實驗與想像。

8月期間，將呈現歷年精彩穹頂影像作品，以及邀請加拿大 SAT 科技藝術中心「SAT Fest 2026」獲獎作品來臺進行首場國際展映；另規劃現場LIVE演出，開啟跨越感知維度的穹頂體驗。`,
    },
    /** 「關於我們」上方：滑鼠／觸控位置會改變漸層高光範圍 */
    aboutGlow: {
      ariaLabel:
        '互動光影區：八格藍／淺藍／黃綠漸層，移動游標可調整上下分界與每欄高光',
    },
    schedule: {
      title: '場次',
      infoLines: [
        '入場時間：每週五至日，12:00 – 19:00',
        '入場方式：隨到隨進，控管場內人數，不需預先索票',
      ],
      emptyDay: '本日無節目',
      weekdays: ['日', '一', '二', '三', '四', '五', '六'],
      eventDates: [
        '2026-08-01',
        '2026-08-02',
        '2026-08-07',
        '2026-08-08',
        '2026-08-09',
        '2026-08-14',
        '2026-08-15',
        '2026-08-16',
        '2026-08-21',
        '2026-08-22',
        '2026-08-23',
        '2026-08-28',
        '2026-08-29',
        '2026-08-30',
      ],
      slots: [
        ...AUG_SHARED_DATES.map((date) => ({
          date,
          name: '單元一｜凝望大地',
          groupIntro: zhUnitOneIntro,
          accent: 'orange' as const,
          items: zhAugSharedPrograms,
        })),
        ...AUG_SET_B_DATES.map((date) => ({
          date,
          name: '單元二｜穿越感官',
          groupIntro: zhUnitTwoIntro,
          accent: 'blue' as const,
          items: zhAugSetBPrograms,
        })),
        ...AUG_SET_C_DATES.map((date) => ({
          date,
          name: '單元三｜想像未來',
          groupIntro: zhUnitThreeIntro,
          accent: 'purple' as const,
          items: zhAugSetCPrograms,
        })),
        ...AUG_SET_D_DATES.map((date) => ({
          date,
          name: '單元四｜感知彼此',
          groupIntro: zhUnitFourIntro,
          accent: 'yellow' as const,
          items: zhAugSetDPrograms,
        })),
      ],
    },
    map: {
      title: '地圖',
      hint: '以下為場域示意，實際動線以現場公告為準。',
      legendA: '當代文化實驗場',
    },
    works: {
      title: '作品介紹',
      marqueePauseLabel: '暫停',
      marqueePlayLabel: '播放',
      marqueePauseAria: '暫停作品輪播',
      marqueePlayAria: '繼續作品輪播',
      detailCloseAria: '關閉作品詳情',
      detailPrevAria: '上一張',
      detailNextAria: '下一張',
      detailArtistsAria: '藝術家',
      detailPagePrevAria: '上一頁：作品介紹',
      detailPageNextAria: '下一頁：藝術家',
      detailWorkTab: '作品介紹',
      detailArtistTab: '藝術家介紹',
      detailArtistBioLoading: '載入介紹中…',
      detailArtistBioEmpty: '暫無藝術家介紹',
      detailOpenHint: '開啟作品詳情',
      /**
       * 每張卡片：image 跑馬燈縮圖；gallery 詳情輪播。
       * intro／subtitle 選填；body 可用空行 \\n\\n 分段。字卡為頂欄標題＋左圖右文。
       */
      cards: [
        {
          title: '濕地迴聲',
          image: assetUrl('aboutus.jpeg'),
          gallery: [assetUrl('aboutus.jpeg'), assetUrl('CET.png')],
          intro:
            '創作者長期以聲音與空間為實驗場域，作品游走於裝置、現場演出與聆聽經驗的交界，關注聽覺如何重塑我們對地景與身體的想像。',
          subtitle: '濕地迴聲 Wetland Echo',
          body:
            '本作品以水面與聲學採樣重塑濕地感知，引導觀眾在暗室中聽見地景的微弱回聲與節奏。路徑刻意迴避傳統白盒子敘事，改以低照度與質地讓注意力回到「聽」本身。\n\n展場材料與聲學反射經反覆測試，使同一空間在不同時刻呈現細微差異的聆聽結果；觀眾的停留與移動，也將即時改寫聲音的結構。',
        },
        {
          title: '頻移',
          image: assetUrl('CET.png'),
          gallery: [assetUrl('CET.png'), assetUrl('aboutus.jpeg')],
          intro: '作品以即時訊號與回授路徑作為方法，藉由身體位移探測城市裡常被忽略的頻率層次。',
          subtitle: '頻移 Frequency Shift',
          body:
            '透過即時訊號與空間回授，讓「聽見的頻率」隨移動而偏移。觀眾在路徑中成為訊號的一部分，聲音場域因位置與速度而持續改寫。\n\n此作嘗試將「不可見頻譜」轉為可感的聽覺事件，並在短暫的聆聽片刻裡，提示城市聲景的政治性。',
        },
        {
          title: '天井之下',
          image: assetUrl('aboutus.jpeg'),
          gallery: [assetUrl('aboutus.jpeg'), assetUrl('CET.png'), assetUrl('aboutus.jpeg')],
          subtitle: '天井之下',
          body:
            '藉由光影與拾得物構築一方垂直天井，召喚建築縫隙裡的時間與風向。材料來自城市邊角，經重新編排成可穿越的微型地景。\n\n觀眾抬頭或俯身時，身體會遭遇不同的光線重量；作品的時間感來自慢速光影與偶發聲響的交錯。',
        },
        {
          title: '天井之下',
          image: assetUrl('CET.png'),
          gallery: [assetUrl('CET.png'), assetUrl('aboutus.jpeg')],
          body:
            '藉由光影與拾得物構築一方垂直天井，召喚建築縫隙裡的時間與風向。\n\n空間以節奏而非敘事主導，讓觀者在放慢的步速裡重新感受建築與身體的關係。',
        },
        {
          title: '天井之下',
          image: assetUrl('aboutus.jpeg'),
          gallery: [assetUrl('aboutus.jpeg'), assetUrl('CET.png')],
          body:
            '藉由光影與拾得物構築一方垂直天井，召喚建築縫隙裡的時間與風向；材料與陰影共同書寫一段短暫停留的記憶。',
        },
        {
          title: '天井之下',
          image: assetUrl('CET.png'),
          gallery: [assetUrl('CET.png'), assetUrl('aboutus.jpeg'), assetUrl('CET.png')],
          body:
            '藉由光影與拾得物構築一方垂直天井，召喚建築縫隙裡的時間與風向。路徑與視線在天井尺度中被重新校準。',
        },
      ],
    },
    credits: {
      title: '製作團隊',
      subtitle: 'FUTURE VISION LAB @ 晴空季',
      groups: [
        [
          { role: '計畫主持人', names: '蔡奇宏' },
          { role: '節目統籌', names: '廖苑喻、陳湘綺' },
          { role: '技術統籌', names: '蔡奇宏' },
          { role: '技術執行', names: '劉嘉昀、邱文雍、楊泓軒' },
        ],
        [
          { role: '前期建築概念設計', names: '陽明交通大學建築研究所 JHStudio' },
          { role: '建築工程', names: 'achy_made' },
          { role: '聲場設計', names: 'C-LAB 臺灣聲響實驗室' },
        ],
        [
          { role: '網站設計', names: '林瀚寬' },
          { role: '靜態攝影', names: 'ANPIS FOTO 王世邦' },
          { role: '動態攝影', names: '散步映畫有限公司' },
        ],
      ],
      artists: {
        role: '參與藝術家',
        names:
          '王新仁、江戶未來世、加布里耶拉．比拉、初未來、吳秉聖、吳克軍、李宸安、拉爾夫．基爾赫茲、亞歷山大．羅伊、阿嘉塔．史塔舒克、洗筱然、林強、姚瑞中、浮點設計、莊禾、張簡長倫、創意星球、葉澈、莉迪亞．雅科諾夫斯基、超維度、郭一、傑瑞米．格里福、霍爾格．普朗、劉承杰、劉東昱、盧德昕、蕭禹琦、陳蘇楊、賴皮、謝鎮璘、鄭乃銓、魏廷宇、托特．蒂爾．馬爾滕、Kivi、MONOCOLOR、Meuko! Meuko!、Fantastik Obsolete、Ribs+Seixas',
      },
      orgs: [
        { role: '主辦單位', name: 'C-LAB', logo: assetUrl('C-LAB.png') },
        { role: '補助單位', name: '文化部', logo: assetUrl('文化部.png') },
        { role: '執行單位', name: '未來視覺實驗室', logo: assetUrl('logo2.jpg') },
      ],
    },
    footer: {
      contact: '聯絡： info@clab.org.tw',
      copy: '© 2026 財團法人臺灣生活美學基金會. All Rights Reserved.',
    },
    /** 右側社群直欄（連結請依實際官方帳號修改） */
    social: {
      railAria: '社群媒體',
      facebook: 'Facebook',
      instagram: 'Instagram',
      youtube: 'YouTube',
      backToTop: '回到頂部',
      urls: {
        facebook: 'https://www.facebook.com/CLAB.FUTUREVISIONLAB/',
        instagram: 'https://www.instagram.com/clab.futurevisionlab/',
        youtube: 'https://www.youtube.com/playlist?list=PLXJ_MjvcL-q5V-vae8rmre2Rz4ZTjB6gF',
      },
    },
    langSwitch: '語言',
  },
  en: {
    siteName: '2026 Creative Expo Taiwan',
    siteTagline: 'CREATIVE EXPO TAIWAN 2026',
    nav: {
      admission: 'Visitor Info',
      about: 'About',
      schedule: 'Schedule',
      map: 'Map',
      works: 'Works',
    },
    hero: {
      kicker: '2026',
      title: 'Creative Expo Taiwan',
      subtitle: 'Art Festival',
      cta: 'View schedule',
      card: {
        ariaLabel: 'Event information',
        zhLine: '空總臺灣當代文化實驗場 - 古蹟大樓',
        enLine1: 'Taiwan Contemporary Culture Lab -',
        enLine2: 'Building',
        date: '08.01 [Sat] — 8.31 [Mon]',
      },
    },
    admission: {
      title: 'Visitor information',
      tabNotes: 'Notice',
      tabTickets: 'Admission Information',
      notesItems: [
        'Some programs contain intense strobe lighting effects. Viewer discretion is advised.',
        'Due to the mirror floor in the venue, wearing "pants" for your visit is recommended.',
        'Due to limited space inside the venue, picnic mats and chairs are not allowed. If you have other needs, please contact the staff for assistance.',
        'Photography and reels recording are allowed during the screening, but the use of flash and tripods is prohibited.',
        'Programs may be subject to change.',
      ],
      ticketsItems: [
        { kind: 'item', text: 'Entry will be granted in order of on-site queue until capacity is reached.' },
        {
          kind: 'note',
          text: '＊Note: Friday, August 28 features a live performance. Please see the Ticketed Events section for admission information.',
        },
        {
          kind: 'item',
          text: 'The maximum capacity is 100 people. If the venue is full, please wait for audiences exiting before entering according to the capacity control.',
        },
        {
          kind: 'item',
          text: 'If individuals in the queue are not present when entry opens, they will be considered to have forfeited their places and must rejoin the line in order to wait for entry.',
        },
        { kind: 'heading', text: '【Ticketed Event】' },
        {
          kind: 'lead',
          text: 'Ticketed Event includes 17:00 & 19:00 on August 28 (Fri.) "D/VJ Live performance"',
        },
        { kind: 'item', text: 'One person, one ticket admission.' },
        {
          kind: 'item',
          text: 'Please arrive at least 10 minutes before the performance or screening. Latecomers will not be admitted.',
        },
        {
          kind: 'item',
          text: 'Tickets will be available on ACCUPASS starting Wednesday, August 5th at 12:00 PM.',
          inlineLinks: [{ label: 'ACCUPASS', url: ACCUPASS_ORGANIZER_URL }],
        },
        {
          kind: 'item',
          text: 'For detailed program registration information, please visit the "C-LAB Future Vision Lab" Facebook page or Instagram.',
          inlineLinks: [
            { label: 'Facebook page', url: FVL_FACEBOOK_URL },
            { label: 'Instagram', url: FVL_INSTAGRAM_URL },
          ],
        },
      ] as const satisfies readonly AdmissionTicketItem[],
    },
    about: {
      eyebrow: 'About us',
      title: 'FUTURE VISION LAB @ Skyward',
      body: `Since 2020, the C-LAB Future Vision Lab has developed the “FUTURE VISION LAB” experiment program with Taiwan’s only mobile outdoor dome- “FVL DOME”. Originating from experimental digital architecture, this program explores the boundaries of perception shaped by technology and highlights the interdisciplinary creativity of Taiwan’s tech-art scene.

Responding to the Skyward 2026's curatorial theme, FVL DOME becomes a new perceptual interface at the former aviation site, inviting audiences to rethink the relationships between humanity, technology, ecology, time, and space. In August, FVL will screen the selected fulldome films from previous editions, alongside the Taiwan premiere of award-winning pieces from “SAT Fest 2026” by the SAT – Society for Arts and Technology, as well as the live audiovisual performance.`,
    },
    aboutGlow: {
      ariaLabel:
        'Eight-cell blue / cyan / yellow gradient—drag to adjust divider and glow',
    },
    schedule: {
      title: 'Schedule',
      infoLines: [
        'Opening hours: Fri–Sun, 12:00 – 19:00',
        'Admission: Walk-in with on-site capacity control; no reservation required',
      ],
      emptyDay: 'No programmes on this day',
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      eventDates: [
        '2026-08-01',
        '2026-08-02',
        '2026-08-07',
        '2026-08-08',
        '2026-08-09',
        '2026-08-14',
        '2026-08-15',
        '2026-08-16',
        '2026-08-21',
        '2026-08-22',
        '2026-08-23',
        '2026-08-28',
        '2026-08-29',
        '2026-08-30',
      ],
      slots: [
        ...AUG_SHARED_DATES.map((date) => ({
          date,
          name: 'Program 1 | Gazing at the Earth',
          groupIntro: enUnitOneIntro,
          accent: 'orange' as const,
          items: enAugSharedPrograms,
        })),
        ...AUG_SET_B_DATES.map((date) => ({
          date,
          name: 'Program 2｜Traversing the Senses',
          groupIntro: enUnitTwoIntro,
          accent: 'blue' as const,
          items: enAugSetBPrograms,
        })),
        ...AUG_SET_C_DATES.map((date) => ({
          date,
          name: 'Program 3｜Imagining the Future',
          groupIntro: enUnitThreeIntro,
          accent: 'purple' as const,
          items: enAugSetCPrograms,
        })),
        ...AUG_SET_D_DATES.map((date) => ({
          date,
          name: 'Program 4 | Sensing Each Other',
          groupIntro: enUnitFourIntro,
          accent: 'yellow' as const,
          items: enAugSetDPrograms,
        })),
      ],
    },
    map: {
      title: 'Map',
      hint: 'Map is indicative; follow on-site directions during your visit.',
      legendA: 'Taiwan Contemporary Culture Lab (C-LAB)',
    },
    works: {
      title: 'Artworks',
      marqueePauseLabel: 'Pause',
      marqueePlayLabel: 'Play',
      marqueePauseAria: 'Pause works carousel',
      marqueePlayAria: 'Resume works carousel',
      detailCloseAria: 'Close artwork details',
      detailPrevAria: 'Previous image',
      detailNextAria: 'Next image',
      detailArtistsAria: 'Artists',
      detailPagePrevAria: 'Previous: artwork',
      detailPageNextAria: 'Next: artist',
      detailWorkTab: 'Artwork',
      detailArtistTab: 'Artist',
      detailArtistBioLoading: 'Loading bio…',
      detailArtistBioEmpty: 'No artist bio available',
      detailOpenHint: 'Open artwork details',
      cards: [
        {
          title: 'Wetland Echo',
          image: assetUrl('aboutus.jpeg'),
          gallery: [assetUrl('aboutus.jpeg'), assetUrl('CET.png')],
          intro:
            'The artist works at the intersection of sound and space—between installation, live performance, and listening as a situated practice—asking how hearing reshapes landscape and embodiment.',
          subtitle: 'Wetland Echo',
          body:
            'Water and acoustic sampling reshape wetland perception, guiding listeners in a dimmed room toward faint echoes and rhythms. The route avoids a conventional white-cube narrative, using low light and texture to return attention to listening itself.\n\nMaterials and reflections were tuned through iteration so the same space can sound subtly different from one moment to the next; staying still or moving through the field immediately rewrites the sound.',
        },
        {
          title: 'Frequency Shift',
          image: assetUrl('CET.png'),
          gallery: [assetUrl('CET.png'), assetUrl('aboutus.jpeg')],
          intro:
            'Live signal paths and feedback are used as a method to trace frequency layers in the city that often go unnoticed.',
          subtitle: 'Frequency Shift',
          body:
            'Live signals and spatial feedback shift what you hear as you move—probing invisible spectra in the city. You become part of the signal chain, and the sound field is continuously rewritten by position and pace.\n\nThe piece asks how a brief listening moment can make the politics of urban sound audible.',
        },
        {
          title: 'Below the Patio',
          image: assetUrl('aboutus.jpeg'),
          gallery: [assetUrl('aboutus.jpeg'), assetUrl('CET.png'), assetUrl('aboutus.jpeg')],
          subtitle: 'Below the Patio',
          body:
            'Light, shadow, and found objects sketch a vertical patio—air and time caught in architectural seams. Materials come from the edges of the city, recomposed into a walkable micro‑landscape.\n\nLooking up or leaning down, the body meets different weights of light; time is carried by slow illumination and incidental sound.',
        },
        {
          title: 'Below the Patio',
          image: assetUrl('CET.png'),
          gallery: [assetUrl('CET.png'), assetUrl('aboutus.jpeg')],
          body:
            'Light, shadow, and found objects sketch a vertical patio—air and time caught in architectural seams.\n\nThe space is led by rhythm rather than plot, inviting a slower pace to re‑feel the relation between body and building.',
        },
        {
          title: 'Below the Patio',
          image: assetUrl('aboutus.jpeg'),
          gallery: [assetUrl('aboutus.jpeg'), assetUrl('CET.png')],
          body:
            'Light, shadow, and found objects sketch a vertical patio—air and time caught in architectural seams; materials and shadows together inscribe a memory of brief stays.',
        },
        {
          title: 'Below the Patio',
          image: assetUrl('CET.png'),
          gallery: [assetUrl('CET.png'), assetUrl('aboutus.jpeg'), assetUrl('CET.png')],
          body:
            'Light, shadow, and found objects sketch a vertical patio—air and time caught in architectural seams. Paths and sightlines are recalibrated to the patio scale.',
        },
      ],
    },
    credits: {
      title: 'Credit List',
      subtitle: 'FUTURE VISION LAB @ Skyward',
      groups: [
        [
          { role: 'Project Principal', names: 'Warrick TSAI' },
          { role: 'Project Manager', names: 'Emma LIAO, CHEN Hsiang-Chi' },
          { role: 'Technical Director', names: 'Warrick TSAI' },
          { role: 'Technical Coordinator', names: 'LIU Chia-Yun, CHIU Wen-Yung, Snow YANG' },
        ],
        [
          {
            role: 'Preliminary Conceptual Design',
            names: 'JHStudio, Department of Architecture, National Yang Ming Chiao Tung University',
          },
          { role: 'Architectural Fabrication', names: 'achy_made' },
          { role: 'Sound Field Design', names: 'C-LAB Taiwan Sound Lab' },
        ],
        [
          { role: 'Website Design', names: 'LIN Han-Kuan' },
          { role: 'Photo Documentation', names: 'ANPIS FOTO' },
          { role: 'Video Documentation', names: 'Cinemaruku Co., Ltd.' },
        ],
      ],
      artists: {
        role: 'Artist',
        names:
          'Gabriela BILÁ, Robert CHANG CHIEN, Ina CHEN, Daniel CHENG, Creative Planet, Sandrine DEUMIER, Damonxart, Dimension Plus, Floating Point Art, Hello Edo!, Hello World, Yuchi HSIAO, Jérémy Griffaud, Yi KUO, Ralph KILLHERTZ, Kivi, Jie LIOU, LIM Giong, LU Te-Hsing, Lydia YAKONOWSKY, Meuko Meuko, MONOCOLOR, Mr. Skin, Fantastik Obsolete, Holger PRANG, Ribs+Seixas, Alexandre ROY, Agata STASZCZUK, Calvin SIN, Tote TIERE MAARTEN, Tim WEI, Aluan WANG, WU Ke-Jyun, WU Ping-Sheng, YAO Jui-Chung, YEH Che',
      },
      orgs: [
        { role: 'Organizer', name: 'C-LAB', logo: assetUrl('C-LAB.png') },
        { role: 'Supported by', name: 'MOC', logo: assetUrl('文化部.png') },
        { role: 'Executive Organizer', name: 'C-LAB Future Vision Lab', logo: assetUrl('logo2.jpg') },
      ],
    },
    footer: {
      contact: 'Contact: info@clab.org.tw',
      copy: '© 2026 Taiwan Contemporary Culture Lab. All Rights Reserved.',
    },
    social: {
      railAria: 'Social media',
      facebook: 'Facebook',
      instagram: 'Instagram',
      youtube: 'YouTube',
      backToTop: 'Back to top',
      urls: {
        facebook: 'https://www.facebook.com/CLAB.FUTUREVISIONLAB/',
        instagram: 'https://www.instagram.com/clab.futurevisionlab/',
        youtube: 'https://www.youtube.com/playlist?list=PLXJ_MjvcL-q5V-vae8rmre2Rz4ZTjB6gF',
      },
    },
    langSwitch: 'Language',
  },
} as const satisfies Record<
  Lang,
  Record<string, unknown>
>
