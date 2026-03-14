//go:build !windows

package main

func getSystemFonts() []string {
	return fallbackFontList()
}
