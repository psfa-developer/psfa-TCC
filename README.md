# Trade Cost Calculator (TCC)

수입 건별로 상품·부대비용·수입부가세를 입력하면 **품목별 개당 매입가**와 **필요자금**을 계산하는 웹앱입니다.
Next.js 15 (App Router) + TypeScript, Firebase Auth / Firestore, Vercel 배포 기준입니다.

## 1. 처음 실행하기 (PC)

Node.js 20 이상이 필요합니다. (https://nodejs.org 에서 LTS 설치)

```bash
git clone https://github.com/psfa-developer/psfa-TCC.git
cd psfa-TCC
npm install
npm test        # 계산 엔진 테스트 (CSE260666 실적으로 검증)
npm run dev     # http://localhost:3000
```

Firebase 설정(psfa-meeting)은 `lib/firebase.ts`에 기본값으로 들어 있어 따로 설정할 필요가 없습니다.
다른 Firebase 프로젝트를 쓰려면 `.env.local`에 `NEXT_PUBLIC_FIREBASE_*` 값을 넣으면 그 값이 우선합니다.

## 2. Firebase 콘솔에서 한 번만 할 일 (psfa-meeting 프로젝트)

1. **Authentication → Sign-in method → Google** 사용 설정
2. **Authentication → Settings → 승인된 도메인**에 Vercel 주소 추가 (예: `tcc-app.vercel.app`). `localhost`는 기본 포함
3. **Firestore Database** 만들기 (아직 없다면, 위치 `asia-northeast3` 서울 권장)
4. **Firestore → 규칙**에 `firestore.rules` 내용을 붙여넣고 게시
   - 기존 psfa-meeting 앱이 쓰는 규칙이 있다면 지우지 말고 `match /users/{uid}/shipments/{shipmentId}` 블록만 추가하세요.

## 3. Vercel 배포

1. 이 폴더를 GitHub 저장소로 올립니다.
2. Vercel → Add New Project → 저장소 선택 (Framework: Next.js 자동 인식)
3. Deploy (환경변수는 선택 — 넣지 않으면 기본값 사용)
4. 배포 후 생성된 도메인을 Firebase 승인된 도메인에 추가

## 구조

```
app/
  page.tsx                 수입 건 목록 (새로 만들기 · 예시 불러오기 · 복제 · 삭제)
  shipments/[id]/page.tsx  편집 화면 (자동 저장 · 인쇄 · 엑셀 다운로드)
  globals.css              디자인 토큰 · 다크모드 · 인쇄 스타일
components/
  Editor.tsx               ① 상품 ② 부대비용 ③ 설정
  SummaryPanel.tsx         실시간 요약 (총 매입가 · 개당 매입가 · 정산서 대조)
  ui.tsx                   NumInput · Seg · Select · Toggle · Icon
lib/
  calc.ts                  계산 엔진 (순수 함수, UI와 분리)
  money.ts                 정확한 10진 계산 (BigInt) · 배분
  calc.test.ts             CSE260666 검증 테스트
  sample.ts                CSE260666 예시 데이터 · 빈 수입 건 템플릿
  shipments.ts             Firestore CRUD (users/{uid}/shipments)
  excel.ts                 원가 계산서 .xlsx 내보내기 (ExcelJS)
firestore.rules            보안 규칙 (본인 데이터만 접근)
```

## 계산 규칙

| 항목 | 규칙 |
|---|---|
| 외화 환산 | 금액 × 환율을 정확히 계산 후 **행 단위 원 반올림** (650 × 1,677.77 = 1,090,551) |
| 과세 + 공급가 입력 | VAT = 공급가 × 10% (원 미만 절사) |
| 과세 + 합계 입력 | 공급가 = 합계 ÷ 1.1 (반올림), VAT = 합계 − 공급가 |
| 면세 | VAT 0 |
| 과세가격 | 상품(통관 환율) + "과세가격" 체크한 비용(운임·EXW·보험), 원 미만 절사 |
| 관세 · 수입부가세 | 10원 미만 절사. 세관 고지액 모드에서는 입력값을 상품금액 비율로 배분 |
| 부대비 배분 | 상품금액 비율(기본) 또는 수량 비율, 합계가 정확히 맞도록 최대 잔여법 |
| 개당 매입가 | (상품대금 + 배분 부대비 + 관세 [+ VAT 미공제 시 VAT]) ÷ 갯수 |
| 보수적 단가 | 개당 매입가 × (1 + 가산율), 설정 단위로 올림 |

## 검증 (CSE260666, 송금 환율 1,711원 가정)

- 정산서 총액 14,280,004원 = 부대비 공급가 5,966,594 + VAT 198,910 + 수입부가세 8,114,500 → **차이 0원**
- 수입부가세 자동 계산: 과세가격 81,145,030원 × 10% = **8,114,500원** (세관 고지액과 일치)
- 개당 매입가: 500ml **5,371원** (보수적 5,700원), 100ml **1,987원** (보수적 2,100원)
