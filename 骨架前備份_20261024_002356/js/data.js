// 所有文字內容放這裡，改字不用動程式
window.SS = window.SS || {};

SS.DATA = {
  scenes: {
    ch1_street: {
      targetSec: 50,
      clock: { time: '07:40', note: '八點半前要到公司' },
      // at：在路線上的位置（0 是家門口，1 是仲介門口）
      areaLabels: [
        { at: 0.0, text: '坡頂巷' },
        { at: 0.42, text: '早餐店' },
        { at: 0.6, text: '天橋' },
        { at: 0.88, text: '仲介' },
      ],
    },
  },
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
