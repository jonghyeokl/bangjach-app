# 방자취 앱

TypeScript / React Native / Expo SDK 58 / Expo Router. 방탈출 카페(1:N 테마)를 탐색하고 플레이를 기록한다. 빠르게 완성도 있는 1차 버전을 만드는 것이 목표다.

## 화면과 기능

- 로그인 전: 앱 제목·한 줄 설명과 회원가입/로그인 버튼이 있는 시작 화면.
- 로그인 후: 하단의 **테마 검색 / 피드 / 마이페이지** 탭. 탭 이동은 화면을 쌓거나 옆으로 밀지 않고 전환한다.
- 테마 탐색: 카페·테마명 검색, 복수 지역/장르, 난이도·공포도·활동성 범위, 보정 평점 등 정렬, 나와 일행이 안 한 테마.
- 상세: 테마 소개, 통계, 홈페이지 링크, 키워드 any/all·인원별 리뷰 필터.
- 기록: **평점과 플레이 날짜 필수**, 세부 점수·복수 장르·성공 여부·인원·힌트·소요 시간·본문은 선택. 기존 내 리뷰 수정/삭제.
- 마이페이지: 내 리뷰, 캘린더, 친구, 설정 및 로그아웃. 친구 화면에 친구 목록·닉네임 검색/요청·받은 요청 수락/거절·보낸 요청 취소·친구 해제를 모았다.
- 피드: 수락된 친구들의 리뷰만 작성 시각 최신순. 닉네임·평점·테마명/사진·리뷰 사진·본문 표시. 테마 상세 이동, 사진 확대, 새로고침·페이지 이동.
- 리뷰 사진: 작성·수정 시 최대 5장, 장당 8MB 이하 JPEG/PNG/WebP 첨부·제거. 사진 업로드 후 리뷰 저장 시 공개되며 저장 실패 시 재시도할 수 있다. 운영 사진 저장소 설정은 [백엔드 배포 문서](../bangjach/docs/deployment.md)를 따른다.
- 캘린더·일행 검색 공개 설정(기본 친구만), 가입/로그인/로그아웃.

리뷰 자체와 플레이 날짜는 항상 공개된다. 사용자·테마당 리뷰 하나이며 삭제하면 플레이 완료 기록도 삭제된다. 테마 통계는 일별 갱신이고 항목별 입력자 3명 미만이면 점수 대신 집계 전으로 표시한다.

## 실행

Node 22.13 이상(22.x), Expo Go SDK 58 기준.

```bash
cd /Users/jonghyeok/bangjach/bangjach-app
source ../dev-env.sh
npx expo start --clear
```

컴퓨터와 휴대폰을 같은 Wi-Fi에 연결하고 QR 코드를 스캔한다. SDK 변경 후에는 기존 Expo 서버를 종료하고 다시 실행한다. 새로 복제한 환경에서는 먼저 `npm ci` 후 `.env.example`을 참고해 `.env`를 만든다.

운영 API 연결:

```env
EXPO_PUBLIC_API_URL=https://bangjach-api-192693215385.asia-northeast3.run.app
```

운영 API를 사용하면 로컬 백엔드·DB 프록시는 필요 없다. 가입·리뷰 등은 운영 DB에 저장된다. 로컬 백엔드를 사용할 때만 API를 별도 실행하고, 휴대폰에서는 PC의 LAN IP를 API 주소로 설정한다.

`npm run ios`, `npm run android`, `npm run web`도 사용할 수 있다. 시뮬레이터·에뮬레이터는 별도 설치가 필요하다. 웹 출처가 바뀌면 백엔드 `CORS_ORIGINS`도 수정한다.

## 인증과 오류 처리

회원가입 성공 후 자동으로 로그인한다. iOS/Android는 Expo SecureStore에 세션을 저장하고, 앱 재실행 시 저장된 refresh token을 확인·갱신한 뒤 메인 화면을 연다. 토큰이 만료·폐기되면 시작 화면으로 돌아가며, 일시적인 네트워크 오류만으로 저장된 로그인을 삭제하지 않는다. 웹은 메모리 저장이므로 새로고침하면 다시 로그인한다.

로그아웃은 **마이페이지 → 설정 및 로그아웃 → 로그아웃**에서 실행한다. 서버 세션 폐기를 요청하고 기기의 저장된 세션도 삭제한다. 로그아웃 후에는 메인 화면 주소로 직접 접근해도 시작 화면으로 이동한다.

LLM 분석 키 미설정 또는 실패 시에도 리뷰는 저장된다. 해당 리뷰에 분석 미완료 상태를 표시하며 키워드 필터에는 포함되지 않는다.

## 검사

```bash
npm run typecheck
npm run lint
npm run test:auth
npx expo export --platform web
```

브라우저 통합 검증은 백엔드가 localhost:8000에서 실행 중이어야 한다. 운영 DB 대신 backend README의 로컬 테스트 PostgreSQL을 준비하고 `python -m tests.seed_e2e`로 가상 데이터를 넣는다. 그 후:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright가 localhost:8081의 Expo 웹을 시작하고 모바일 폭에서 시작 화면 → 회원가입·자동 로그인 → 하단 탭 → 사진 첨부·리뷰·캘린더·친구·피드·공개 설정 → 리뷰 수정/삭제 → 로그아웃·재로그인을 검증한다. 테스트 데이터는 실제 초기 데이터와 별개다. test-results에는 화면 캡처/실패 추적 자료를 저장하며 Git에 포함하지 않는다.

2026-11-02 SDK 58 업데이트: Expo 58.0.22, React 19.3.0, React Native 0.88.1로 맞췄다. [공식 업그레이드 안내](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)를 참고했다. 삭제된 앱 설정을 제거하고 리뷰·설정·캘린더의 폼 초기화를 새 검사 기준에 맞췄다.

- Expo Doctor 20/20, 의존성 호환성 검사, 타입 검사·린트 통과.
- 웹·iOS·Android용 JS/Hermes 번들 생성 및 별도 로컬 테스트 DB에서 위 브라우저 통합 시나리오 통과.
- 로그인 유지 테스트 5개 통과: SecureStore를 모의한 앱 재시작·토큰 갱신·만료·오프라인·로그아웃 검증.
- iOS·Android 실기기 재실행 동작과 네이티브 설치 빌드·스토어 출시는 아직 미검증.
- 설치 시 npm audit: 보통 등급 24개. 별도 의존성 보안 점검이 필요하다.


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

가상 테스트 데이터로 캡처한 모바일 폭 화면: [시작 화면](docs/screenshots/welcome-mobile.png), [테마 탐색](docs/screenshots/explore-mobile.png), [캘린더](docs/screenshots/calendar-mobile.png), [친구 피드](docs/screenshots/feed-mobile.png).

사진 선택은 [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)를 사용한다. 실제 휴대폰의 사진 접근 및 네이티브 업로드는 별도 확인이 필요하다.

2026-11-02 피드·사진 추가 검증: 타입·린트·로그인 유지 테스트 통과, 웹/iOS/Android 번들 생성 및 사진 첨부 → 친구 피드 → 사진 확대 브라우저 시나리오 통과. 운영 저장소는 후속 배포에서 설정·검증 완료. 실기기 사진 선택은 미검증.


## 배포 상태 (2026-11-02)

운영 API에 친구 피드·사진 업로드를 배포하고 실제 저장까지 확인했다. 앱 소스도 `main`에 push했다. Expo Go에서 최신 코드를 열어 실기기 사진 선택·로그인 유지를 확인한다. App Store/Play Store 배포는 아직 하지 않았다.
앞으로 작업 완료 후 검사·commit·push하고, 커밋 제목은 `feat/short summary`, `fix/short summary`처럼 짧은 영어로 작성한다(`AGENTS.md`).
