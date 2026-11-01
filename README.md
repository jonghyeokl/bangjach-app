# 방자취 앱

TypeScript / React Native / Expo SDK 54 / Expo Router. 방탈출 카페(1:N 테마)를 탐색하고 플레이를 기록한다. 빠르게 완성도 있는 1차 버전을 만드는 것이 목표다.

## 화면과 기능

- 테마 탐색: 카페·테마명 검색, 복수 지역/장르, 난이도·공포도·활동성 범위, 보정 평점 등 정렬, 나와 일행이 안 한 테마.
- 상세: 테마 소개, 통계, 홈페이지 링크, 키워드 any/all·인원별 리뷰 필터.
- 기록: **평점과 플레이 날짜 필수**, 세부 점수·복수 장르·성공 여부·인원·힌트·소요 시간·본문은 선택. 기존 내 리뷰 수정/삭제.
- 내 기록, 친구 검색/요청/수락/거절/취소/해제, 월별 캘린더와 친구 캘린더.
- 캘린더·일행 검색 공개 설정(기본 친구만), 가입/로그인/로그아웃.

리뷰 자체와 플레이 날짜는 항상 공개된다. 사용자·테마당 리뷰 하나이며 삭제하면 플레이 완료 기록도 삭제된다. 테마 통계는 일별 갱신이고 항목별 입력자 3명 미만이면 점수 대신 집계 전으로 표시한다.

## 실행

Node 22. 로컬 상위 작업 폴더에서는 `source ../dev-env.sh`로 설치된 Node를 사용한다.

```bash
npm ci
# 처음 복제했을 때만 복사; 기존 .env를 덮어쓰지 않는다.
cp .env.example .env
npm start
```

`npm run ios`, `npm run android`, `npm run web`도 사용할 수 있다. 백엔드가 먼저 실행되고 마이그레이션이 적용되어 있어야 한다. `EXPO_PUBLIC_API_URL`은 API 루트 URL이다. 이전 환경설정의 `/api/v1` 접미사는 호환을 위해 제거한다.

실기기는 localhost 대신 PC의 LAN IP를 사용한다. 웹 출처가 바뀌면 백엔드 CORS_ORIGINS도 수정한다. 환경변수 변경 후 앱 번들을 다시 빌드한다.

## 인증과 오류 처리

iOS/Android는 Expo SecureStore에 토큰을 저장한다. 웹은 메모리 저장으로 새로고침하면 다시 로그인한다. 만료된 액세스 토큰은 한 번에 한 요청만 갱신하며 실패하면 로그인 화면으로 다시 진입할 수 있다. 로그인/리뷰/친구 변경은 오류와 재시도 안내를 표시하고 삭제는 확인 절차를 거친다.

LLM 분석 키 미설정 또는 실패 시에도 리뷰는 저장된다. 해당 리뷰에 분석 미완료 상태를 표시하며 키워드 필터에는 포함되지 않는다.

## 검사

```bash
npm run typecheck
npm run lint
npx expo export --platform web
```

브라우저 통합 검증은 백엔드가 localhost:8000에서 실행 중이어야 한다. 운영 DB 대신 backend README의 로컬 테스트 PostgreSQL을 준비하고 `python -m tests.seed_e2e`로 가상 데이터를 넣는다. 그 후:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright가 localhost:8081의 Expo 웹을 시작하고 모바일 폭에서 가입 → 테마 탐색 → 리뷰 작성 → 월별 캘린더 → 친구 요청/수락 → 공개 설정 → 리뷰 수정/삭제를 검증한다. 테스트 데이터는 실제 초기 데이터와 별개다. test-results에는 화면 캡처/실패 추적 자료를 저장하며 Git에 포함하지 않는다.

2026-11-02 타입 검사·린트, 웹·iOS·Android용 JS/Hermes 번들 생성과 위 브라우저 통합 시나리오가 통과했다. Expo 호환성을 위해 react=19.1.0, react-native=0.81.5를 overrides로 통일하여 중복 React Native를 제거했다. 웹 검증은 iOS/Android 실기기 검증을 대신하지 않는다. 앱 설치 빌드·스토어 제출·운영 API 배포는 아직 수행하지 않았다. 최종 npm audit에는 59개(낮음 1, 보통 53, 높음 5)의 의존성 경고가 남아 있다. 해결을 위한 SDK/도구 체인 업그레이드는 별도 작업이다.

## 주요 파일

- app/: 화면과 경로
- components/ui.tsx: 공통 입력·버튼·카드·목록·오류 UI
- lib/api.ts: API 호출, 토큰 저장/갱신, 오류 변환
- lib/hooks.ts: 화면 재진입 갱신 및 오래된 응답 무시
- lib/session.tsx: 로그인 상태
- lib/types.ts: API 응답 타입
- tests/e2e/: 브라우저 통합 시나리오

[확정 구현 계획](https://www.notion.so/40b605e41f1d8081836dc070bbcb830c)

## 검증 화면

가상 테스트 데이터로 캡처한 모바일 폭 화면: [테마 탐색](docs/screenshots/explore-mobile.png), [캘린더](docs/screenshots/calendar-mobile.png).
