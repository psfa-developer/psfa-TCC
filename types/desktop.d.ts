/** EXE(Electron) 앱이 preload 로 주입하는 API. 일반 브라우저에서는 undefined 입니다. */
export interface TccDesktopApi {
  isDesktop: true;
  /** 기본 브라우저에서 Google 로그인 후 받은 토큰 */
  login: () => Promise<{ idToken: string | null; accessToken: string | null }>;
}

declare global {
  interface Window {
    tccDesktop?: TccDesktopApi;
  }
}
