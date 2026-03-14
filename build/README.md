# Flash Notes (ququra) — ビルド

## Linux 用にビルドする

### 方法1: Linux マシン上でビルド（推奨）

Linux 上でそのままビルドするのがいちばん確実です。

```bash
cd learning-app   # プロジェクトルート（wails.json があるディレクトリ）
wails build
```

成果物は `build/bin/` 以下に出力されます（例: `ququra` 実行ファイル）。

- 64bit: `wails build` で OK（デフォルトで linux/amd64 相当）
- 明示する場合: `wails build -platform linux/amd64`
- ARM64（Raspberry Pi 等）: `wails build -platform linux/arm64`

**必要なもの（Linux）**

- Go
- Node.js / npm（フロント用）
- Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- Linux 用 WebView 依存（ディストリによっては `webkit2gtk` 等。Wails の Linux ドキュメントを参照）

### 方法2: Windows から Linux 用をビルド（クロスコンパイル）

Wails は `-platform` でターゲットを指定できますが、**Windows から Linux 向けのクロスコンパイルは CGO/WebView の都合で失敗しやすい**です。

試す場合:

```powershell
cd learning-app
wails build -platform linux/amd64
```

うまくいかない場合は、**GitHub Actions で Ubuntu ランナー上でビルド**する方法が現実的です。

- [Wails - Crossplatform build with Github Actions](https://wails.io/docs/next/guides/crossplatform-build)
- ワークフローで `runs-on: ubuntu-latest` にして `wails build` を実行し、`build/bin/` の成果物をアーティファクトで取り出す

---

## .deb パッケージにする（Debian / Ubuntu / Chromebook の Linux 等）

Wails v2 には deb 用コマンドがないので、**Linux でビルドしたあと、手動で .deb を組み立てます**。

### 手順（dpkg-deb で作成）

1. **Linux でビルド**
   ```bash
   cd learning-app
   wails build
   ```
   → `build/bin/ququra` ができる想定。

2. **パッケージ用のディレクトリを用意**
   ```bash
   cd build
   mkdir -p debian/usr/bin
   cp bin/ququra debian/usr/bin/
   chmod 755 debian/usr/bin/ququra
   ```

3. **DEBIAN/control を作成**
   ```bash
   mkdir -p debian/DEBIAN
   ```
   `debian/DEBIAN/control` を次の内容で作成（バージョン・アーキは適宜変更）:
   ```
   Package: ququra
   Version: 1.0.0
   Section: utils
   Priority: optional
   Architecture: amd64
   Maintainer: isdriven <isdriven@gmail.com>
   Description: Flash Notes - 伏字で覚えるマークダウンノート
   伏字・テスト・複数ブック対応のノートアプリ。
   ```
   ARM64 用なら `Architecture: arm64` に変更。

4. **.deb をビルド**
   ```bash
   dpkg-deb --build debian ququra_1.0.0_amd64.deb
   ```
   → `ququra_1.0.0_amd64.deb` ができる。

5. **インストール（配布先の Linux で）**
   ```bash
   sudo dpkg -i ququra_1.0.0_amd64.deb
   ```
   依存（WebView 等）でエラーが出たら: `sudo apt-get install -f`

**Chromebook** の Linux 環境（Crostini）は Debian/Ubuntu 系なので、上記 .deb を `dpkg -i` で入れられます。機種が ARM なら `wails build -platform linux/arm64` でビルドし、`Architecture: arm64` の .deb を作成してください。

---

## Windows 用

```powershell
cd learning-app
wails build
```

`build/bin/` に exe が出力されます。

## 共通

- クリーンビルド: `wails build -clean`
- フロントだけスキップ: `wails build -s`（Go だけビルドしたいとき）
