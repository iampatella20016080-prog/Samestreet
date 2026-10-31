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
    uncle: '下棋阿伯',
    grandma: '阿嬤',
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
      // 家務小遊戲：一開始亮 3 件，每做完 1 件又亮 2 件，所以「還有」永遠是 3＋做完的件數（做 6 件就是劇本的「還有 9 件」）
      // 劇本的六件之外，加上「擦神明桌」「煮豬肉粥」：面試時 Siti 答應過「我們家有拜拜，也會煮豬肉」
      chores: {
        seconds: 40,
        tasks: ['尿布', '翻身', '藥盒', '早餐', '洗衣服', '拖地', '擦神明桌', '煮豬肉粥'],
        result: '做完 {done} 件，還有 {left} 件。今天才剛開始。',
        holdSeconds: 1.5,
        callEvery: 8,
        answerSeconds: 0.6,
        speed: 2.6,
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
      // 天橋與繞斑馬線的長度由程式從路線算出來（{bridge}、{detour} 公尺）
      compare: ['雅婷走天橋：{bridge} 公尺', 'Siti 推輪椅繞斑馬線：{detour} 公尺'],
      // 第一章的雅婷變成幽靈，從 Siti 旁邊跑過去
      ghostLabel: '第一章的雅婷',
      // 同一段路的時間：雅婷是第一章實際走的時間（停下來講話不算），Siti 是推輪椅 2.2 m/s 算出來的（都是遊戲裡的數字）
      compareTime: ['同一段路：從家門口到馬路對面', '雅婷 {yating}　｜　Siti 推輪椅繞過去 {siti}'],
    },

    ch2_breakfast: {
      title: '第二章之四　早餐店',
      targetSec: 60,
      // 勞動部月報表 12-7：2026 年 9 月底尚未查獲的失聯移工 88,974 人（全部移工）。舊數字：中央社 2023 年 8 月 8 萬 4339 人
      tv: '失聯移工逾 8 萬人　治安隱憂？',
      tvCite: 'Fanon 頁236：報刊、電影、電台構成集體的世界觀',
      lines: [
        { who: 'alan', lang: 'tw', note: '對阿公講，不是對 Siti', text: '阿伯，你這个外勞敢有乖？', maskTo: '□□，□□□外勞□□乖？', callsGaikao: true },
        { who: 'guest', text: '要看緊一點啦，電視講很多都會跑掉。', maskTo: '□□□□□□，□□□□□□□□跑掉。', callsGaikao: true },
        { who: 'xiaoyu', note: '躲到阿嬤後面', text: '阿嬤，她是不是會跑掉的那種？' },
      ],
      hold: { prompt: '按住空白鍵，保持微笑', seconds: 6 },
      call: { who: 'wang', note: '電話', text: 'Siti，雇主說妳態度不好喔。要不要我幫她換一個？' },
      // 客人走後阿蘭小聲說的兩句：保留遮罩（2026-10-24 決定）。Siti 來台灣三個月，只聽得懂「外勞」，
      // 阿蘭的心裡話傳不到她那裡，真正傳到的是那顆茶葉蛋；台下看下方的完整字幕。要改成聽得懂就加 understood: true
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
      // 劇本：「語言也反過來了……反而旁邊下棋阿伯講的中文變成方塊。」劇本沒寫阿伯說什麼，這句是補的（2026-10-24），
      // 組員可以改。Siti 唯一聽得懂的中文是「外勞」：連在公園，也有人這樣叫她。帳本「叫她外勞」因此是 4 個人、共 5 次
      uncle: { who: 'uncle', text: '這些外勞每天都在這裡聊天喔。', callsGaikao: true },
      greeting: { who: 'dewi', lang: 'id', text: 'Siti! Sudah makan?', sub: '吃飽了嗎？', callsName: true },
      // 下面三句要換成真的移工寫過或說過的話：從原書挑一兩句、照抄，source 填「作者〈篇名〉，年份，頁碼」，
      // 再把 placeholder 拿掉，畫面上就會改顯示出處。已查到可用的作品（2026-10-24）：
      //   阮氏賢〈頂樓的理髮店〉，第十屆移民工文學獎首獎（2025），收在《時：旅程未竟，光景猶存》（國立臺灣文學館）→ 給 Linh
      //   莉莉〈孤獨的故事〉，第八屆移民工文學獎優選（2023），收在《草：榮枯有時，復返有時》→ 給 Dewi
      //   （劇本寫的莉莉〈一段記憶〉2024 優選，網路上查不到得獎紀錄，用之前請對作品集目錄）
      //   Maria 還沒有來源：可以改給 Dewi 或 Linh 講，或從《獨立特派員》第 884 集〈移工媽媽的抉擇〉找
      // 網路上找不到這些作品的免費全文，要借作品集（燦爛時光東南亞主題書店、國家圖書館）
      voices: [
        { who: 'dewi', lang: 'id', text: '他們吃飯的時候，我不能一起坐著吃。我要在旁邊餵阿嬤，等他們吃完了，我才去廚房吃剩菜。這就是他們說的『一家人』嗎？', placeholder: true, source: '' },
        { who: 'linh', lang: 'vi', text: '很久沒放假了。老闆說，不放假就多給我錢。大家都以為我喜歡賺這個錢。他們不知道，我多想用這些錢，換一天的自由。', placeholder: true, source: '' },
        { who: 'maria', lang: 'en', text: '星期天，我只是想去台北車站找朋友。以前大家都可以好好的聚在一起，但前幾年開始，大廳突然就不能坐了。只是想找個地方坐下來和同鄉聊聊天，現在卻變得這麼麻煩。', placeholder: true, source: '' },
      ],
      placeholderNote: '依移工處境撰寫，非本人原話',
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
      // 結尾標題這一頁：下面濃縮列出報告的五個項目，再按一下空白鍵才出製作名單。數字出處見《同一條街_劇本》第八節
      recap: [
        ['問題是什麼', '照顧為什麼總是落在女人身上？接手的為什麼總是被貼上族群標籤的外籍女性？'],
        ['問題背景', '家庭看護工 215,410 人，印尼籍約 87%（勞動部，2026 年 9 月底）'],
        ['文獻的討論', '上野：少數民族　Anderson：想像的共同體　Fanon：白面具　Marger：族群性是分層的基礎'],
        ['台灣相關案例', '仲介用國籍寫評語；家庭看護不適用勞基法；月薪約兩萬，最低工資 29,500'],
        ['我們的觀點', '族群標籤在幫照顧定價；「像家人一樣」最便宜；照顧是大家的事'],
      ],
      heading: '同一條街',
      // 製作名單：結尾標題下面顯示
      credits: [
        ['遊戲構思', '商雅嵐　劉郡玟　葉盺妤　楊涵茵　林暉恩　卓旻潔'],
        ['遊戲製作', '商雅嵐'],
        ['查找資料', '商雅嵐　葉盺妤　林暉恩'],
        ['上台報告', '劉郡玟　葉盺妤　楊涵茵　林暉恩　卓旻潔'],
        ['抓 bug', '劉郡玟　林暉恩　卓旻潔'],
      ],
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
