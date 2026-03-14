package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
)

// App struct
type App struct {
	ctx         context.Context
	store       *boltStore
	currentBook string // 現在のブックフォルダ名（例: ququra-book-0）
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	store, err := newBoltStore("")
	if err != nil {
		return
	}
	a.store = store
	a.currentBook = defaultBookFolder
}

// LoadData は bbolt から全データを読み込んでフロントに返す
func (a *App) LoadData() (*AppData, error) {
	if a.store == nil {
		return nil, fmt.Errorf("store not initialized")
	}
	return a.store.Load()
}

// SaveData はフロントから受け取ったデータを bbolt に保存する
func (a *App) SaveData(data *AppData) error {
	if a.store == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.store.Save(data)
}

// LoadSettings は bbolt から設定を読み込む
func (a *App) LoadSettings() (*AppSettings, error) {
	if a.store == nil {
		return nil, fmt.Errorf("store not initialized")
	}
	return a.store.LoadSettings()
}

// SaveSettings はフロントから受け取った設定を bbolt に保存する
func (a *App) SaveSettings(settings *AppSettings) error {
	if a.store == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.store.SaveSettings(settings)
}

// GetSystemFonts はシステムにインストールされているフォント名の一覧を返す
func (a *App) GetSystemFonts() []string {
	return getSystemFonts()
}

// ResetData は bbolt のデータ（structure, content, meta）を削除する。設定は残す。
func (a *App) ResetData() error {
	if a.store == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.store.ResetData()
}

// ListBooks は exe と同じ位置にある ququra-* フォルダ名の一覧を返す。ququra-book-0 は必ず存在するようにする。
func (a *App) ListBooks() ([]string, error) {
	return listBookFolders()
}

// SwitchBook は指定したブックフォルダに切り替える。フォルダ名は ququra-* 形式。
// 切り替え先のデータが bbolt でない・フォーマット不正の場合はエラーを返し、読み込みを中断する。
func (a *App) SwitchBook(bookFolder string) error {
	if bookFolder == "" {
		bookFolder = defaultBookFolder
	}
	if a.currentBook == bookFolder {
		return nil
	}
	newStore, err := newBoltStore(bookFolder)
	if err != nil {
		return err
	}
	// 切り替え先を開いたら Load で検証。壊れていればエラーを返して閉じ、現在のストアはそのまま
	data, loadErr := newStore.Load()
	if loadErr != nil {
		newStore.Close()
		return loadErr
	}
	// 空でないデータの構造は Load 内で検証済み。nil は空ブックで正常
	_ = data

	if a.store != nil {
		a.store.Close()
	}
	a.store = newStore
	a.currentBook = bookFolder
	return nil
}

// copyCurrentBookTo は現在のブックを ququra-book-{name} にコピーするだけ。現在のブックはそのまま。name は空白不可。
func (a *App) copyCurrentBookTo(name string) error {
	if a.store == nil {
		return fmt.Errorf("store not initialized")
	}
	suffix := sanitizeBookName(name)
	if suffix == "" {
		return fmt.Errorf("name is required")
	}
	folderName := "ququra-book-" + suffix
	baseDir, _ := getExeBaseDir()
	srcDir := filepath.Join(baseDir, a.currentBook)
	dstDir := filepath.Join(baseDir, folderName)
	if _, err := os.Stat(dstDir); err == nil {
		return fmt.Errorf("book already exists: %s", folderName)
	}
	return copyBookFolder(srcDir, dstDir)
}

// NewBook は現在のブックを指定名でコピーする（ququra-book-{name}）。現在のブックは空にしない。
func (a *App) NewBook(name string) error {
	return a.copyCurrentBookTo(name)
}

// ExportBook は現在のブックを指定名でコピーする（ququra-book-{name}）。現在のブックはそのまま。
func (a *App) ExportBook(name string) error {
	return a.copyCurrentBookTo(name)
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
