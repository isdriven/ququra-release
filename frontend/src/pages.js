/**
 * 学習用ページ一覧（左ナビの構成）
 * type: 'page' | 'group'
 * group の children にページをネスト
 */
export default [
  {
    type: 'page',
    path: '/',
    name: 'トップ',
    component: () => import('./views/TopPage.vue'),
  },
  {
    type: 'group',
    name: 'アルゴリズム',
    children: [
      {
        type: 'page',
        path: '/algorithm/sort',
        name: 'ソート',
        component: () => import('./views/algorithm/SortPage.vue'),
      },
    ],
  },
]
