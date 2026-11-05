const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000';
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test('가입 → 탐색 → 리뷰 → 캘린더 → 팔로우 → 공개 설정 → 리뷰 삭제', async ({ page, request }) => {
  const visibleText = (text: string | RegExp, options?: { exact: boolean }) =>
    page.getByText(text, options).filter({ visible: true });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '방자취', exact: true })).toBeVisible();
  await expect(visibleText('방을 탈출하고, 나만의 발자국을 남겨요.')).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/welcome-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '회원가입', exact: true }).click();
  const suffix = String(Date.now()).slice(-7);
  await page.getByLabel('닉네임', { exact: true }).fill('브라우저' + suffix);
  await page.getByLabel('전화번호', { exact: true }).fill('0108' + suffix);
  await page.getByLabel('비밀번호 (8자 이상)', { exact: true }).fill('browser-test-password');
  await page.getByRole('button', { name: '가입하고 시작하기' }).click();
  await expect(page.getByRole('tab', { name: '테마 검색', exact: true })).toBeVisible();
  await expect(visibleText('사라진 편지', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/explore-mobile.png', fullPage: true });
  const tab = page.getByRole('tab', { name: '마이페이지', exact: true });
  const box = await tab.boundingBox();
  expect(box!.y).toBeGreaterThan(700);
  await tab.click();
  await expect(visibleText('지금까지 0개의 발자국', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: '테마 검색', exact: true }).click();
  await page.getByRole('button', { name: /사라진 편지/ }).click();
  await expect(visibleText('플레이어들의 기록', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '이 테마 기록하기', exact: true }).click();
  await page.getByRole('button', { name: '평점 4.5점', exact: true }).click();
  await page.getByRole('button', { name: /^플레이 날짜 \d/ }).click();
  await page.getByRole('button', { name: '2026-11-01 선택', exact: true }).click();
  await expect(page.getByText('플레이 날짜 선택', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '5인+', exact: true }).click();
  await page.getByRole('button', { name: '힌트 수 늘리기', exact: true }).click();
  await page.getByLabel('남은 분', { exact: true }).fill('12');
  await page.getByLabel('남은 초', { exact: true }).fill('30');
  await expect(visibleText('테마 60분 · 플레이 시간 47분 30초')).toBeVisible();
  await page.screenshot({ path: 'test-results/review-inputs-mobile.png', fullPage: true });
  await page.getByLabel('발자국을 남겨주세요', { exact: true }).fill('인테리어가 인상 깊었어요.');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '사진 첨부', exact: true }).click();
  await (await chooser).setFiles('tests/fixtures/review-photo.png');
  await expect(visibleText('리뷰 사진 · 1/5', { exact: true })).toBeVisible();
  const savedReview = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/review/v1' && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: '발자국 남기기', exact: true }).click();
  expect(await (await savedReview).json()).toMatchObject({
    rating: 4.5,
    people_size: 5,
    hint_count: 1,
    played_time: 2850,
  });
  await expect(visibleText('지금까지 1개의 발자국', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '리뷰 사진 1 크게 보기' })).toBeVisible();
  await page.getByRole('tab', { name: '테마 검색', exact: true }).click();
  await expect(visibleText('✓ 플레이 완료', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: '마이페이지', exact: true }).click();
  await expect(visibleText('리뷰는 저장되었지만 키워드 분석을 완료하지 못했어요.')).toBeVisible();
  await page.getByRole('button', { name: '캘린더', exact: true }).click();
  await page.getByLabel('월 바로가기').fill('2026-11');
  await page.getByRole('button', { name: '이 달 보기', exact: true }).click();
  await expect(page.getByRole('button', { name: '1일, 기록 1개' })).toBeVisible();
  await page.screenshot({ path: 'test-results/calendar-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '뒤로', exact: true }).click();
  await page.getByRole('tab', { name: '피드', exact: true }).click();
  await page.getByLabel('닉네임 검색', { exact: true }).fill('테스트친구0');
  await page.getByRole('button', { name: '검색', exact: true }).click();
  await page.getByRole('button', { name: '테스트친구0', exact: true }).click();
  await expect(visibleText('팔로우가 승인되면 발자국을 볼 수 있어요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '캘린더', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '팔로우', exact: true }).click();
  await expect(visibleText('승인 대기 중', { exact: true })).toBeVisible();
  const login = await request.post(`${API}/user/v1/log-in`, {
    data: { phone_number: '01070000000', password: 'test-password' },
  });
  const headers = { Authorization: `Bearer ${(await login.json()).access_token}` };
  const incoming = await request.get(`${API}/follow/v1?direction=requests`, {
    headers,
  });
  const rid = (await incoming.json()).items[0].id;
  expect((await request.post(`${API}/follow/v1/${rid}/accept`, { headers })).ok()).toBeTruthy();
  const photoUpload = await request.post(`${API}/media/v1/review-photos`, {
    headers: { ...headers, 'Content-Type': 'application/octet-stream' },
    data: await readFile('tests/fixtures/review-photo.png'),
  });
  expect(photoUpload.status()).toBe(201);
  const friendPhoto = await photoUpload.json();
  const friendReviews = await request.get(`${API}/user/v1/me/reviews`, { headers });
  const friendReview = (await friendReviews.json()).items[0];
  expect(
    (
      await request.patch(`${API}/review/v1/${friendReview.id}`, {
        headers,
        data: { photo_ids: [friendPhoto.id] },
      })
    ).ok(),
  ).toBeTruthy();
  await page.getByRole('button', { name: '뒤로', exact: true }).click();
  await page.getByRole('button', { name: '테스트친구0', exact: true }).click();
  await page.getByRole('button', { name: '캘린더', exact: true }).click();
  await page.getByLabel('월 바로가기').fill('2026-11');
  await page.getByRole('button', { name: '이 달 보기', exact: true }).click();
  await expect(visibleText('테스트친구0님의 기록 · 1개', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '뒤로', exact: true }).click();
  await page.getByRole('button', { name: '뒤로', exact: true }).click();
  await page.getByLabel('닉네임 검색', { exact: true }).fill('');
  await page.getByRole('button', { name: '검색', exact: true }).click();
  await page.getByRole('button', { name: '새로고침', exact: true }).click();
  await expect(visibleText('테스트친구0', { exact: true })).toBeVisible();
  await expect(visibleText('이야기와 공간이 인상 깊었어요.', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(3);
  await page.getByRole('button', { name: '리뷰 사진 1 크게 보기' }).click();
  await expect(page.getByRole('img', { name: '리뷰 사진 확대' })).toBeVisible();
  await page.getByRole('button', { name: '사진 닫기' }).click();
  await page.screenshot({ path: 'test-results/feed-mobile.png', fullPage: true });
  await page.getByRole('tab', { name: '마이페이지', exact: true }).click();
  await page.getByRole('button', { name: '설정 및 로그아웃', exact: true }).click();
  await page.getByRole('button', { name: '비공개', exact: true }).first().click();
  await page.getByRole('button', { name: '설정 저장', exact: true }).click();
  await expect(visibleText('공개 설정을 저장했어요.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '뒤로', exact: true }).click();
  await page.getByRole('tab', { name: '마이페이지', exact: true }).click();
  await page.getByRole('button', { name: '내 리뷰 수정', exact: true }).click();
  await expect(page.getByLabel('남은 분', { exact: true })).toHaveValue('12');
  await expect(page.getByLabel('남은 초', { exact: true })).toHaveValue('30');
  await page.getByRole('button', { name: /^플레이 날짜 \d/ }).click();
  await page.getByRole('button', { name: '이전 달', exact: true }).click();
  await page.getByRole('button', { name: '2026-10-31 선택', exact: true }).click();
  await page.getByRole('button', { name: '수정한 기록 저장', exact: true }).click();
  await expect(visibleText(/사라진 편지 · 2026-10-31/)).toBeVisible();
  await page.getByRole('button', { name: '내 리뷰 수정', exact: true }).click();
  await page.getByRole('button', { name: '이 리뷰 삭제', exact: true }).click();
  await page.getByRole('button', { name: '리뷰 삭제 확정', exact: true }).click();
  await expect(visibleText('지금까지 0개의 발자국', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '설정 및 로그아웃', exact: true }).click();
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(page.getByRole('button', { name: '회원가입', exact: true })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(0);
  // A deep link to a main tab must still require login after logout.
  await page.goto('/me');
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.getByLabel('전화번호', { exact: true }).fill('0108' + suffix);
  await page.getByLabel('비밀번호', { exact: true }).fill('browser-test-password');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('tab', { name: '테마 검색', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
