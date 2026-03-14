# ナビ並び替え・ドロップの分析

## 結論（要約）

- **「配列に正確に挿入できていない」かどうか**: store の `moveItem` と index 調整ロジックは**整合しており、同じ親内・別親への「この位置の前」への挿入は正しく動く**想定です。
- **壊れているように見える主因**:  
  1. **ドロップ先の解釈が2種類ある**（「並び替え」vs「グループに入れる」）のに、**グループ行は「並び替え用」のゾーンが狭く**、少しでもずれると「グループに入れる」扱いになる。  
  2. **グループをグループの上にドロップしたとき**は「グループに入れる」側で `return` しているだけで、**並び替えには回っていない**（並び替えは「reorder zone にドロップ」のみ）。  
  3. **グループの「末尾」に挿入するドロップゾーンがない**（`(item.id, children.length)` を渡す要素がない）。

つまり、「配列の挿入ロジックが根本的に間違っている」というより、**「どの DOM がどの (parentId, index) を渡すか」の設計と、ドロップゾーンの不足・サイズ**で失敗している可能性が高いです。

---

## 1. 配列挿入まわり（store + App.vue）

### 1.1 store.moveItem の動き

- `removeFrom(data.structure)` で**先に**対象を配列から取り除く。
- `targetParentId == null` なら `data.structure`、否则 `findGroup(...).children` を `targetList` にする。
- `idx = Math.max(0, Math.min(targetIndex, targetList.length))` で挿入位置を clamp。
- `targetList.splice(idx, 0, moved)` で 1 件挿入。

意味: **「targetList の idx の位置の“前”に挿入する」**で一貫している。

### 1.2 App.vue の onDrop の index 調整

```js
let index = targetIndex
if (src.parentId === (targetParentId ?? null) && src.index < targetIndex) index--
store.moveItem(src.itemId, targetParentId || null, index)
```

- ドロップ時には「**この要素の前**」＝ `targetIndex` に挿入したい、という意味で `(parentId, targetIndex)` を渡している。
- **同じ親内**で、かつ **src.index < targetIndex** のときだけ `index--` している。  
  理由: 先に remove するので、元の配列で「後ろ」に挿入する場合は、remove 後の配列では 1 つ前の index になるため。

例:

- `[A,B,C,D]` で B(index 1) を D の前(index 3) に → index 2 で insert → `[A,C,D,B]` のイメージにならない。正しくは remove 後 `[A,C,D]` に index 3 で insert → `[A,C,D,B]`。  
  - 渡す index は 3 のままではずれるので、`index--` で 2 にしている、という理解でよい。  
  - 実際には「insert before 3」なら remove 後は長さ 3 なので「insert at 3」は末尾。3 のままで [A,C,D] に insert at 3 → [A,C,D,B]。なので「targetIndex 3 をそのまま渡す」なら index 調整は「同じ親かつ src.index < targetIndex のとき index--」で整合する。

つまり、**「同じ親内の前後」「別親への挿入」とも、いまの store + onDrop の組み合わせでは「配列に挿入する位置」は正しくなる設計**です。

### 1.3 どこで (parentId, index) が決まるか

- 実際に動く挿入位置は **drop イベントがどの要素で発火したか**で決まる（`onDrop(e, targetParentId, targetIndex)` の引数）。
- `dropTarget` の ref は**ゴースト表示用**で、**実際の move には使っていない**。  
  → どこの DOM に drop が届いたかで (parentId, index) が決まるので、**「配列がおかしい」より「意図した DOM に drop が届いていない」**可能性が大きい。

---

## 2. なぜ「壊れている」ように見えるか

### 2.1 グループ行に「並び替え」と「グループに入れる」が同居している

- **並び替え**: `nav-group-reorder-zone` だけが `onDragOver($event, null, idx)` / `onDrop($event, null, idx)` を発火。  
  → ここにドロップすると「ルートの idx の前」に挿入される。
- **グループに入れる**: `nav-group-name` が `onDragOverGroup` / `onDropIntoGroup` を発火。  
  → ここにドロップすると「そのグループの children の先頭」に `moveItem(..., groupId, 0)`。

グループ行は「左の reorder zone」が狭く、**少しでも右（グループ名側）にずれると「グループに入れる」扱い**になる。  
しかも **グループをドラッグしてグループ名にドロップすると** `onDropIntoGroup` 側で `src.itemType === 'group'` なので **何もせず return**。  
→ ユーザーは「並び替えしたつもり」でも、**並び替え用の zone に落ちておらず、かつ「グループに入れる」も実行されない**ため、「何も起きない／消えたように見える」になり得る。

### 2.2 グループの「末尾」に挿入するゾーンがない

- グループの子は `v-for="(child, cIdx) in (item.children || [])"` の各要素で `(item.id, cIdx)` を渡している。
- つまり **「先頭」「2番目」「…」「最後の子の前」** しかない。
- **「最後の子の後ろ」（= グループの末尾）** に挿入するための `(item.id, children.length)` を渡す要素（例: `nav-group-actions` の上や「+ Page」周り）に dragover/drop がない。  
→ **グループの末尾にドロップで入れることができない**。これは「配列の挿入が間違っている」というより「挿入位置を指定する DOM がそもそもない」問題。

### 2.3 ゴーストと「難しいか」

- ゴーストは `setDragImage(e.currentTarget, 0, 0)` と `nav-dragging` の opacity で、一般的な実装。
- **難しいのは「配列の splice」ではなく、次の設計**です:
  - 1 つのグループ行に **2 種類のドロップ意味**（並び替え vs グループに入れる）がある。
  - 並び替え用の**物理的な受け皿（reorder zone）が小さい**。
  - グループ→グループは「並び替え」にしたいのに、**並び替えは reorder zone にしか紐づいていない**。

---

## 3. まとめ

| 項目 | 状況 |
|------|------|
| 配列挿入ロジック（store.moveItem + index 調整） | 同じ親・別親とも「この位置の前」の意味で整合している。 |
| 壊れているように見える主因 | ① 並び替え用 zone が小さく、グループ名に落ちると「グループに入れる」扱い（グループ同士なら何もしない）。② グループ末尾へのドロップゾーンがない。 |
| ゴースト／並び替えの難しさ | アルゴリズムより「どの DOM がどの (parentId, index) を渡すか」と zone の大きさ・数の設計。 |

**改善の方向性（参考）**

- 並び替えと「グループに入れる」を**視覚的・領域的に分ける**（例: 並び替えは行の左端の線だけ、グループに入れるは行の中央など）。
- グループをグループの上にドロップしたときは、**「グループに入れる」でなく「そのグループの直前に挿入」**として扱うオプション（`onDrop($event, null, idx)` 相当を、グループ名ドロップでも発火させるなど）。
- グループの子リストの**末尾**に、`(item.id, item.children.length)` を渡すドロップゾーンを 1 つ追加する（例: `nav-group-actions` の上に「ここにドロップで末尾に追加」を用意する）。

これらを変えれば、**配列挿入ロジックをいじらなくても**「意図した位置に挿入されない」感はかなり減らせます。
