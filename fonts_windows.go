//go:build windows

package main

import (
	"sort"
	"strings"

	"golang.org/x/sys/windows/registry"
)

func getSystemFonts() []string {
	seen := make(map[string]bool)
	var list []string

	// システム全体のフォント (HKLM)
	appendFontsFromKey(&list, seen, registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts`)
	// 自分で入れたフォント（現在のユーザーだけにインストールした分）(HKCU)
	appendFontsFromKey(&list, seen, registry.CURRENT_USER, `Software\Microsoft\Windows NT\CurrentVersion\Fonts`)

	if len(list) == 0 {
		return fallbackFontList()
	}
	sort.Strings(list)
	return list
}

func appendFontsFromKey(list *[]string, seen map[string]bool, root registry.Key, path string) {
	k, err := registry.OpenKey(root, path, registry.READ)
	if err != nil {
		return
	}
	defer k.Close()
	names, err := k.ReadValueNames(0)
	if err != nil {
		return
	}
	for _, n := range names {
		fontName := strings.TrimSpace(n)
		if idx := strings.IndexAny(fontName, "(&"); idx > 0 {
			fontName = strings.TrimSpace(fontName[:idx])
		}
		if fontName == "" || seen[fontName] {
			continue
		}
		seen[fontName] = true
		*list = append(*list, fontName)
	}
}
