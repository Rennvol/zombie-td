package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

//go:embed static
var staticFS embed.FS

var db *sql.DB

func main() {
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		log.Fatal("DB_DSN kosong")
	}
	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("db open:", err)
	}
	db.SetMaxOpenConns(10)
	if err := db.Ping(); err != nil {
		log.Fatal("db ping:", err)
	}
	migrate()

	port := os.Getenv("PORT")
	if port == "" {
		port = "30513"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", handleHealth)
	mux.HandleFunc("POST /api/register", handleRegister)
	mux.HandleFunc("POST /api/login", handleLogin)
	mux.HandleFunc("GET /api/me", requireAuth(handleMe))
	sub, _ := fs.Sub(staticFS, "static")
	mux.Handle("/", http.FileServer(http.FS(sub)))

	log.Printf("zombie-td listen :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

// ---------- helpers ----------

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]any{"error": msg})
}

// ---------- migrate ----------

func migrate() {
	db.Exec(`CREATE TABLE IF NOT EXISTS users (
		id BIGINT AUTO_INCREMENT PRIMARY KEY,
		username VARCHAR(32) NOT NULL UNIQUE,
		pass_hash VARCHAR(255) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS players (
		id BIGINT AUTO_INCREMENT PRIMARY KEY,
		user_id BIGINT NOT NULL UNIQUE,
		gold BIGINT NOT NULL DEFAULT 0,
		data LONGTEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS sessions (
		token VARCHAR(64) PRIMARY KEY,
		user_id BIGINT NOT NULL,
		expires_at TIMESTAMP NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id)
	)`)
}

// ---------- auth ----------

func handleRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, 400, "bad json")
		return
	}
	if len(req.Username) < 3 || len(req.Username) > 32 {
		writeErr(w, 400, "username 3-32 karakter")
		return
	}
	if len(req.Password) < 6 {
		writeErr(w, 400, "password minimal 6 karakter")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeErr(w, 500, "hash error")
		return
	}
	res, err := db.Exec(`INSERT INTO users(username, pass_hash) VALUES(?,?)`, req.Username, string(hash))
	if err != nil {
		writeErr(w, 409, "username sudah dipakai")
		return
	}
	uid, _ := res.LastInsertId()
	defaultData := `{"gold":0,"stage_open":1,"stars":{},"upgrades":{},"heroes":[],"towers":[]}`
	db.Exec(`INSERT INTO players(user_id, gold, data) VALUES(?,0,?)`, uid, defaultData)
	writeJSON(w, 200, map[string]any{"ok": true})
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, 400, "bad json")
		return
	}
	var uid int64
	var hash string
	err := db.QueryRow(`SELECT id, pass_hash FROM users WHERE username=?`, req.Username).Scan(&uid, &hash)
	if err == sql.ErrNoRows {
		writeErr(w, 401, "username/password salah")
		return
	}
	if err != nil {
		writeErr(w, 500, "db error")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil {
		writeErr(w, 401, "username/password salah")
		return
	}
	token := newSession(uid)
	writeJSON(w, 200, map[string]any{"token": token, "username": req.Username})
}

func newSession(uid int64) string {
	b := make([]byte, 32)
	rand.Read(b)
	token := fmt.Sprintf("%x", b)
	db.Exec(`INSERT INTO sessions(token, user_id, expires_at) VALUES(?,?,NOW()+INTERVAL 30 DAY)`, token, uid)
	return token
}

func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		var uid int64
		err := db.QueryRow(`SELECT user_id FROM sessions WHERE token=? AND expires_at>NOW()`, token).Scan(&uid)
		if err != nil {
			writeErr(w, 401, "silahkan login")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), "uid", uid)))
	}
}

func uidOf(r *http.Request) int64 {
	uid, _ := r.Context().Value("uid").(int64)
	return uid
}

// ---------- handlers ----------

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]any{"ok": true, "ts": time.Now().Unix()})
}

func handleMe(w http.ResponseWriter, r *http.Request) {
	uid := uidOf(r)
	var username string
	var gold int64
	var data string
	err := db.QueryRow(`SELECT u.username, p.gold, p.data FROM users u JOIN players p ON p.user_id=u.id WHERE u.id=?`, uid).
		Scan(&username, &gold, &data)
	if err != nil {
		writeErr(w, 404, "player not found")
		return
	}
	writeJSON(w, 200, map[string]any{
		"username": username,
		"gold":     gold,
		"state":    json.RawMessage(data),
	})
}

var _ = time.Now
