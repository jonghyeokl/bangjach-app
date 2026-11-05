# 빠방 테마 100개 수집·DB 등록

JSON 다운로드까지는 수동, 이후 사진 다운로드·업로드·카페/테마 DB 등록은 명령어로 처리한다.

## 1. JSON 다운로드

```sh
cd /Users/jonghyeok/bangjach/bangjach-app
source ../dev-env.sh
npm run collect:bbabang -- --output test-data/bbabang/collector
pbcopy < test-data/bbabang/collector/collector.js
```

1. Chrome에서 빠방 페이지를 새로고침한다.
2. 개발자 도구 → Sources → Snippets에 복사한 코드를 붙여넣고 실행한다.
3. **전국 / 예약 가능 OFF / 안 한 테마 OFF**로 설정한다. 정렬을 다른 항목으로 바꿨다가 **추천도 높은 순**으로 바꾼다.
4. **100개 JSON 저장**을 눌러 `~/Downloads/bbabang-top100.json`으로 저장한다. 광고 슬롯은 제외하고 빠방의 응답 순서대로 저장한다.

## 2. DB 연결

백엔드 `.env`의 `DATABASE_URL=sqlite+aiosqlite:///./data/bangjach.db`를 사용한다. 별도 DB 서버 시작은 필요 없다.

## 3. 사진 처리·DB 등록

1번 터미널에서 실행한다. 백엔드 `.env`의 DB에 실제 등록된다.

```sh
cd /Users/jonghyeok/bangjach/bangjach-app
source ../dev-env.sh
npm run collect:bbabang -- --input ~/Downloads/bbabang-top100.json --import-db --apply --local-photos
```

- 기존 테마는 건너뛰고, 필수 정보 누락·사진 오류가 있으면 등록을 중단한다.
- 결과는 출력된 폴더의 `import-report.json`에서 확인한다.
