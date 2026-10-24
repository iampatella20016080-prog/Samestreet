// 台下手機互動的設定。Firebase 和 GitHub Pages 設定好之後，改這裡就好
window.SS = window.SS || {};

SS.LIVE_CONFIG = {
  // Firebase Realtime Database 的網址，不要 https://，結尾不要斜線
  // 例：same-street-1a2b3-default-rtdb.asia-southeast1.firebasedatabase.app
  // 還沒設定時填 'local'：只能在同一台電腦、同一個瀏覽器的兩個分頁之間測試
  db: 'same-street-76cc7-default-rtdb.asia-southeast1.firebasedatabase.app',
  // 手機頁的網址（GitHub Pages：iampatella20016080-prog/Samestreet），結尾要有斜線。本機測試用 'phone/'
  // 改了 game/phone/index.html 之後，要把它再傳到 Samestreet repo 的 phone/index.html
  phoneUrl: 'https://iampatella20016080-prog.github.io/Samestreet/phone/',
  // 房間代碼：換一個就是全新的一場，舊的票不會混進來
  room: 'fuan7k',
};
