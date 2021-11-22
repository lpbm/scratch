//go:build prod
// +build prod

package assets

import (
	"bytes"
	"fmt"
	"html/template"
	"mime"
	"net/http"
	"path"
	"path/filepath"
)

type Contents map[string][]byte

func (a Maps) Open(name string) (fs.File, error) {
	return assets.Open(name)
}

func writeAsset(s Maps) func(http.ResponseWriter, *http.Request) {
	assetContents := make(Contents)
	return func(w http.ResponseWriter, r *http.Request) {
		asset := filepath.Clean(r.URL.Path)
		ext := path.Ext(r.RequestURI)
		mimeType := mime.TypeByExtension(ext)
		files, ok := s[asset]
		if !ok {
			w.Write([]byte("not found"))
			w.WriteHeader(http.StatusNotFound)
			return
		}

		cont, ok := assetContents[asset]
		if !ok {
			buf := bytes.Buffer{}
			for _, file := range files {
				if piece, _ := getFileContent(assetPath(file)); len(piece) > 0 {
					buf.Write(piece)
				}
			}
			assetContents[asset] = buf.Bytes()
		}
		cont = assetContents[asset]

		w.Header().Set("Cache-Control", fmt.Sprintf("public,max-age=%d", int(year.Seconds())))
		w.Header().Set("Content-Type", mimeType)
		w.Write(cont)
	}
}

func assetLoad(a Maps) func(string) template.HTML {
	assetContents := make(Contents)
	return func(name string) template.HTML {
		cont, ok := assetContents[name]
		if !ok {
			cont, _ = getFileContent(assetPath(name))
			assetContents[name] = cont
		}
		return template.HTML(cont)
	}
}
