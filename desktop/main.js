// TCC 수입원가계산기 — Electron 메인 프로세스
// 화면은 배포된 웹(Vercel) 주소를 그대로 띄우고, Google 로그인만 기본 브라우저에서 처리합니다.
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const http = require("node:http");
const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
  } catch {
    return {};
  }
}
const APP_URL = (process.env.TCC_URL || readConfig().appUrl || "https://psfa-tcc.vercel.app").replace(/\/+$/, "");
const APP_ORIGIN = new URL(APP_URL).origin;
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

let win = null;
let pendingLogin = null; // { server, timer, reject }

/* ---------- 단일 실행 ---------- */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    title: "TCC 수입원가계산기",
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: "#f4f4f5",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.loadURL(APP_URL);

  // 연결 실패 시 안내 화면
  win.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 = 사용자 취소/리다이렉트
    win.loadFile(path.join(__dirname, "offline.html"), { query: { retry: url && url.startsWith(APP_ORIGIN) ? url : APP_URL } });
  });

  // 새 창은 열지 않고, 외부 주소는 기본 브라우저로
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  // 앱 주소 밖으로 이동하려 하면 기본 브라우저로 넘김
  win.webContents.on("will-navigate", (e, url) => {
    if (url.startsWith(APP_ORIGIN) || url.startsWith("file:")) return;
    e.preventDefault();
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  });

  win.on("closed", () => {
    win = null;
  });
}

/* ---------- 외부 브라우저 Google 로그인 ---------- */
// 1) 이 PC에서만 접근 가능한 127.0.0.1 임시 서버를 열고
// 2) 기본 브라우저로 웹의 /desktop-login 페이지를 열어 Google 로그인
// 3) 로그인 페이지가 토큰을 http://127.0.0.1:<port>/callback 으로 넘기면 앱 화면에 전달
function cancelPendingLogin(reason) {
  if (!pendingLogin) return;
  clearTimeout(pendingLogin.timer);
  pendingLogin.server.close();
  pendingLogin.reject(new Error(reason));
  pendingLogin = null;
}

const DONE_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>TCC 로그인 완료</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f4f5;font-family:"Malgun Gothic",system-ui,sans-serif;color:#18181b}
.c{background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:32px;text-align:center;max-width:360px}
.i{width:44px;height:44px;border-radius:50%;background:#f0fdf4;color:#15803d;display:grid;place-items:center;margin:0 auto 14px;font-size:22px}
h1{font-size:18px;margin:0 0 8px}p{font-size:13.5px;color:#52525b;margin:0}</style></head>
<body><div class="c"><div class="i">✓</div><h1>로그인되었습니다</h1><p>이 탭을 닫고 TCC 앱으로 돌아가세요.</p></div>
<script>setTimeout(function(){window.close()},1200)</script></body></html>`;

ipcMain.handle("tcc:login", (event) => {
  // 앱 화면에서 온 요청만 처리
  if (!event.senderFrame || !event.senderFrame.url.startsWith(APP_ORIGIN)) {
    throw new Error("허용되지 않은 요청입니다.");
  }
  cancelPendingLogin("새 로그인 요청으로 이전 요청이 취소되었습니다.");

  return new Promise((resolve, reject) => {
    const state = crypto.randomBytes(24).toString("base64url");
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, "http://127.0.0.1");
      if (req.method !== "GET" || u.pathname !== "/callback" || u.searchParams.get("state") !== state) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(DONE_HTML);

      const idToken = u.searchParams.get("idToken");
      const accessToken = u.searchParams.get("accessToken");
      clearTimeout(pendingLogin && pendingLogin.timer);
      pendingLogin = null;
      server.close();
      if (win) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
      resolve({ idToken, accessToken });
    });

    server.on("error", (err) => {
      cancelPendingLogin("로그인용 임시 서버를 열지 못했습니다: " + err.message);
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      const timer = setTimeout(() => cancelPendingLogin("로그인 시간이 초과되었습니다. 다시 시도해 주세요."), LOGIN_TIMEOUT_MS);
      pendingLogin = { server, timer, reject };
      const loginUrl = `${APP_URL}/desktop-login?port=${port}&state=${state}`;
      shell.openExternal(loginUrl).catch((err) => cancelPendingLogin("브라우저를 열지 못했습니다: " + err.message));
    });
  });
});

/* ---------- 메뉴 (Alt 키로 표시) ---------- */
function buildMenu() {
  const template = [
    {
      label: "파일",
      submenu: [
        { label: "인쇄", accelerator: "CmdOrCtrl+P", click: () => win && win.webContents.print() },
        { type: "separator" },
        { label: "종료", role: "quit" },
      ],
    },
    {
      label: "보기",
      submenu: [
        { label: "새로고침", accelerator: "F5", click: () => win && win.webContents.reload() },
        { label: "처음 화면으로", click: () => win && win.loadURL(APP_URL) },
        { type: "separator" },
        { label: "확대", role: "zoomIn" },
        { label: "축소", role: "zoomOut" },
        { label: "원래 크기", role: "resetZoom" },
        { type: "separator" },
        { label: "전체 화면", role: "togglefullscreen" },
        { label: "개발자 도구", accelerator: "F12", role: "toggleDevTools" },
      ],
    },
    {
      label: "도움말",
      submenu: [
        { label: "웹 브라우저에서 열기", click: () => shell.openExternal(APP_URL) },
        {
          label: "버전 정보",
          click: () =>
            dialog.showMessageBox(win, {
              type: "info",
              title: "TCC 수입원가계산기",
              message: `TCC 수입원가계산기 v${app.getVersion()}`,
              detail: `연결 주소: ${APP_URL}`,
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
});

app.on("window-all-closed", () => {
  cancelPendingLogin("앱이 종료되었습니다.");
  app.quit();
});
