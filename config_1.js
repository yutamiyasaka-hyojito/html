// 💡 フレームの表示タイプ定義
const FRAME_FIT_TYPES = {
  CONTAIN: 'fit-contain', // 画面内に全体を収める（通常の額縁タイプ）
  COVER: 'fit-cover'     // 縦幅いっぱいに広げて左右をはみ出させる（顔はめパネルタイプ）
};

// 💡 フレームのマスターデータ一覧
const FRAME_MASTER_DATA = [
  { id: 0, src: 'img/waku.png', fitType: FRAME_FIT_TYPES.CONTAIN },
  { id: 1, src: 'img/frame1.png', fitType: FRAME_FIT_TYPES.CONTAIN }, 
  { id: 2, src: 'img/frame2.png', fitType: FRAME_FIT_TYPES.CONTAIN },
  { id: 3, src: 'img/frame3.png', fitType: FRAME_FIT_TYPES.COVER }
];

// 💡 スタンプのマスターデータ一覧
const STAMP_MASTER_DATA = [
  { src: 'img/stamp/oiwai.png', alt: 'お祝い' },
  { src: 'img/stamp/shuku.png', alt: '祝' },
  { src: 'img/stamp/sotugyou.png', alt: '卒業' },
  { src: 'img/stamp/1staniv.png', alt: '1周年' },
  { src: 'img/stamp/aniv.png', alt: 'アニバーサリー' },
  { src: 'img/stamp/newyear.png', alt: '謹賀新年' },
  { src: 'img/stamp/wedding.png', alt: 'ウェディング' },
  { src: 'img/stamp/thankyou.png', alt: 'THANK YOU' },
  { src: 'img/stamp/ryokoukinen.png', alt: '旅行記念' },
  { src: 'img/stamp/crown.png', alt: '王冠' }
];


const SAVE_FILE_NAME_PREFIX = "photoframe_demo";