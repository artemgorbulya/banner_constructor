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
      { name: 'Бульбашка 1', src: '/library/bubble/bubble1.png' },
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
