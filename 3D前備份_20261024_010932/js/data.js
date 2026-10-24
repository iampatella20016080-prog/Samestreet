// 所有文字內容放這裡，改字不用動程式
// 台詞一律照《同一條街_劇本.md》；劇本裡寫給組員看的「待查」不上畫面，記在註解
window.SS = window.SS || {};

SS.DATA = {
  // Siti 學會的詞：早餐店的語言遮罩會保留這些詞，其他中文變成 □
  learnedWords: ['外勞', '乖', '跑掉', '阿公', '謝謝', '雅婷', 'Siti'],
  langNames: { tw: '台語', id: '印尼語', vi: '越南語', en: '英語' },
  people: {
    yating: '雅婷',
    siti: 'Siti',
    agong: '阿公',
    azhu: '阿珠姨',
    alan: '阿蘭',
    wang: '王先生',
    rina: 'Bu Rina',
    guest: '客人',
    xiaoyu: '小宇',
    dewi: 'Dewi',
    linh: 'Linh',
    maria: 'Maria',
    putri: 'Putri',
    zhihao: '志豪',
    sister: '大嫂',
    boss: '主管',
  },

  // 台詞欄位：who 說話的人、lang（zh 國語／tw 台語／id 印尼語／vi 越南語／en 英語）、text、
  // sub 中文字幕、note 括號裡的舞台指示、maskTo Siti 看到的遮罩版本、understood Siti 聽得懂（早餐店不遮）、
  // callsName 叫她名字、callsGaikao 叫她外勞、callsYating 把她叫成雅婷、cite 右下角出處標籤
  scenes: {
    lobby: {
      title: '開場前',
      targetSec: 0,
      heading: '同一條街',
      lines: ['請拿出手機掃描 QR code', '等一下會用到'],
    },

    prologue: {
      title: '序章　家族群組',
      targetSec: 40,
      chats: [
        {
          name: '陳家',
          messages: [
            { who: 'zhihao', text: '爸昨天又跌倒？' },
            { who: 'yating', text: '醫生說以後身邊要有人 24 小時' },
            { who: 'zhihao', text: '妳住比較近啦，女生也比較細心' },
            { who: 'sister', text: '我們這邊小孩要補習，真的走不開' },
            { who: 'zhihao', text: '費用我可以出一點', cite: '上野 6.6 女兒的價值：兒子出錢，女兒出力' },
          ],
        },
        {
          name: '主管',
          messages: [{ who: 'boss', text: '雅婷，這個月第三次請假了。下個月考核妳自己想清楚。' }],
        },
      ],
      typed: '我',
      heading: '同一條街',
      subheading: '誰來照顧阿公？',
    },

    ch1_street: {
      title: '第一章之一　雅婷的早晨',
      targetSec: 50,
      clock: { time: '07:40', note: '八點半前要到公司' },
      // at：在路線上的位置（0 是家門口，1 是仲介門口）
      areaLabels: [
        { at: 0.0, text: '坡頂巷' },
        { at: 0.42, text: '早餐店' },
        { at: 0.6, text: '天橋' },
        { at: 0.88, text: '仲介' },
      ],
      // 每個停留點的位置由程式依 NPC 站的地方算出來
      stops: {
        agong: [
          { who: 'agong', lang: 'tw', note: '門內', text: '雅婷，妳今仔日卡早轉來喔。' },
          { who: 'yating', text: '好啦爸，我會早點回來。' },
        ],
        azhu: [{ who: 'azhu', lang: 'tw', text: '雅婷喔，妳真孝順，妳阿爸有妳真好命。' }],
        alan: [{ who: 'alan', text: '老樣子喔？妳爸還好嗎？請一個外勞啦，現在大家都這樣。' }],
      },
    },

    ch1_agency: {
      title: '第一章之二　仲介的履歷、全班投票',
      targetSec: 50,
      intro: [{ who: 'wang', text: '小姐，看護要找哪一國的？我先給妳看幾份履歷。' }],
      question: '如果是你家，你會選誰？',
      countdown: 10,
      reveal: '她們的評語寫的都是國籍，不是她們本人。',
      taken: [{ who: 'wang', text: '啊這位上禮拜被訂走了。印尼這位也很好啦，比較溫順。' }],
      cite: 'Anderson 第二版序 頁4：人口調查對人的抽象量化',
    },

    ch1_interview: {
      title: '第一章之三　視訊面試',
      targetSec: 60,
      lines: [
        { who: 'yating', text: '晚上要起來幫阿公翻身，會不會很累？' },
        { who: 'siti', note: '笑著，回答得很快', fast: true, text: '不會累。' },
        { who: 'yating', text: '妳有小孩……會不會想家？' },
        { who: 'siti', fast: true, text: '不會想家。' },
        { who: 'yating', text: '我們家有拜拜，也會煮豬肉，可以嗎？' },
        { who: 'siti', fast: true, text: '可以，沒問題。' },
      ],
      after: [{ who: 'wang', text: '看吧，很乖。' }],
      confirm: '確定',
      card: 1,
    },

    transition: {
      title: '轉場',
      targetSec: 10,
      lines: ['同一天，同一條街，換一個人走。', '不過先倒回三個月前。'],
    },

    ch2_training: {
      title: '第二章之一　印尼訓練中心',
      targetSec: 40,
      place: 'Jawa Tengah，三個月前。',
      board: ['謝謝', '阿公', '不會累'],
      questions: [
        {
          ask: { who: 'rina', lang: 'id', text: '我們來練習面試。台灣雇主問妳「會不會累」，妳要怎麼說？' },
          honest: '會，晚上起來很多次一定會累。',
          mask: '不會累。',
          live: 'train',
        },
        { ask: { who: 'rina', text: '會不會想家？' }, honest: '會，我會想我女兒', mask: '不會想家' },
        { ask: { who: 'rina', text: '可以煮豬肉嗎？' }, honest: '我是穆斯林，可以煮，但希望有時間禱告', mask: '可以，沒問題' },
      ],
      reject: { who: 'rina', lang: 'id', text: '這樣講台灣雇主不會選妳。再一次。' },
      end: { who: 'rina', lang: 'id', text: '很好。記得，要笑。', cite: 'Fanon 頁238：只有他人能賦予他價值' },
    },

    ch2_home: {
      title: '第二章之二　做不完的家務',
      targetSec: 50,
      clock: { time: '05:30', note: '' },
      chores: {
        seconds: 40,
        tasks: ['尿布', '翻身', '藥盒', '早餐', '洗衣服', '拖地'],
        result: '做完 6 件，還有 9 件。今天才剛開始。',
      },
      lines: [
        { who: 'agong', lang: 'tw', text: '雅婷？是雅婷喔？', callsYating: true },
        { who: 'siti', lang: 'tw', text: '阿公，我是 Siti 啦。' },
        { who: 'agong', lang: 'tw', text: '……雅婷哪會猶未轉來？' },
        { who: 'yating', note: '在門口', text: 'Siti，我今天加班，阿公拜託妳了喔。', callsName: true },
      ],
      cite: '上野 4.2：在隱私的「神聖」名義下，家庭可以逃過公眾的干涉與監督',
      card: 2,
    },

    ch2_slope: {
      title: '第二章之三　坡道、天橋、台語',
      targetSec: 25,
      lines: [
        { who: 'agong', lang: 'tw', text: '今仔日天氣真好。' },
        { who: 'siti', lang: 'tw', text: '著啊，阿公，咱來去公園。' },
      ],
      azhu: [
        { who: 'azhu', lang: 'tw', text: '哇，這个外勞台語講得比雅婷閣較輪轉！', callsGaikao: true },
        { who: 'azhu', lang: 'tw', text: '啊不過外勞就是外勞啦。', callsGaikao: true },
      ],
      blocked: '✕',
      cite: '上野 1.2：只有一個個健康的成年男子，才是對「市場」有意義的人',
    },

    ch2_breakfast: {
      title: '第二章之四　早餐店',
      targetSec: 60,
      // 中央社 2023 年 8 月：8 萬 4339 人（待查有沒有更新的數字）
      tv: '失聯移工逾 8 萬人　治安隱憂？',
      tvCite: 'Fanon 頁236：報刊、電影、電台構成集體的世界觀',
      lines: [
        { who: 'alan', lang: 'tw', note: '對阿公講，不是對 Siti', text: '阿伯，你這个外勞敢有乖？', maskTo: '□□，□□□外勞□□乖？', callsGaikao: true },
        { who: 'guest', text: '要看緊一點啦，電視講很多都會跑掉。', maskTo: '□□□□□□，□□□□□□□□跑掉。', callsGaikao: true },
        { who: 'xiaoyu', note: '躲到阿嬤後面', text: '阿嬤，她是不是會跑掉的那種？' },
      ],
      hold: { prompt: '按住空白鍵，保持微笑', seconds: 6 },
      call: { who: 'wang', note: '電話', text: 'Siti，雇主說妳態度不好喔。要不要我幫她換一個？' },
      after: [
        { who: 'alan', text: '我剛嫁來台灣的時候，他們也是這樣看我。' },
        { who: 'alan', text: '後來我學會先說別人是外勞，就比較沒人說我了。' },
      ],
      egg: '她塞了一顆茶葉蛋到 Siti 的袋子裡，沒再說話。',
      card: 3,
    },

    ch2_park: {
      title: '第二章之五　廟口公園',
      targetSec: 60,
      clock: { time: '09:30', note: '' },
      greeting: { who: 'dewi', lang: 'id', text: 'Siti! Sudah makan?', sub: '吃飽了嗎？', callsName: true },
      // 下面三句要換成真的移工說過或寫過的話（來源見劇本第七部分），換好再把 placeholder 拿掉
      voices: [
        { who: 'dewi', lang: 'id', text: '我的雇主說我是家人。可是家人不用睡在阿嬤床邊的地上吧。', placeholder: true },
        { who: 'linh', lang: 'vi', text: '我已經很久沒放假了。老闆說不放假就多給我錢。', placeholder: true },
        { who: 'maria', lang: 'en', text: '星期天我想去台北車站找朋友。前幾年大廳突然不能坐了。', placeholder: true },
      ],
      placeholderNote: '暫用台詞，待換成移工本人寫過或說過的話',
      clipping: {
        title: '公布欄上的舊剪報',
        text: '2020 年台鐵說要防疫，禁止在台北車站大廳坐地上。後來傳出疫情過了也不開放，網路上有人發起「坐爆台北車站」。移工團體問，大廳可以給百貨設櫃，為什麼不能讓人坐下來？後來台鐵在地上貼了「微笑地貼」，重新開放。',
      },
      card: 4,
    },

    ch2_rooftop: {
      title: '第二章之六　頂樓',
      targetSec: 35,
      clock: { time: '22:30', note: '' },
      prayerSec: 10,
      call: [
        { who: 'putri', lang: 'id', text: 'Mama, kapan pulang?', sub: '媽媽，妳什麼時候回家？' },
        { who: 'siti', lang: 'id', text: 'Mama harus kerja dulu ya.', sub: '媽媽要先工作喔。' },
      ],
      shout: { who: 'agong', lang: 'tw', note: '樓下', text: '雅婷——！', callsYating: true },
    },

    ending_ledger: {
      title: '結尾　帳本',
      targetSec: 35,
      counts: [
        { key: 'name', label: '今天叫她名字的人' },
        { key: 'gaikao', label: '今天叫她外勞的人' },
        { key: 'yating', label: '今天叫她「雅婷」的人' },
      ],
      table: {
        cols: ['', '雅婷', 'Siti'],
        rows: [
          ['今天做了什麼', '上班 9 小時，照顧大約 1 小時', '照顧 17.5 小時（5:30 到 23:00），半夜還要起來'],
          ['薪水', '看公司', '一個月 20,000（2022 年 8 月從 17,000 調上來）'],
          ['換算時薪', '', '大約 38 元（兩萬除以 30 天再除以 17.5 小時，沒算吃住）'],
          // 待查：家庭看護是不是也不適用最低工資
          ['保障', '2026 年最低工資月薪 29,500、時薪 196', '家庭看護不適用勞基法'],
        ],
        guessRow: 2,
      },
      // 待查：仲介每月服務費金額
      gains: ['哥哥（省下時間）', '雅婷的公司（員工不再請假）', '仲介（每個月的服務費）', '政府（少花長照的錢）'],
      costs: ['Siti', 'Putri', 'Siti 的媽媽'],
    },

    ending_views: {
      title: '結尾　我們的看法',
      targetSec: 25,
      views: [
        {
          title: '看法 1　族群標籤是在幫照顧定價。',
          body: '「印尼的比較溫順」不是在描述一個人，而是讓她們領更少、更不能抱怨的一套想像。剛剛全班投票，就是這套想像在運作。',
          showVote: true,
        },
        {
          title: '看法 2　「像家人一樣」是最便宜的說法。',
          body: '叫她家人，她就沒有上下班（上野）；叫她外勞，她的權利就停在國界（Anderson）；每天的目光又逼她一直戴著面具（Fanon）。父權和資本主義就躲在「家人」跟「外人」中間。',
        },
        {
          title: '看法 3　解法不是「對外勞好一點」，是讓照顧變成大家的事。',
          // 待查：家事勞工保障法草案現在的進度
          body: '把家事勞工保障法立好、讓每七天真的有一天休假；讓移工可以自己換雇主；多一點公共的長照和喘息服務，照顧就不會只能落在「家裡的女人」或「家裡的外勞」身上；還有，不要再用國籍幫人貼性格標籤，先從仲介履歷改起。',
        },
      ],
      finalNames: 3,
      heading: '同一條街',
    },
  },

  // 履歷內容是虛構的（待查：找一份真的履歷來對照）
  resumes: [
    { name: 'Siti', country: '印尼', age: 34, body: '153／48', religion: '伊斯蘭教', family: '離婚，一個女兒', chinese: '簡單會話', comment: '溫順、聽話，適合照顧長輩' },
    { name: 'Linh', country: '越南', age: 29, body: '158／50', religion: '佛教', family: '未婚', chinese: '普通', comment: '勤快、反應快，但比較會計較' },
    { name: 'Maria', country: '菲律賓', age: 38, body: '160／55', religion: '天主教', family: '已婚，兩個兒子', chinese: '簡單會話，英文很好', comment: '英文好、學歷高，比較有主見' },
  ],
  resumeFields: [
    ['age', '年齡'],
    ['body', '身高／體重'],
    ['religion', '宗教'],
    ['family', '婚姻'],
    ['chinese', '中文'],
    ['comment', '仲介評語'],
  ],

  // 理論卡：lead 是引文段落、body 是說明，文字照劇本；頁碼已對過原文（見 理論引文對照.md）
  cards: [
    {
      no: 1,
      title: '上野千鶴子：女人也是一種「少數民族」',
      lead: [
        '「女人也算是一種少數民族，與其他少數民族有直接競爭的關係。」',
        '「市場上只要將家事勞動價格壓制在最低限度，女性就會讓境況更惡劣的勞動者來做家事勞動，自己的勞動力則到市場上去出售。」',
      ],
      body: '雅婷不是壞人。家裡要她照顧，公司要她全勤，她能做的就是把照顧交給一個處境比她更差、又被貼上族群標籤的女人。',
      source: '上野千鶴子，12.1〈移民勞動者〉',
    },
    {
      no: 2,
      title: '上野千鶴子：用「愛」包裝的勞動',
      lead: ['上野引用 Delphy 的說法：家事勞動也是勞動，而且是沒有報酬的勞動（3.1）。家庭被說成是「愛的共同體」，可是「愛的共同性神話，早就被性支配的現實所推翻了」（4.2）。'],
      body: '在第一章，這些家事根本看不到，因為那是「女兒應該做的」。現在變成一個月兩萬的工作，換 Siti 來做，還是一樣沒人看到。',
      source: '上野千鶴子，3.1、4.2',
    },
    {
      no: 3,
      title: 'Fanon：目光和白面具',
      lead: ['Fanon 寫到，安的列斯人在自己的地方不覺得自己是「黑人」，是碰到白人的目光以後，才感覺到膚色有多重。他也寫到，被殖民的人會學著用殖民者的眼光，去看比自己更「黑」的人。'],
      body: 'Fanon 寫的是殖民地的黑人，台灣的情況不能直接畫等號。我們借的是他講的機制：「先進／落後」、膚色、語言這些高低，透過每天的目光一再被確認，連曾經被這樣看過的人，也學會這樣去看別人。',
      source: 'Fanon《黑皮膚，白面具》第六章，頁 231–234、274',
    },
    {
      no: 4,
      title: 'Anderson：被想像出來的「我們」',
      lead: [
        '民族是「一種想像的政治共同體」，而且是「被想像為本質上有限的」。「儘管在每個民族內部可能存在普遍的不平等與剝削，民族總是被設想為一種深刻的、平等的同志愛。」',
        '導讀也提到，想像民族「最重要的媒介是語言」。',
      ],
      body: '「家人」跟「同胞」其實都是想像出來的，也都用「愛」跟「平等」蓋住裡面的不平等。Siti 在家裡被叫家人，在台灣被叫外勞，兩邊都進不去。只有在公園，大家講自己的語言，她們才有自己的「我們」。',
      source: 'Anderson《想像的共同體》第一章，頁 6–7；吳叡人導讀，頁 12',
    },
  ],

  // 台下用手機回答的題目，手機畫面會跟著遊戲換題
  // 長度限制（Firebase 規則會擋）：title 60 字、選項 label 30 字、id 16 字
  live: {
    vote: {
      id: 'vote',
      kind: 'choice',
      title: '如果是你家，你會選誰？',
      options: [
        { id: 'siti', label: 'Siti（印尼）' },
        { id: 'linh', label: 'Linh（越南）' },
        { id: 'maria', label: 'Maria（菲律賓）' },
      ],
    },
    train: {
      id: 'train',
      kind: 'choice',
      title: '台灣雇主問「會不會累」，Siti 要怎麼說？',
      options: [
        { id: 'honest', label: '會，晚上起來很多次一定會累。' },
        { id: 'mask', label: '不會累。' },
      ],
    },
    wage: {
      id: 'wage',
      kind: 'choice',
      title: '猜猜看：Siti 換算時薪大約多少？',
      options: [
        { id: 'high', label: '196 元以上' },
        { id: 'mid', label: '100 到 196 元' },
        { id: 'low', label: '100 元以下' },
      ],
    },
    name: {
      id: 'name',
      kind: 'tap',
      title: '叫她的名字',
      options: [{ id: 'siti', label: 'Siti' }],
    },
  },
  signs: {
    breakfast: '福安早餐',
    agency: '外籍看護',
    agencyPosters: ['印尼・越南・菲律賓', '看護快速引進', '不適任 免費更換'],
    shops: ['機車行', '中藥行', '五金', '檳榔', '理髮', '水電行', '雜貨', '當舖'],
    temple: '福德祠',
  },
};
