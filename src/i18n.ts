export type Lang = 'zh' | 'en'

export const messages = {
  zh: {
    siteName: '2026台灣文博會',
    siteTagline: '臺灣文化創意博覽會',
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
      body: `臺灣文化創意博覽會（以下簡稱臺灣文博會）自 2010 年起由文化部策辦，歷經多次重要策略轉型，展會規模與內容量能持續擴展，逐步發展為臺灣文化創意內容展示、產業交流與市場媒合的重要交易平台之一，並朝向以文化價值帶動市場經濟動能的國家級文化創意產業交易樞紐邁進。`,
      officialAboutUrl: 'https://creativexpo.tw/zh-TW/about',
      moreLabel: '瞭解更多',
      officialAboutAria:
        '開啟臺灣文博會官方網站「關於」頁（另開新分頁）',
    },
    schedule: {
      title: '場次',
      note: '實際節目以現場公告為準',
      slots: [
        { day: '5/15（四）', time: '11:00–20:00', name: '開幕日／策展導覽 14:00' },
        { day: '5/16（五）', time: '11:00–20:00', name: '藝術家對談：城市與感官 16:30' },
        { day: '5/17（六）', time: '10:00–21:00', name: '夜間場次／聲音演出 19:30' },
        { day: '5/18（日）', time: '10:00–18:00', name: '親子工作坊 11:00、15:00' },
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
      copy: '© 2025 C-LAB Future Vision Lab. All Rights Reserved.',
    },
    /** 右側社群直欄（連結請依實際官方帳號修改） */
    social: {
      railAria: '社群媒體與聯絡',
      facebook: 'Facebook',
      instagram: 'Instagram',
      threads: 'Threads',
      youtube: 'YouTube',
      email: '電子郵件',
      backToTop: '回到頂部',
      urls: {
        facebook: 'https://www.facebook.com/creativeexpotw',
        instagram: 'https://www.instagram.com/creativeexpotw/',
        threads: 'https://www.threads.net/@creativeexpotw',
        youtube: 'https://www.youtube.com/@creativeexpotw',
        email: 'mailto:info@clab.org.tw',
      },
    },
    langSwitch: '語言',
  },
  en: {
    siteName: '2026 Creative Expo Taiwan',
    siteTagline: 'Taiwan Creative Expo',
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
      officialAboutUrl: 'https://creativexpo.tw/en/about',
      moreLabel: 'Learn more',
      officialAboutAria:
        'Open Taiwan Creative Expo official About page (new tab)',
    },
    schedule: {
      title: 'Schedule',
      note: 'Programmes are subject to on-site announcements',
      slots: [
        { day: 'Thu 15 May', time: '11:00–20:00', name: 'Opening / Curator tour 14:00' },
        { day: 'Fri 16 May', time: '11:00–20:00', name: 'Artist talk: city & senses 16:30' },
        { day: 'Sat 17 May', time: '10:00–21:00', name: 'Evening programme / Sound performance 19:30' },
        { day: 'Sun 18 May', time: '10:00–18:00', name: 'Family workshops 11:00, 15:00' },
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
      copy: '© 2025 C-LAB Future Vision Lab. All Rights Reserved.',
    },
    social: {
      railAria: 'Social media and contact',
      facebook: 'Facebook',
      instagram: 'Instagram',
      threads: 'Threads',
      youtube: 'YouTube',
      email: 'Email',
      backToTop: 'Back to top',
      urls: {
        facebook: 'https://www.facebook.com/creativeexpotw',
        instagram: 'https://www.instagram.com/creativeexpotw/',
        threads: 'https://www.threads.net/@creativeexpotw',
        youtube: 'https://www.youtube.com/@creativeexpotw',
        email: 'mailto:info@clab.org.tw',
      },
    },
    langSwitch: 'Language',
  },
} as const satisfies Record<
  Lang,
  Record<string, unknown>
>
