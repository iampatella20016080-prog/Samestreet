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
  signs: {
    breakfast: '福安早餐',
    agency: '外籍看護',
    agencyPosters: ['印尼・越南・菲律賓', '看護快速引進', '不適任 免費更換'],
    shops: ['機車行', '中藥行', '五金', '檳榔', '理髮', '水電行', '雜貨', '當舖'],
    temple: '福德祠',
  },
};
