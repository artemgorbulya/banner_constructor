// ─────────────────────────────────────────────────────────────────────────────
// Вбудована бібліотека зображень
//
// ЯК ДОДАТИ СВОЄ ЗОБРАЖЕННЯ:
//   1. Скопіюйте файл до  public/library/  (наприклад: public/library/logo.png)
//   2. Додайте рядок у потрібну категорію нижче:
//        { name: 'Назва', src: '/library/logo.png' }
//   3. Збережіть — зображення одразу з'явиться в бібліотеці (Vite HMR).
//
// Підтримуються: PNG, JPG, SVG, WebP, GIF
// ─────────────────────────────────────────────────────────────────────────────

export const LIBRARY = [
  {
    id: 'banners',
    label: 'Фони',
    items: [
      { name: 'Банер 1', src: '/library/banner/baner1.png' },
      { name: 'Банер 2', src: '/library/banner/baner2.png' },
      { name: 'Банер 3', src: '/library/banner/baner3.png' },
      { name: 'Банер 4', src: '/library/banner/baner4.png' },
      { name: 'Банер 5', src: '/library/banner/baner5.png' },
      { name: 'Банер 6', src: '/library/banner/baner6.png' },
      { name: 'Банер 7', src: '/library/banner/baner7.png' },
      { name: 'Банер 8', src: '/library/banner/baner8.png' },
      { name: 'Банер 9', src: '/library/banner/baner9.png' },
      { name: 'Банер 10', src: '/library/banner/baner10.png' },
    ],
  },
  {
    id: 'bubbles',
    label: 'Бульбашки',
    items: [
      { name: 'Бульбашка 1', src: '/library/bubble/bubble.png' },
      { name: 'Бульбашка 2', src: '/library/bubble/bubble2.png' },
      { name: 'Бульбашка 3', src: '/library/bubble/bubble3.png' },
      { name: 'Бульбашка 4', src: '/library/bubble/bubble4.png' },
      { name: 'Бульбашка 5', src: '/library/bubble/bubble5.png' },
      { name: 'Бульбашка 6', src: '/library/bubble/bubble6.png' },
      { name: 'Бульбашка 7', src: '/library/bubble/bubble7.png' },
      { name: 'Бульбашка 8', src: '/library/bubble/bubble8.png' },
      { name: 'Бульбашка 9', src: '/library/bubble/bubble9.png' },
      { name: 'Бульбашка 10', src: '/library/bubble/bubble10.png' },
      { name: 'Бульбашка 11', src: '/library/bubble/bubble11.png' },
      { name: 'Бульбашка 12', src: '/library/bubble/bubble12.png' },
      { name: 'Бульбашка 13', src: '/library/bubble/bubble13.png' },
      { name: 'Бульбашка 14', src: '/library/bubble/bubble14.png' },
      { name: 'Бульбашка 15', src: '/library/bubble/bubble15.png' },
      { name: 'Бульбашка 16', src: '/library/bubble/bubble16.png' },
      { name: 'Бульбашка 17', src: '/library/bubble/bubble17.png' },
      { name: 'Бульбашка 18', src: '/library/bubble/bubble18.png' },
      { name: 'Бульбашка 19', src: '/library/bubble/bubble19.png' },
      { name: 'Бульбашка 20', src: '/library/bubble/bubble20.png' },
      { name: 'Бульбашка 21', src: '/library/bubble/bubble21.png' },
      { name: 'Бульбашка 22', src: '/library/bubble/bubble22.png' },
      { name: 'Бульбашка 23', src: '/library/bubble/bubble23.png' },
      { name: 'Бульбашка 24', src: '/library/bubble/bubble24.png' },
      { name: 'Бульбашка 25', src: '/library/bubble/bubble25.png' },
      { name: 'Бульбашка 26', src: '/library/bubble/bubble26.png' },
      { name: 'Бульбашка 27', src: '/library/bubble/bubble27.png' },
      { name: 'Бульбашка 28', src: '/library/bubble/bubble28.png' },
      { name: 'Бульбашка 29', src: '/library/bubble/bubble29.png' },
      { name: 'Бульбашка 30', src: '/library/bubble/bubble30.png' },
      { name: 'Бульбашка 31', src: '/library/bubble/bubble31.png' },
      { name: 'Бульбашка 32', src: '/library/bubble/bubble32.png' },
      { name: 'Бульбашка 33', src: '/library/bubble/bubble33.png' },
      { name: 'Бульбашка 34', src: '/library/bubble/bubble34.png' },
      { name: 'Бульбашка 35', src: '/library/bubble/bubble35.png' },
      { name: 'Бульбашка 36', src: '/library/bubble/bubble36.png' },
      { name: 'Бульбашка 37', src: '/library/bubble/bubble37.png' },
      { name: 'Бульбашка 38', src: '/library/bubble/bubble38.png' },
      { name: 'Бульбашка 39', src: '/library/bubble/bubble39.png' },
      { name: 'Бульбашка 40', src: '/library/bubble/bubble40.png' },
      { name: 'Бульбашка 41', src: '/library/bubble/bubble41.png' },
      { name: 'Бульбашка 42', src: '/library/bubble/bubble42.png' },
      { name: 'Бульбашка 43', src: '/library/bubble/bubble43.png' },
    ],
  },
  {
    id: 'devices',
    label: 'Девайси',
    items: [
      { name: 'Девайс 1', src: '/library/device/dev1.png' },
      { name: 'Девайс 2', src: '/library/device/dev2.png' },
      { name: 'Девайс 3', src: '/library/device/dev3.png' },
      { name: 'Девайс 4', src: '/library/device/dev4.png' },
      { name: 'Девайс 5', src: '/library/device/dev5.png' },
      { name: 'Девайс 6', src: '/library/device/dev6.png' },
      { name: 'Девайс 7', src: '/library/device/dev7.png' },
      { name: 'Девайс 8', src: '/library/device/dev8.png' },
      { name: 'Девайс 9', src: '/library/device/dev9.png' },
      { name: 'Девайс 10', src: '/library/device/dev10.png' },
      { name: 'Девайс 11', src: '/library/device/dev11.png' },
      { name: 'Девайс 12', src: '/library/device/dev12.png' },
    ],
  },
];
