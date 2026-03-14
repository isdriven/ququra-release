package main

import (
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"go.etcd.io/bbolt"
)

const (
	defaultBookFolder = "ququra-book-0"
	bucketName        = "app"
	dataKey           = "data"
	settingsKey       = "settings"
)

// AppData はフロントと共有するデータ構造
type AppData struct {
	Structure []NavItem           `json:"structure"`
	Content   map[string]string   `json:"content"`
	Meta      map[string]PageMeta `json:"meta"`
}

type NavItem struct {
	Type     string    `json:"type"`
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Children []NavItem `json:"children,omitempty"`
}

type PageMeta struct {
	HoverCounts map[string]int   `json:"hoverCounts"`
	TestResults []TestResultEntry `json:"testResults"`
}

type TestResultEntry struct {
	Score int    `json:"score"`
	Date  string `json:"date"`
}

// AppSettings は Option で保存する設定（bbolt に保存）
type AppSettings struct {
	NewlinePlaceholder string   `json:"newlinePlaceholder"`
	FontFamily         string   `json:"fontFamily"`
	FontSize           string   `json:"fontSize"`
	FontFamilyHistory  []string `json:"fontFamilyHistory"`
}

type boltStore struct {
	mu   sync.Mutex
	db   *bbolt.DB
	path string
}

// ensureDefaultBookFolder は ququra-book-0 が無ければ作成する。exe と同じディレクトリに作成する。
func ensureDefaultBookFolder() (string, error) {
	baseDir, err := getExeBaseDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(baseDir, defaultBookFolder)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}
	return dir, nil
}

func getExeBaseDir() (string, error) {
	execPath, err := os.Executable()
	if err != nil {
		return ".", nil
	}
	return filepath.Dir(execPath), nil
}

// listBookFolders は exe と同じディレクトリ内の ququra-* フォルダ名を返す。ququra-book-0 は必ず含める（無ければ自動作成）。
func listBookFolders() ([]string, error) {
	baseDir, err := getExeBaseDir()
	if err != nil {
		return nil, err
	}
	if _, err := ensureDefaultBookFolder(); err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(baseDir)
	if err != nil {
		return nil, err
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasPrefix(name, "ququra-") {
			names = append(names, name)
		}
	}
	sort.Strings(names)
	return names, nil
}

// newBoltStore は指定したブックフォルダ名（例: ququra-book-0）で bbolt ストアを開く。空の場合は defaultBookFolder を使う。
func newBoltStore(bookFolder string) (*boltStore, error) {
	if bookFolder == "" {
		bookFolder = defaultBookFolder
	}
	baseDir, err := getExeBaseDir()
	if err != nil {
		return nil, err
	}
	appDir := filepath.Join(baseDir, bookFolder)
	if err := os.MkdirAll(appDir, 0700); err != nil {
		return nil, err
	}
	path := filepath.Join(appDir, "data.bolt")
	db, err := bbolt.Open(path, 0600, nil)
	if err != nil {
		return nil, err
	}
	err = db.Update(func(tx *bbolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists([]byte(bucketName))
		return err
	})
	if err != nil {
		db.Close()
		return nil, err
	}
	return &boltStore{db: db, path: path}, nil
}

// copyBookFolder は src フォルダを dst フォルダに丸ごとコピーする。dst は存在してはいけない。
func copyBookFolder(srcDir, dstDir string) error {
	if err := os.MkdirAll(dstDir, 0700); err != nil {
		return err
	}
	entries, err := os.ReadDir(srcDir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		srcPath := filepath.Join(srcDir, e.Name())
		dstPath := filepath.Join(dstDir, e.Name())
		if e.IsDir() {
			if err := copyBookFolder(srcPath, dstPath); err != nil {
				return err
			}
			continue
		}
		if err := copyFile(srcPath, dstPath); err != nil {
			return err
		}
	}
	return nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

// sanitizeBookName はブック名をフォルダ名に使えるようにする。空白は不可なので空ならエラー用に空を返す。
func sanitizeBookName(name string) string {
	s := strings.TrimSpace(name)
	var b strings.Builder
	for _, r := range s {
		if r == '/' || r == '\\' || r == '.' || r == 0 {
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

var errBookCorrupt = errors.New("book corrupted")

func (s *boltStore) Load() (*AppData, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out *AppData
	err := s.db.View(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(bucketName))
		if b == nil {
			return nil
		}
		v := b.Get([]byte(dataKey))
		if len(v) == 0 {
			return nil
		}
		out = &AppData{
			Content: make(map[string]string),
			Meta:    make(map[string]PageMeta),
		}
		if err := json.Unmarshal(v, out); err != nil {
			return errBookCorrupt
		}
		if out.Structure == nil || !isValidStructure(out.Structure) {
			return errBookCorrupt
		}
		return nil
	})
	if err != nil {
		if err == errBookCorrupt {
			return nil, err
		}
		return nil, err
	}
	return out, nil
}

func isValidStructure(s []NavItem) bool {
	for i := range s {
		if s[i].Type != "page" && s[i].Type != "group" {
			return false
		}
		if s[i].Children != nil && !isValidStructure(s[i].Children) {
			return false
		}
	}
	return true
}

func (s *boltStore) Save(data *AppData) error {
	if data == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	raw, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return s.db.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(bucketName))
		if b == nil {
			return bbolt.ErrBucketNotFound
		}
		return b.Put([]byte(dataKey), raw)
	})
}

func (s *boltStore) LoadSettings() (*AppSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out *AppSettings
	err := s.db.View(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(bucketName))
		if b == nil {
			return nil
		}
		v := b.Get([]byte(settingsKey))
		if len(v) == 0 {
			return nil
		}
		out = &AppSettings{}
		return json.Unmarshal(v, out)
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (s *boltStore) SaveSettings(settings *AppSettings) error {
	if settings == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	raw, err := json.Marshal(settings)
	if err != nil {
		return err
	}
	return s.db.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(bucketName))
		if b == nil {
			return bbolt.ErrBucketNotFound
		}
		return b.Put([]byte(settingsKey), raw)
	})
}

// ResetData はデータ用バケットの data キーを削除し、DB を空にする。設定は残す。
func (s *boltStore) ResetData() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.db.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(bucketName))
		if b == nil {
			return nil
		}
		return b.Delete([]byte(dataKey))
	})
}

func (s *boltStore) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.db != nil {
		db := s.db
		s.db = nil
		return db.Close()
	}
	return nil
}
