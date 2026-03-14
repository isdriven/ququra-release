<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadFromBackend, store } from './store.js'
import { loadSettingsFromBackend, settings } from './settings.js'
import { ListBooks, ExportBook, NewBook, SwitchBook } from '../wailsjs/go/main/App.js'
import OptionDialog from './components/OptionDialog.vue'
import TutorialModal from './components/TutorialModal.vue'
import AITutorialModal from './components/AITutorialModal.vue'

onMounted(async () => {
  try {
    await loadFromBackend()
  } catch (_) {
    alert('bookが壊れています')
  }
  await loadSettingsFromBackend()
  settings.applyCssVars()
})

const showOptionDialog = ref(false)
const showTutorialDialog = ref(false)
const showAITutorialDialog = ref(false)
const showFileMenu = ref(false)
const navSearchQuery = ref('')
const searchMatchGroupIds = ref(new Set())
const searchMatchPageIds = ref(new Set())
const showNewBookDialog = ref(false)
const newBookName = ref('')
const newBookError = ref('')
const showExportDialog = ref(false)
const exportName = ref('')
const exportError = ref('')
const bookList = ref([])

async function openFileMenu() {
  showFileMenu.value = true
  try {
    bookList.value = await ListBooks() || []
  } catch (_) {
    bookList.value = []
  }
}

function openNewBookDialog() {
  showFileMenu.value = false
  newBookName.value = ''
  newBookError.value = ''
  showNewBookDialog.value = true
}

async function submitNewBook() {
  const name = (newBookName.value || '').trim()
  if (!name) {
    newBookError.value = '名前を入力してください'
    return
  }
  newBookError.value = ''
  try {
    await NewBook(name)
    showNewBookDialog.value = false
  } catch (e) {
    newBookError.value = (e && e.message) ? e.message : '作成に失敗しました'
  }
}

function openExportDialog() {
  showFileMenu.value = false
  exportName.value = ''
  exportError.value = ''
  showExportDialog.value = true
}

async function submitExport() {
  const name = (exportName.value || '').trim()
  if (!name) {
    exportError.value = '名前を入力してください'
    return
  }
  exportError.value = ''
  try {
    await ExportBook(name)
    showExportDialog.value = false
  } catch (e) {
    exportError.value = (e && e.message) ? e.message : 'エクスポートに失敗しました'
  }
}

async function selectBook(bookFolder) {
  showFileMenu.value = false
  try {
    await SwitchBook(bookFolder)
    await loadFromBackend()
    await loadSettingsFromBackend()
  } catch (_) {
    alert('bookが壊れています')
  }
}

const route = useRoute()
const router = useRouter()

const currentPath = computed(() => route.path)

function pathFor(item) {
  if (item.type !== 'page') return null
  return item.id === 'top' ? '/' : '/p/' + item.id
}

function go(item) {
  const p = pathFor(item)
  if (p) router.push(p)
}

function isActive(item) {
  const p = pathFor(item)
  return p != null && currentPath.value === p
}

const editingId = ref(null)
const editingName = ref('')
const contentEditRef = ref(null) // contenteditable 要素（名前クリック時）
const expandedByGroupId = ref({}) // { [groupId]: boolean }. 未設定は true（開いている）
const contextMenuGroup = ref(null) // { item, structureIndex } hover で表示
const contextMenuFile = ref(null) // { item, parentId, index } hover で表示
const contextMenuPosition = ref({ left: 0, top: 0 })
const showMoveSubmenu = ref(false)
let hoverCloseTimeout = null
const dragSource = ref(null)
const dropTarget = ref(null)
let dragGhostEl = null

function isExpanded(groupId) {
  return expandedByGroupId.value[groupId] !== false
}
function toggleGroup(groupId) {
  expandedByGroupId.value = { ...expandedByGroupId.value, [groupId]: !isExpanded(groupId) }
}

function onGroupTriggerEnter(e, item, structureIndex) {
  if (hoverCloseTimeout) clearTimeout(hoverCloseTimeout)
  hoverCloseTimeout = null
  contextMenuGroup.value = { item, structureIndex }
  const rect = e.currentTarget.getBoundingClientRect()
  contextMenuPosition.value = { left: rect.right, top: rect.top }
}
function onGroupTriggerLeave() {
  hoverCloseTimeout = setTimeout(() => { contextMenuGroup.value = null }, 120)
}
function onGroupMenuEnter() {
  if (hoverCloseTimeout) clearTimeout(hoverCloseTimeout)
  hoverCloseTimeout = null
}
function onGroupMenuLeave() {
  contextMenuGroup.value = null
}

function closeContextMenu() {
  contextMenuGroup.value = null
}

function contextMenuNewFile(groupItem) {
  addPage(groupItem.id)
  closeContextMenu()
}
function contextMenuDeleteGroup(groupItem) {
  deleteItem(groupItem, { stopPropagation: () => {} })
  closeContextMenu()
}
function contextMenuGroupUp(groupItem, structureIndex) {
  if (structureIndex <= 0) return
  store.moveItem(groupItem.id, null, structureIndex - 1)
  closeContextMenu()
}
function contextMenuGroupDown(groupItem, structureIndex) {
  if (structureIndex >= store.structure.length - 1) return
  store.moveItem(groupItem.id, null, structureIndex + 1)
  closeContextMenu()
}

function onFileTriggerEnter(e, child, parentId, cIdx) {
  if (hoverCloseTimeout) clearTimeout(hoverCloseTimeout)
  hoverCloseTimeout = null
  contextMenuFile.value = { item: child, parentId, index: cIdx }
  const rect = e.currentTarget.getBoundingClientRect()
  contextMenuPosition.value = { left: rect.right, top: rect.top }
}
function onFileTriggerLeave() {
  hoverCloseTimeout = setTimeout(() => { contextMenuFile.value = null }, 120)
}
function onFileMenuEnter() {
  if (hoverCloseTimeout) clearTimeout(hoverCloseTimeout)
  hoverCloseTimeout = null
}
function onFileMenuLeave() {
  contextMenuFile.value = null
  showMoveSubmenu.value = false
}

function closeFileContextMenu() {
  contextMenuFile.value = null
}

function contextMenuFileUp(fileItem, parentId, index) {
  if (index <= 0) return
  store.moveItem(fileItem.id, parentId, index - 1)
  closeFileContextMenu()
}
function contextMenuFileDown(fileItem, parentId, index) {
  const group = store.structure.find((it) => it.type === 'group' && it.id === parentId)
  const len = (group?.children || []).length
  if (index >= len - 1) return
  store.moveItem(fileItem.id, parentId, index + 1)
  closeFileContextMenu()
}
function contextMenuFileDelete(fileItem) {
  deleteItem(fileItem, { stopPropagation: () => {} })
  closeFileContextMenu()
}
function contextMenuFileMove(fileItem, targetGroupId) {
  if (store.isDescendantOf && store.isDescendantOf(targetGroupId, fileItem.id)) return
  store.moveItem(fileItem.id, targetGroupId, 0)
  closeFileContextMenu()
}

const groupsList = computed(() => store.structure.filter((it) => it.type === 'group'))

function startEdit(item) {
  editingId.value = item.id
  editingName.value = item.name
  nextTick(() => {
    if (contentEditRef.value) {
      contentEditRef.value.textContent = item.name
      contentEditRef.value.focus()
    }
  })
}

function saveEditFromContentEditable() {
  if (editingId.value == null || !contentEditRef.value) return
  const name = contentEditRef.value.textContent?.trim() || 'Untitled'
  store.rename(editingId.value, name)
  editingId.value = null
}

function addGroup() {
  store.addGroup()
}

function addPage(parentGroupId) {
  const page = store.addPage(parentGroupId)
  router.push('/p/' + page.id)
  startEdit(page)
}

function deleteItem(item, e) {
  e.stopPropagation()
  const path = pathFor(item)
  const isCurrent = path != null && currentPath.value === path
  if (item.type === 'page' && isCurrent) router.push('/')
  store.deleteItem(item.id)
}

// ゴースト: 使い捨ての新要素、名前だけ。元要素は使わない。
function createDragGhost(name) {
  if (dragGhostEl?.parentNode) dragGhostEl.parentNode.removeChild(dragGhostEl)
  dragGhostEl = document.createElement('div')
  dragGhostEl.setAttribute('aria-hidden', 'true')
  dragGhostEl.className = 'nav-drag-ghost'
  dragGhostEl.textContent = name || ''
  dragGhostEl.style.cssText = 'position:absolute;left:-9999px;top:0;padding:0.35rem 0.6rem;font-size:0.9375rem;white-space:nowrap;background:var(--nav-bg,#2d3748);color:var(--text,#e2e8f0);border:1px solid var(--border,#4a5568);border-radius:6px;opacity:0.85;box-shadow:0 4px 12px rgba(0,0,0,0.25);pointer-events:none;'
  document.body.appendChild(dragGhostEl)
  return dragGhostEl
}

function onDragStart(e, item, parentId, index) {
  dragSource.value = { itemId: item.id, parentId, index, itemType: item.type }
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', item.id)
  e.dataTransfer.setDragImage(createDragGhost(item.name || (item.type === 'group' ? 'グループ' : 'ページ')), 0, 0)
}

function onDragEnd() {
  if (dragGhostEl?.parentNode) dragGhostEl.parentNode.removeChild(dragGhostEl)
  dragGhostEl = null
  dragSource.value = null
  dropTarget.value = null
}

// グループ用パッド: group-pad-first / group-pad / group-pad-last のみ。グループだけ受け付ける。
function onDragOverGroupPad(e, structureIndex) {
  e.preventDefault()
  e.stopPropagation()
  if (!dragSource.value || dragSource.value.itemType !== 'group') return
  if (dragSource.value.itemId === (e.currentTarget.dataset?.itemId)) return
  e.dataTransfer.dropEffect = 'move'
  dropTarget.value = { type: 'group-pad', groupPadIndex: structureIndex }
}

function onDropGroupPad(e, structureIndex) {
  e.preventDefault()
  e.stopPropagation()
  const src = dragSource.value
  if (!src || src.itemType !== 'group') return
  let index = structureIndex
  const srcIdx = structureIndexOf(src.itemId)
  if (srcIdx !== -1 && srcIdx < structureIndex) index--
  store.moveItem(src.itemId, null, index)
  dropTarget.value = null
}

function structureIndexOf(itemId) {
  const list = store.structure
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === itemId) return i
  }
  return -1
}

// アイテム用スロット: nav-item の上側・下側。ページだけ受け付ける。他グループでもその位置に設置。
function onDragOverItemSlot(e, parentId, index) {
  e.preventDefault()
  e.stopPropagation()
  if (!dragSource.value || dragSource.value.itemType !== 'page') return
  if (dragSource.value.itemId === (e.currentTarget.dataset?.itemId)) return
  e.dataTransfer.dropEffect = 'move'
  dropTarget.value = { type: 'item-slot', parentId, index }
}

function onDropItemSlot(e, parentId, index) {
  e.preventDefault()
  e.stopPropagation()
  const src = dragSource.value
  if (!src || src.itemType !== 'page') return
  if (store.isDescendantOf && parentId && store.isDescendantOf(parentId, src.itemId)) return
  let idx = index
  if (src.parentId === parentId && src.index < index) idx--
  store.moveItem(src.itemId, parentId, idx)
  dropTarget.value = null
}

function onDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) dropTarget.value = null
}

function dropTargetIsGroupPad(structureIndex) {
  const t = dropTarget.value
  return t?.type === 'group-pad' && t.groupPadIndex === structureIndex
}

function dropTargetIsItemSlot(parentId, index) {
  const t = dropTarget.value
  return t?.type === 'item-slot' && t.parentId === parentId && t.index === index
}

/** 全文検索：検索バーの文言で全ページを検索し、該当するグループ・ファイルに赤ぽち用の Set を更新 */
function runNavSearch() {
  const q = (navSearchQuery.value || '').trim()
  const matchGroups = new Set()
  const matchPages = new Set()
  if (q) {
    for (const item of store.structure) {
      if (item.type !== 'group' || !item.children) continue
      for (const child of item.children) {
        if (child.type !== 'page') continue
        const text = store.getContent(child.id) ?? ''
        if (text.includes(q)) {
          matchPages.add(child.id)
          matchGroups.add(item.id)
        }
      }
    }
  }
  searchMatchGroupIds.value = matchGroups
  searchMatchPageIds.value = matchPages
}

</script>

<template>
  <div class="app-layout">
    <header class="app-menubar">
      <div class="menubar-inner">
        <div class="menubar-file-wrap">
          <button type="button" class="menubar-item" @click="openFileMenu">FILE</button>
          <div v-show="showFileMenu" class="menubar-dropdown">
            <button type="button" class="menubar-dropdown-item menubar-dropdown-item--new" @click="openNewBookDialog">NEW BOOK</button>
            <button type="button" class="menubar-dropdown-item" @click="openExportDialog">EXPORT</button>
            <div class="menubar-dropdown-label">BOOK</div>
            <button
              v-for="b in bookList"
              :key="b"
              type="button"
              class="menubar-dropdown-item"
              @click="selectBook(b)"
            >{{ b }}</button>
          </div>
        </div>
        <button type="button" class="menubar-item" @click="showOptionDialog = true">Option</button>
        <button type="button" class="menubar-item" @click="showTutorialDialog = true">Tutorial</button>
        <button type="button" class="menubar-item" @click="showAITutorialDialog = true">AI Tutorial</button>
      </div>
      <div v-if="showFileMenu" class="menubar-dropdown-overlay" @click="showFileMenu = false" />
    </header>
    <div class="app-body">
    <nav id="nav-pane" class="nav-pane">
      <div class="nav-inner">
        <div class="nav-search-row">
          <input
            v-model="navSearchQuery"
            type="text"
            class="nav-search-input"
            placeholder="全文検索"
            @keydown.enter.prevent="runNavSearch"
          />
          <button
            type="button"
            class="nav-search-btn"
            aria-label="検索"
            title="検索"
            @click="runNavSearch"
          >
            <svg class="nav-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </div>
        <div class="nav-top-actions">
          <button type="button" class="nav-add-btn" @click="addGroup">NEW GROUP</button>
        </div>
        <div
          class="group-pad-first"
          :class="{ 'nav-drag-over': dropTargetIsGroupPad(0) }"
          @dragover.prevent="onDragOverGroupPad($event, 0)"
          @dragleave="onDragLeave"
          @drop="onDropGroupPad($event, 0)"
        />

        <template v-for="(item, idx) in store.structure" :key="item.id">
          <template v-if="item.type === 'group'">
            <div
              class="group-head"
              :draggable="editingId !== item.id"
              :data-item-id="item.id"
              @dragstart="onDragStart($event, item, null, idx)"
              @dragend="onDragEnd"
            >
              <span
                v-if="editingId !== item.id"
                class="group-head-name"
                @click.stop="toggleGroup(item.id)"
                @dblclick.stop="startEdit(item)"
              ><span v-if="searchMatchGroupIds.has(item.id)" class="nav-search-dot" aria-hidden="true"></span>{{ item.name }}</span>
              <span
                v-else
                :ref="el => { if (el && editingId === item.id) contentEditRef = el }"
                class="group-head-name group-head-name--edit"
                contenteditable="true"
                @blur="saveEditFromContentEditable"
                @keydown.enter.prevent="saveEditFromContentEditable"
              />
              <span
                class="group-head-trigger"
                @mouseenter="onGroupTriggerEnter($event, item, idx)"
                @mouseleave="onGroupTriggerLeave"
              >&gt;</span>
            </div>

            <div v-show="isExpanded(item.id)" class="group-items">
              <template v-for="(child, cIdx) in (item.children || [])" :key="child.id">
                <div
                  v-if="child.type === 'page'"
                  class="item-slot"
                  :class="{ 'nav-drag-over': dropTargetIsItemSlot(item.id, cIdx) }"
                  @dragover.prevent="onDragOverItemSlot($event, item.id, cIdx)"
                  @dragleave="onDragLeave"
                  @drop="onDropItemSlot($event, item.id, cIdx)"
                />
                <div
                  v-if="child.type === 'page'"
                  class="nav-item-row"
                  :draggable="editingId !== child.id"
                  :data-item-id="child.id"
                  @dragstart="onDragStart($event, child, item.id, cIdx)"
                  @dragend="onDragEnd"
                >
                  <span
                    v-if="editingId !== child.id"
                    class="nav-item"
                    :class="{ active: isActive(child) }"
                    @click="go(child)"
                    @dblclick.stop="startEdit(child)"
                  ><span v-if="searchMatchPageIds.has(child.id)" class="nav-search-dot" aria-hidden="true"></span>{{ child.name }}</span>
                  <span
                    v-else
                    :ref="el => { if (el && editingId === child.id) contentEditRef = el }"
                    class="nav-item nav-item--edit"
                    contenteditable="true"
                    @blur="saveEditFromContentEditable"
                    @keydown.enter.prevent="saveEditFromContentEditable"
                  />
                  <span
                    class="nav-item-trigger"
                    @mouseenter="onFileTriggerEnter($event, child, item.id, cIdx)"
                    @mouseleave="onFileTriggerLeave"
                  >&gt;</span>
                </div>
              </template>
              <div
                class="item-slot item-slot--last"
                :class="{ 'nav-drag-over': dropTargetIsItemSlot(item.id, (item.children || []).length) }"
                @dragover.prevent="onDragOverItemSlot($event, item.id, (item.children || []).length)"
                @dragleave="onDragLeave"
                @drop="onDropItemSlot($event, item.id, (item.children || []).length)"
              />
            </div>

            <div
              :class="[
                idx === store.structure.length - 1 ? 'group-pad-last' : 'group-pad',
                { 'nav-drag-over': dropTargetIsGroupPad(idx + 1) }
              ]"
              @dragover.prevent="onDragOverGroupPad($event, idx + 1)"
              @dragleave="onDragLeave"
              @drop="onDropGroupPad($event, idx + 1)"
            />
          </template>
        </template>
      </div>
    </nav>
    <main class="main-pane" @click="saveEditFromContentEditable">
      <router-view />
    </main>
    </div>
    <!-- グループ > hover: NEW FILE | UP | DOWN | (間) | DELETE -->
    <Teleport to="body">
      <Transition name="nav-menu">
        <div
          v-if="contextMenuGroup"
          class="group-context-menu"
          :style="{ left: contextMenuPosition.left + 'px', top: contextMenuPosition.top + 'px' }"
          @mouseenter="onGroupMenuEnter"
          @mouseleave="onGroupMenuLeave"
          @click.stop
        >
          <button type="button" class="group-context-btn" @click="contextMenuNewFile(contextMenuGroup.item); closeContextMenu()">NEW FILE</button>
          <span class="group-context-sep">|</span>
          <button type="button" class="group-context-btn" @click="contextMenuGroupUp(contextMenuGroup.item, contextMenuGroup.structureIndex); closeContextMenu()">UP</button>
          <span class="group-context-sep">|</span>
          <button type="button" class="group-context-btn" @click="contextMenuGroupDown(contextMenuGroup.item, contextMenuGroup.structureIndex); closeContextMenu()">DOWN</button>
          <span class="group-context-spacer" />
          <button type="button" class="group-context-btn" @click="contextMenuDeleteGroup(contextMenuGroup.item)">DELETE</button>
        </div>
      </Transition>
      <!-- ファイル > hover: UP | DOWN | MOVE ▸ | (間) | DELETE。MOVE に hover でグループ一覧 -->
      <Transition name="nav-menu">
        <div
          v-if="contextMenuFile"
          class="group-context-menu file-context-menu"
          :style="{ left: contextMenuPosition.left + 'px', top: contextMenuPosition.top + 'px' }"
          @mouseenter="onFileMenuEnter"
          @mouseleave="onFileMenuLeave"
          @click.stop
        >
          <button type="button" class="group-context-btn" @click="contextMenuFileUp(contextMenuFile.item, contextMenuFile.parentId, contextMenuFile.index); closeFileContextMenu()">UP</button>
          <span class="group-context-sep">|</span>
          <button type="button" class="group-context-btn" @click="contextMenuFileDown(contextMenuFile.item, contextMenuFile.parentId, contextMenuFile.index); closeFileContextMenu()">DOWN</button>
          <span class="group-context-sep">|</span>
          <div
            class="group-context-btn group-context-btn--sub"
            @mouseenter="showMoveSubmenu = true"
            @mouseleave="showMoveSubmenu = false"
          >
            MOVE ▸
            <Transition name="nav-menu">
              <div
                v-if="showMoveSubmenu"
                class="context-submenu context-submenu--groups"
                @mouseenter="showMoveSubmenu = true"
                @mouseleave="showMoveSubmenu = false"
              >
                <button
                  v-for="g in groupsList"
                  :key="g.id"
                  type="button"
                  class="context-submenu-item"
                  :class="{ 'context-submenu-item--current': g.id === contextMenuFile?.parentId }"
                  @click="contextMenuFileMove(contextMenuFile.item, g.id)"
                >{{ g.name }}</button>
              </div>
            </Transition>
          </div>
          <span class="group-context-spacer" />
          <button type="button" class="group-context-btn" @click="contextMenuFileDelete(contextMenuFile.item)">DELETE</button>
        </div>
      </Transition>
    </Teleport>
    <!-- NEW BOOK 名前決定ダイアログ -->
    <Teleport to="body">
      <div
        v-if="showNewBookDialog"
        class="new-book-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="showNewBookDialog = false"
      >
        <div class="new-book-window" @click.stop>
          <div class="new-book-header">
            <h3>NEW BOOK</h3>
            <button type="button" class="dialog-close" aria-label="閉じる" @click="showNewBookDialog = false">×</button>
          </div>
          <div class="new-book-body">
            <p class="new-book-hint">現在のブックを別名でコピーします（ququra-book-〇〇）。現在のブックはそのままです。</p>
            <input
              v-model="newBookName"
              type="text"
              class="new-book-input"
              placeholder="ブック名（例: sakura）"
              @keydown.enter.prevent="submitNewBook"
            />
            <p v-if="newBookError" class="new-book-error">{{ newBookError }}</p>
          </div>
          <div class="new-book-actions">
            <button type="button" class="btn-apply" @click="submitNewBook">OK</button>
            <button type="button" class="btn-cancel" @click="showNewBookDialog = false">キャンセル</button>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- EXPORT 名前決定ダイアログ -->
    <Teleport to="body">
      <div
        v-if="showExportDialog"
        class="new-book-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="showExportDialog = false"
      >
        <div class="new-book-window" @click.stop>
          <div class="new-book-header">
            <h3>EXPORT</h3>
            <button type="button" class="dialog-close" aria-label="閉じる" @click="showExportDialog = false">×</button>
          </div>
          <div class="new-book-body">
            <p class="new-book-hint">現在のブックを別名でコピーします（ququra-book-〇〇）。現在のブックはそのままです。</p>
            <input
              v-model="exportName"
              type="text"
              class="new-book-input"
              placeholder="ブック名（例: backup-2024）"
              @keydown.enter.prevent="submitExport"
            />
            <p v-if="exportError" class="new-book-error">{{ exportError }}</p>
          </div>
          <div class="new-book-actions">
            <button type="button" class="btn-apply" @click="submitExport">OK</button>
            <button type="button" class="btn-cancel" @click="showExportDialog = false">キャンセル</button>
          </div>
        </div>
      </div>
    </Teleport>
    <OptionDialog v-if="showOptionDialog" @close="showOptionDialog = false" />
    <TutorialModal v-if="showTutorialDialog" @close="showTutorialDialog = false" />
    <AITutorialModal v-if="showAITutorialDialog" @close="showAITutorialDialog = false" />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-menubar {
  flex-shrink: 0;
  background: var(--nav-bg);
  border-bottom: 1px solid var(--border);
}
.menubar-inner {
  padding: 0.35rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.menubar-file-wrap {
  position: relative;
}
.menubar-dropdown {
  position: absolute;
  left: 0;
  top: 100%;
  margin-top: 2px;
  min-width: 12rem;
  max-height: 60vh;
  overflow-y: auto;
  background: var(--nav-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.25rem 0;
  z-index: 100;
}
.menubar-dropdown-label {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}
.menubar-dropdown-item {
  display: block;
  width: 100%;
  padding: 0.35rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
}
.menubar-dropdown-item:hover {
  background: var(--nav-hover);
}
.menubar-dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
}
.menubar-item {
  padding: 0.35rem 0.6rem;
  font-size: 0.875rem;
  color: var(--text);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.menubar-item:hover {
  background: var(--nav-hover);
}

.app-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.nav-pane {
  width: 260px;
  min-width: 260px;
  background: var(--nav-bg);
  border-right: 1px solid var(--border);
  overflow-y: auto;
}

.nav-inner {
  padding: 1rem 0.75rem;
}

.nav-search-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}
.nav-search-input {
  flex: 1;
  min-width: 0;
  padding: 0.35rem 0.5rem;
  font-size: 0.8125rem;
  color: var(--text);
  background: var(--nav-hover, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--border);
  border-radius: 6px;
}
.nav-search-input::placeholder {
  color: var(--text-muted);
}
.nav-search-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  background: var(--nav-hover, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
}
.nav-search-btn:hover {
  color: var(--accent);
  background: var(--border);
}
.nav-search-icon {
  width: 1rem;
  height: 1rem;
}
.nav-search-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 0.35rem;
  border-radius: 50%;
  background: #f87171;
  vertical-align: 0.15em;
}

.nav-top-actions {
  margin-bottom: 0.75rem;
}

/* グループ移動用パッド（group-pad-first / group-pad / group-pad-last のみ受け付け） */
.group-pad-first,
.group-pad,
.group-pad-last {
  height: 4px;
  min-height: 4px;
  margin: 0;
  transition: background 0.15s;
}
.group-pad-first.nav-drag-over,
.group-pad.nav-drag-over,
.group-pad-last.nav-drag-over {
  background: var(--accent);
  opacity: 0.5;
  border-radius: 2px;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.9375rem;
  color: var(--text);
  cursor: default;
  border-radius: 6px;
}
.group-head:first-of-type { margin-top: 0; }
.group-head-name {
  flex: 1;
  min-width: 0;
  cursor: pointer;
  padding: 0.2rem 0;
}
.group-head-name:hover { color: var(--accent); }
.group-head-name--edit {
  outline: 1px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
  padding: 0.2rem 0.35rem;
}
.group-head-trigger {
  flex-shrink: 0;
  padding: 0.2rem 0.4rem;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
}
.group-head-trigger:hover {
  color: var(--accent);
  background: var(--nav-hover);
}

.group-items {
  padding-left: 0.75rem;
  border-left: 1px solid var(--border);
  margin-left: 0.5rem;
}

.item-slot {
  height: 3px;
  min-height: 3px;
  margin: 0;
  transition: background 0.15s;
}
.item-slot.nav-drag-over {
  background: var(--accent);
  opacity: 0.5;
  border-radius: 2px;
}
.item-slot--last {
  margin-bottom: 0.25rem;
}

.nav-item-row {
  display: flex;
  align-items: center;
  gap: 2px;
  margin: 2px 0;
}
.nav-item {
  flex: 1;
  padding: 0.4rem 0.6rem;
  text-align: left;
  font-size: 0.875rem;
  color: var(--text);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  min-width: 0;
}
.nav-item:hover {
  background: var(--nav-hover);
}
.nav-item.active {
  background: var(--nav-active);
  color: var(--accent);
  font-weight: 500;
}
.nav-item--edit {
  outline: 1px solid var(--accent);
  outline-offset: 1px;
  border-radius: 4px;
}
.nav-item-trigger {
  flex-shrink: 0;
  padding: 0.2rem 0.35rem;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
}
.nav-item-trigger:hover {
  color: var(--accent);
  background: var(--nav-hover);
}

.group-context-menu {
  position: fixed;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.35rem;
  background: var(--nav-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.group-context-menu.file-context-menu {
  align-items: stretch;
}
.group-context-spacer {
  min-width: 1.5rem;
  margin: 0 0.25rem;
}
.group-context-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.8125rem;
  background: transparent;
  border: none;
  color: var(--text);
  cursor: pointer;
  border-radius: 4px;
}
.group-context-btn:hover {
  background: var(--nav-hover);
}
.group-context-btn--sub {
  position: relative;
}
.context-submenu {
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 2px;
  min-width: 10rem;
  background: var(--nav-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0;
  z-index: 10000;
}
.context-submenu--groups {
  display: flex;
  flex-direction: column;
  padding: 0.2rem 0;
}
.context-submenu-item {
  display: block;
  width: 100%;
  padding: 0.35rem 0.6rem;
  text-align: left;
  font-size: 0.8125rem;
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
}
.context-submenu-item:hover {
  background: var(--nav-hover);
}
.context-submenu-item--current {
  color: var(--text-muted);
}
.group-context-sep {
  color: var(--text-muted);
  font-size: 0.75rem;
  user-select: none;
}

.nav-menu-enter-active,
.nav-menu-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.nav-menu-enter-from,
.nav-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.nav-add-btn {
  padding: 0.4rem 0.75rem;
  font-size: 0.8125rem;
  background: var(--nav-hover);
  color: var(--text-muted);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
}
.nav-add-btn:hover {
  background: var(--border);
  color: var(--text);
}

.nav-del-btn {
  padding: 0.2rem 0.35rem;
  font-size: 0.875rem;
  line-height: 1;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
}
.nav-del-btn:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.15);
}

.main-pane {
  flex: 1;
  overflow-y: auto;
  background: var(--main-bg);
  font-family: var(--content-font-family);
  font-size: var(--content-font-size);
}

.new-book-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  box-sizing: border-box;
}
.new-book-window {
  background: var(--nav-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  min-width: 360px;
  max-width: 420px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}
.new-book-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.new-book-header h3 { margin: 0; font-size: 1.1rem; }
.new-book-header .dialog-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
  padding: 0 0.25rem;
}
.new-book-header .dialog-close:hover { color: var(--text); }
.new-book-body { padding: 1.25rem; }
.new-book-hint {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: 0 0 0.75rem;
}
.new-book-input {
  width: 100%;
  padding: 0.5rem 0.6rem;
  font-size: 0.9375rem;
  background: var(--code-bg, #1a202c);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-sizing: border-box;
}
.new-book-error {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: #f87171;
}
.new-book-actions {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border);
}
.new-book-actions .btn-apply { padding: 0.4rem 1rem; }
.btn-cancel {
  padding: 0.4rem 1rem;
  font-size: 0.875rem;
  background: var(--nav-hover);
  color: var(--text);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-cancel:hover { background: var(--border); }
.menubar-dropdown-item--new { font-weight: 500; }
</style>
