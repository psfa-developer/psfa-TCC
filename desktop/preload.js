// 웹 화면(Next.js)에 데스크톱 전용 API만 최소한으로 노출합니다.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tccDesktop", {
  isDesktop: true,
  login: () => ipcRenderer.invoke("tcc:login"),
});
