export type Lang = 'zh' | 'en'

/** 8/1、8/2、8/21、8/28 共用同一組節目 */
const AUG_SHARED_DATES = ['2026-08-01', '2026-08-02', '2026-08-21', '2026-08-28'] as const

const zhAugSharedPrograms = [
  { name: '萬象之初', creator: '浮點設計', duration: '3 mins', region: '臺灣' },
  { name: '角鯨之殤', creator: '張簡長倫', duration: '10 mins', region: '臺灣' },
  { name: '入岫：穹頂', creator: '李宸安、鄭乃銓', duration: '9 mins', region: '臺灣' },
  {
    name: '油井之殤：鯨落4993尺',
    creator: '陳蘇楊、洗筱然、盧德昕',
    duration: '13 mins',
    region: '臺灣',
  },
  {
    name: 'SAT Fest 2026作品精選',
    creator: '加拿大 SAT科技藝術中心 / Hubblo',
    duration: '25 mins',
    region: '加拿大等',
  },
] as const

const enAugSharedPrograms = [
  { name: 'Genesis of All Things', creator: 'Floating Point Design', duration: '3 mins', region: 'Taiwan' },
  { name: 'The Loss of Right Whale', creator: 'Chang Chien-Lun', duration: '10 mins', region: 'Taiwan' },
  {
    name: 'Into the Mountain: Dome',
    creator: 'Lee Chen-An, Cheng Nai-Chuan',
    duration: '9 mins',
    region: 'Taiwan',
  },
  {
    name: 'Death of Oil Well: Whale Fall 4993 ft',
    creator: 'Chen Su-Yang, Xi Xiao-Ran, Lu De-Xin',
    duration: '13 mins',
    region: 'Taiwan',
  },
  {
    name: 'SAT Fest 2026 Highlights',
    creator: 'SAT Montréal / Hubblo',
    duration: '25 mins',
    region: 'Canada, etc.',
  },
] as const

/** 8/7、8/8、8/9、8/22、8/29 共用同一組節目（節目二） */
const AUG_SET_B_DATES = [
  '2026-08-07',
  '2026-08-08',
  '2026-08-09',
  '2026-08-22',
  '2026-08-29',
] as const

const zhAugSetBPrograms = [
  { name: '幻幕', creator: '葉澈', duration: '3 mins', region: '臺灣' },
  { name: '誤差追獵', creator: '魏廷宇', duration: '12 mins', region: '臺灣' },
  { name: '光所到之處', creator: '謝鎮璘', duration: '5 mins', region: '臺灣' },
  { name: '意識之維', creator: 'MONOCOLOR', duration: '15 mins', region: '奧地利' },
  { name: '時間層理', creator: '吳秉聖、劉承杰', duration: '22 mins', region: '臺灣' },
] as const

const enAugSetBPrograms = [
  { name: 'Phantom Veil', creator: 'Ye Che', duration: '3 mins', region: 'Taiwan' },
  { name: 'Deviation Hunt', creator: 'Wei Ting-Yu', duration: '12 mins', region: 'Taiwan' },
  { name: 'Where Light Reaches', creator: 'Hsieh Chen-Lin', duration: '5 mins', region: 'Taiwan' },
  { name: 'Dimension of Consciousness', creator: 'MONOCOLOR', duration: '15 mins', region: 'Austria' },
  {
    name: 'Stratigraphy of Time',
    creator: 'Wu Ping-Sheng, Liu Cheng-Jie',
    duration: '22 mins',
    region: 'Taiwan',
  },
] as const

/** 8/14、8/15、8/16、8/30 共用同一組節目（節目三） */
const AUG_SET_C_DATES = [
  '2026-08-14',
  '2026-08-15',
  '2026-08-16',
  '2026-08-30',
] as const

const zhAugSetCPrograms = [
  { name: '第二自然', creator: '吳克軍 x 林柏勳', duration: '3 mins', region: '臺灣' },
  {
    name: '循鹿',
    creator: '桑德琳．德米耶、拉爾夫．基爾赫茲',
    duration: '12 mins',
    region: '法國、西班牙',
  },
  { name: '影像雜技', creator: '莊禾 x 蕭禹琦', duration: '10 mins', region: '臺灣' },
  {
    name: '新摩登時代',
    creator: '初未來 x 超維度 x 江戶未來世 x Kivi x 賴皮 x 林強',
    duration: '20 mins',
    region: '臺灣',
  },
  {
    name: '虛迷山',
    creator: '姚瑞中、郭一、Meuko! Meuko!',
    duration: '12 mins',
    region: '臺灣',
  },
] as const

const enAugSetCPrograms = [
  { name: 'Second Nature', creator: 'Wu Ke-Jun x Lin Po-Hsun', duration: '3 mins', region: 'Taiwan' },
  {
    name: 'Following the Deer',
    creator: 'Sandrine Deumier, Ralph Killhertz',
    duration: '12 mins',
    region: 'France, Spain',
  },
  { name: 'Visual Acrobatics', creator: 'Chuang He x Hsiao Yu-Chi', duration: '10 mins', region: 'Taiwan' },
  {
    name: 'New Modern Times',
    creator: 'Chu Future x Hyper Dimension x Edo Miraiyo x Kivi x Lai Pi x Lim Giong',
    duration: '20 mins',
    region: 'Taiwan',
  },
  {
    name: 'Mount Ecstasy',
    creator: 'Yao Jui-Chung, Kuo Yi, Meuko! Meuko!',
    duration: '12 mins',
    region: 'Taiwan',
  },
] as const

/** 8/23 節目四 */
const AUG_SET_D_DATES = ['2026-08-23'] as const

const zhAugSetDPrograms = [
  { name: '現場 A/VJ', creator: '魏廷宇、TBD', duration: '50 mins', region: '臺灣' },
] as const

const enAugSetDPrograms = [
  { name: 'Live A/VJ', creator: 'Wei Ting-Yu, TBD', duration: '50 mins', region: 'Taiwan' },
] as const

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
      tabTickets: '索票／購票／入場方式',
      notesItems: [
        '演出含強烈閃光，請斟酌入場。',
        '場地為鏡面地板，建議穿著長褲。',
        '因空間有限，禁止野餐墊與座椅；若需協助請洽現場工作人員。',
        '放映／展場內可拍照與直播，禁止閃光燈與腳架。',
        '如遇天候或不可抗力，主辦單位保留調整活動／動線／場次之權利。',
      ],
      ticketsItems: [
        '請於主辦指定管道完成索票或購票，入場請出示電子票券、QR Code 或實體票並配合驗票。',
        '各場名額有限，售完／額滿恕不另行開放或現場售票者依公告為準。',
        '請依票面場次時間入場；遲到觀眾請依現場工作人員引導，可能無法保證原位或完整觀賞動線。',
        '優惠票券請自備並出示符合規定之身分證明或文件以利查驗。',
        '票券逾期未使用視同放棄，退票與異動請依售票平台規定辦理。',
      ],
    },
    about: {
      title: '關於我們',
      body: `自2020年起，C-LAB 未來視覺實驗室持續推動實驗展演計畫「FUTURE VISION LAB」，並以數位實驗建築為起點，打造穹形場域（DOME），持續探索科技媒體的視覺極限，過去六年已進行超過兩百件作品展演。2023年，在文化部支持下完成軟硬體升級，打造直徑15公尺、全臺唯一的巨型移動式戶外沉浸體驗空間「C-LAB穹頂劇場」。沉浸影像投影系統總運算可達 8K × 8K 超高解析度，並克服球形曲面投影在校正、融接、對位、播放控制與影像前製等多重技術挑戰。場域採雙層結構設計，搭配客製透聲投影膜片與25.4聲道環繞聲場環境，打造高規格沉浸式體驗。未來視覺實驗室持續優化穹形場域之創作環境，並向國際標準接軌，展現臺灣在科技藝術領域的創作能量。

「FUTURE VISION LAB 2026」將自 2026年4月18日至6月7日，連續8個週末登場，匯集來自臺灣、法國、西班牙、匈牙利、奧地利、韓國、日本、美國與加拿大等各地精彩作品，共呈現19件作品、16檔節目。透過展覽、播映與現場 Live 演出等多元形式，在跨國創作的交會之中，邀請觀眾走入C-LAB穹頂劇場，沉浸於多元文化交織的感官體驗。`,
      officialAboutUrl: 'https://fvl.clab.org.tw/festival/2026',
      moreLabel: '瞭解更多',
      officialAboutAria:
        '開啟 FUTURE VISION LAB 2026 官方網站（另開新分頁）',
    },
    /** 「關於我們」上方：滑鼠／觸控位置會改變漸層高光範圍 */
    aboutGlow: {
      ariaLabel:
        '互動光影區：八格藍／淺藍／黃綠漸層，移動游標可調整上下分界與每欄高光',
    },
    schedule: {
      title: '場次',
      note: '* 實際節目以現場公告為準',
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
          name: '節目一',
          items: zhAugSharedPrograms,
        })),
        ...AUG_SET_B_DATES.map((date) => ({
          date,
          name: '節目二',
          items: zhAugSetBPrograms,
        })),
        ...AUG_SET_C_DATES.map((date) => ({
          date,
          name: '節目三',
          items: zhAugSetCPrograms,
        })),
        ...AUG_SET_D_DATES.map((date) => ({
          date,
          name: '節目四',
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
      detailOpenHint: '開啟作品詳情',
      /**
       * 每張卡片：image 跑馬燈縮圖；gallery 詳情輪播。
       * intro／subtitle 選填；body 可用空行 \\n\\n 分段。字卡為頂欄標題＋左圖右文。
       */
      cards: [
        {
          title: '濕地迴聲',
          image: '/aboutus.jpeg',
          gallery: ['/aboutus.jpeg', '/CET.png'],
          intro:
            '創作者長期以聲音與空間為實驗場域，作品游走於裝置、現場演出與聆聽經驗的交界，關注聽覺如何重塑我們對地景與身體的想像。',
          subtitle: '濕地迴聲 Wetland Echo',
          body:
            '本作品以水面與聲學採樣重塑濕地感知，引導觀眾在暗室中聽見地景的微弱回聲與節奏。路徑刻意迴避傳統白盒子敘事，改以低照度與質地讓注意力回到「聽」本身。\n\n展場材料與聲學反射經反覆測試，使同一空間在不同時刻呈現細微差異的聆聽結果；觀眾的停留與移動，也將即時改寫聲音的結構。',
        },
        {
          title: '頻移',
          image: '/CET.png',
          gallery: ['/CET.png', '/aboutus.jpeg'],
          intro: '作品以即時訊號與回授路徑作為方法，藉由身體位移探測城市裡常被忽略的頻率層次。',
          subtitle: '頻移 Frequency Shift',
          body:
            '透過即時訊號與空間回授，讓「聽見的頻率」隨移動而偏移。觀眾在路徑中成為訊號的一部分，聲音場域因位置與速度而持續改寫。\n\n此作嘗試將「不可見頻譜」轉為可感的聽覺事件，並在短暫的聆聽片刻裡，提示城市聲景的政治性。',
        },
        {
          title: '天井之下',
          image: '/aboutus.jpeg',
          gallery: ['/aboutus.jpeg', '/CET.png', '/aboutus.jpeg'],
          subtitle: '天井之下',
          body:
            '藉由光影與拾得物構築一方垂直天井，召喚建築縫隙裡的時間與風向。材料來自城市邊角，經重新編排成可穿越的微型地景。\n\n觀眾抬頭或俯身時，身體會遭遇不同的光線重量；作品的時間感來自慢速光影與偶發聲響的交錯。',
        },
        {
          title: '天井之下',
          image: '/CET.png',
          gallery: ['/CET.png', '/aboutus.jpeg'],
          body:
            '藉由光影與拾得物構築一方垂直天井，召喚建築縫隙裡的時間與風向。\n\n空間以節奏而非敘事主導，讓觀者在放慢的步速裡重新感受建築與身體的關係。',
        },
        {
          title: '天井之下',
          image: '/aboutus.jpeg',
          gallery: ['/aboutus.jpeg', '/CET.png'],
          body:
            '藉由光影與拾得物構築一方垂直天井，召喚建築縫隙裡的時間與風向；材料與陰影共同書寫一段短暫停留的記憶。',
        },
        {
          title: '天井之下',
          image: '/CET.png',
          gallery: ['/CET.png', '/aboutus.jpeg', '/CET.png'],
          body:
            '藉由光影與拾得物構築一方垂直天井，召喚建築縫隙裡的時間與風向。路徑與視線在天井尺度中被重新校準。',
        },
      ],
    },
    footer: {
      organizer: '主辦：C-LAB當代文化實驗場',
      contact: '聯絡： info@clab.org.tw',
      copy: '© 2026 C-LAB Future Vision Lab. All Rights Reserved.',
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
      tabNotes: 'Notes',
      tabTickets: 'Tickets & entry',
      notesItems: [
        'Performances include intense flashing lights—please judge whether entry is suitable for you.',
        'Mirrored flooring is used in parts of the venue; long trousers are recommended.',
        'Picnic blankets and folding chairs are not allowed due to limited space; speak to venue staff if you need assistance.',
        'Photography and live streaming may be permitted in designated areas—no flash or tripods unless announced otherwise.',
        'The organiser reserves the right to adjust or change programmes, routes, or schedules due to weather or force majeure.',
      ],
      ticketsItems: [
        'Claim or purchase tickets via the designated channels shown by the organiser. Present your e‑ticket, QR code, or paper ticket for admission and cooperate with verification.',
        'Capacity is limited; when sold out, no sales or walk‑ins beyond published rules.',
        'Arrive according to your ticketed slot; late arrivals will be seated or guided according to onsite staff—in some cases seating or routing may change.',
        'For concession tickets please bring qualifying ID / documents listed on the ticketing page.',
        'Unused admission may be forfeited past the ticket time; refunds and changes follow each platform’s terms.',
      ],
    },
    about: {
      title: 'About us',
      body: `Urban Spectrum is shaped by local curators and collaborating artists across immersive environments, sound, and new media—inviting audiences to read the city through body and senses.\n\nWe believe art strengthens communities and dialogue, and builds shared memories beyond conventional venues. This year takes “spectrum” as a metaphor, translating overlooked everyday signals—sound, scent, texture, and temperature—into tangible artistic language.`,
      officialAboutUrl: 'https://fvl.clab.org.tw/festival/2026',
      moreLabel: 'Learn more',
      officialAboutAria:
        'Open FUTURE VISION LAB 2026 official website (new tab)',
    },
    aboutGlow: {
      ariaLabel:
        'Eight-cell blue / cyan / yellow gradient—drag to adjust divider and glow',
    },
    schedule: {
      title: 'Schedule',
      note: '＊Programmes are subject to on-site announcements',
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
          name: 'Program 1',
          items: enAugSharedPrograms,
        })),
        ...AUG_SET_B_DATES.map((date) => ({
          date,
          name: 'Program 2',
          items: enAugSetBPrograms,
        })),
        ...AUG_SET_C_DATES.map((date) => ({
          date,
          name: 'Program 3',
          items: enAugSetCPrograms,
        })),
        ...AUG_SET_D_DATES.map((date) => ({
          date,
          name: 'Program 4',
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
      title: 'Selected works',
      marqueePauseLabel: 'Pause',
      marqueePlayLabel: 'Play',
      marqueePauseAria: 'Pause works carousel',
      marqueePlayAria: 'Resume works carousel',
      detailCloseAria: 'Close artwork details',
      detailPrevAria: 'Previous image',
      detailNextAria: 'Next image',
      detailArtistsAria: 'Artists',
      detailOpenHint: 'Open artwork details',
      cards: [
        {
          title: 'Wetland Echo',
          image: '/aboutus.jpeg',
          gallery: ['/aboutus.jpeg', '/CET.png'],
          intro:
            'The artist works at the intersection of sound and space—between installation, live performance, and listening as a situated practice—asking how hearing reshapes landscape and embodiment.',
          subtitle: 'Wetland Echo',
          body:
            'Water and acoustic sampling reshape wetland perception, guiding listeners in a dimmed room toward faint echoes and rhythms. The route avoids a conventional white-cube narrative, using low light and texture to return attention to listening itself.\n\nMaterials and reflections were tuned through iteration so the same space can sound subtly different from one moment to the next; staying still or moving through the field immediately rewrites the sound.',
        },
        {
          title: 'Frequency Shift',
          image: '/CET.png',
          gallery: ['/CET.png', '/aboutus.jpeg'],
          intro:
            'Live signal paths and feedback are used as a method to trace frequency layers in the city that often go unnoticed.',
          subtitle: 'Frequency Shift',
          body:
            'Live signals and spatial feedback shift what you hear as you move—probing invisible spectra in the city. You become part of the signal chain, and the sound field is continuously rewritten by position and pace.\n\nThe piece asks how a brief listening moment can make the politics of urban sound audible.',
        },
        {
          title: 'Below the Patio',
          image: '/aboutus.jpeg',
          gallery: ['/aboutus.jpeg', '/CET.png', '/aboutus.jpeg'],
          subtitle: 'Below the Patio',
          body:
            'Light, shadow, and found objects sketch a vertical patio—air and time caught in architectural seams. Materials come from the edges of the city, recomposed into a walkable micro‑landscape.\n\nLooking up or leaning down, the body meets different weights of light; time is carried by slow illumination and incidental sound.',
        },
        {
          title: 'Below the Patio',
          image: '/CET.png',
          gallery: ['/CET.png', '/aboutus.jpeg'],
          body:
            'Light, shadow, and found objects sketch a vertical patio—air and time caught in architectural seams.\n\nThe space is led by rhythm rather than plot, inviting a slower pace to re‑feel the relation between body and building.',
        },
        {
          title: 'Below the Patio',
          image: '/aboutus.jpeg',
          gallery: ['/aboutus.jpeg', '/CET.png'],
          body:
            'Light, shadow, and found objects sketch a vertical patio—air and time caught in architectural seams; materials and shadows together inscribe a memory of brief stays.',
        },
        {
          title: 'Below the Patio',
          image: '/CET.png',
          gallery: ['/CET.png', '/aboutus.jpeg', '/CET.png'],
          body:
            'Light, shadow, and found objects sketch a vertical patio—air and time caught in architectural seams. Paths and sightlines are recalibrated to the patio scale.',
        },
      ],
    },
    footer: {
      organizer: 'Presented by Urban Culture Fund × Photosynthesis Curatorial Lab',
      contact: 'Contact: info@urban-spectrum.art',
      copy: '© 2026 C-LAB Future Vision Lab. All Rights Reserved.',
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
