import { reactive, watch } from 'vue'
import { LoadData, ResetData, SaveData } from '../wailsjs/go/main/App.js'

function genId() {
  return 'id_' + Math.random().toString(36).slice(2, 11)
}

const emptyData = () => ({
  structure: [],
  content: {},
  meta: {},
})

const data = reactive(emptyData())

let saveTimer = null
const SAVE_DEBOUNCE_MS = 400

function saveToBackend() {
  try {
    const payload = {
      structure: data.structure,
      content: data.content,
      meta: data.meta,
    }
    SaveData(payload).catch(() => {})
  } catch (_) {}
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveToBackend, SAVE_DEBOUNCE_MS)
}

watch(
  () => ({ structure: data.structure, content: data.content, meta: data.meta }),
  () => scheduleSave(),
  { deep: true }
)

/** 起動時またはブック切り替え後に bbolt からデータを読み込む。空の場合は何も出さない。エラー時は throw する（呼び出し元で「bookが壊れています」表示） */
export async function loadFromBackend() {
  try {
    const loaded = await LoadData()
    data.structure = []
    data.content = {}
    data.meta = {}
    if (!loaded || !loaded.structure || !Array.isArray(loaded.structure) || loaded.structure.length === 0) {
      return
    }
    data.structure = loaded.structure
    data.content = loaded.content || {}
    data.meta = loaded.meta || {}
    Object.keys(data.meta).forEach((pageId) => {
      const m = data.meta[pageId]
      if (m && m.testResults && m.recentAchievement == null) {
        updateRecentAchievement(m)
      }
    })
  } catch (e) {
    data.structure = []
    data.content = {}
    data.meta = {}
    throw e
  }
}

/** DB のデータを削除し、メモリを空に戻す。設定は残る */
export async function resetDataAndReload() {
  try {
    await ResetData()
  } catch (_) {}
  data.structure = []
  data.content = {}
  data.meta = {}
}

function ensureMeta(pageId) {
  if (!data.meta[pageId]) {
    data.meta[pageId] = { hoverCounts: {}, testResults: [], recentAchievement: null }
  }
  return data.meta[pageId]
}

function computeRecentAchievement(testResults) {
  const last5 = testResults.slice(-5)
  const count = last5.length
  if (count === 0) return { earned: 0, total: 0, count: 0, percentage: null }
  const earned = last5.reduce((s, r) => s + (r.score ?? 0), 0)
  const total = count * 100
  const percentage = Math.round((earned / total) * 100)
  return { earned, total, count, percentage }
}

function updateRecentAchievement(m) {
  m.recentAchievement = computeRecentAchievement(m.testResults || [])
}

function getPagePath(item) {
  if (item.type !== 'page') return null
  return item.id === 'top' ? '/' : '/p/' + item.id
}

function collectPages(items, out = []) {
  for (const item of items) {
    if (item.type === 'page') out.push(item)
    if (item.type === 'group' && item.children)
      collectPages(item.children, out)
  }
  return out
}

export const store = {
  get structure() {
    return data.structure
  },
  get content() {
    return data.content
  },
  get meta() {
    return data.meta
  },

  getPageById(id) {
    function find(items) {
      for (const item of items) {
        if (item.type === 'page' && item.id === id) return item
        if (item.type === 'group' && item.children) {
          const r = find(item.children)
          if (r) return r
        }
      }
      return null
    }
    return find(data.structure)
  },

  getContent(pageId) {
    return data.content[pageId] ?? ''
  },

  setContent(pageId, text) {
    data.content[pageId] = text
  },

  rename(itemId, name) {
    function doRename(items) {
      for (const item of items) {
        if (item.id === itemId) {
          item.name = name
          return true
        }
        if (item.type === 'group' && item.children && doRename(item.children))
          return true
      }
      return false
    }
    doRename(data.structure)
  },

  addGroup(afterItemId = null) {
    const newGroup = {
      type: 'group',
      id: genId(),
      name: '新しいグループ',
      children: [],
    }
    if (!afterItemId) {
      data.structure.push(newGroup)
      return newGroup
    }
    function insert(items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === afterItemId) {
          items.splice(i + 1, 0, newGroup)
          return true
        }
        if (items[i].type === 'group' && items[i].children && insert(items[i].children))
          return true
      }
      return false
    }
    if (!insert(data.structure)) data.structure.push(newGroup)
    return newGroup
  },

  addPage(parentGroupId) {
    const newPage = { type: 'page', id: genId(), name: '新しいページ' }
    data.content[newPage.id] = ''
    if (!parentGroupId) {
      data.structure.push(newPage)
      return newPage
    }
    function addTo(items) {
      for (const item of items) {
        if (item.type === 'group' && item.id === parentGroupId) {
          if (!item.children) item.children = []
          item.children.push(newPage)
          return true
        }
        if (item.type === 'group' && item.children && addTo(item.children))
          return true
      }
      return false
    }
    if (!addTo(data.structure)) data.structure.push(newPage)
    return newPage
  },

  deleteItem(itemId) {
    function remove(items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === itemId) {
          if (items[i].type === 'page') {
            delete data.content[items[i].id]
            delete data.meta[items[i].id]
          } else if (items[i].type === 'group' && items[i].children) {
            items[i].children.forEach((c) => c.type === 'page' && delete data.content[c.id])
            items[i].children.forEach((c) => c.type === 'page' && delete data.meta[c.id])
          }
          items.splice(i, 1)
          return true
        }
        if (items[i].type === 'group' && items[i].children && remove(items[i].children))
          return true
      }
      return false
    }
    remove(data.structure)
  },

  /** 項目を別位置へ移動。targetParentId: null=ルート、それ以外=グループid。targetIndex: 挿入位置 */
  moveItem(itemId, targetParentId, targetIndex) {
    let moved = null
    function removeFrom(items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === itemId) {
          moved = items.splice(i, 1)[0]
          return true
        }
        if (items[i].type === 'group' && items[i].children && removeFrom(items[i].children))
          return true
      }
      return false
    }
    removeFrom(data.structure)
    if (!moved) return
    let targetList
    if (targetParentId == null) {
      targetList = data.structure
    } else {
      function findGroup(items) {
        for (const it of items) {
          if (it.type === 'group' && it.id === targetParentId) {
            if (!it.children) it.children = []
            return it.children
          }
          if (it.type === 'group' && it.children) {
            const c = findGroup(it.children)
            if (c) return c
          }
        }
        return null
      }
      targetList = findGroup(data.structure)
    }
    if (!targetList) return
    const idx = Math.max(0, Math.min(targetIndex, targetList.length))
    targetList.splice(idx, 0, moved)
    if (moved.type === 'group' && !moved.children) moved.children = []
  },

  recordHover(pageId, key) {
    const m = ensureMeta(pageId)
    m.hoverCounts[key] = (m.hoverCounts[key] || 0) + 1
  },

  addTestResult(pageId, score, dateIso) {
    const m = ensureMeta(pageId)
    m.testResults.push({ score, date: dateIso })
    updateRecentAchievement(m)
  },

  getHoverCounts(pageId) {
    return ensureMeta(pageId).hoverCounts
  },

  getTestResults(pageId) {
    return ensureMeta(pageId).testResults
  },

  /** meta に埋め込んだ直近達成率を返す。ソート・検索用。無い場合は testResults から算出 */
  getRecentAchievement(pageId) {
    const m = ensureMeta(pageId)
    if (m.recentAchievement != null && typeof m.recentAchievement.percentage === 'number') {
      return m.recentAchievement
    }
    return computeRecentAchievement(m.testResults || [])
  },

  /** groupId が ancestorId の子孫なら true（自分を子にすると循環するため） */
  isDescendantOf(groupId, ancestorId) {
    if (groupId === ancestorId) return true
    function findItem(items, id) {
      for (const it of items) {
        if (it.id === id) return it
        if (it.type === 'group' && it.children) {
          const r = findItem(it.children, id)
          if (r) return r
        }
      }
      return null
    }
    function collectDescendantIds(item, out) {
      if (item.type === 'group' && item.children) {
        for (const c of item.children) {
          out.add(c.id)
          collectDescendantIds(c, out)
        }
      }
    }
    const ancestor = findItem(data.structure, ancestorId)
    if (!ancestor || ancestor.type !== 'group') return false
    const ids = new Set()
    collectDescendantIds(ancestor, ids)
    return ids.has(groupId)
  },

  getPagePath,
  collectPages,
}
