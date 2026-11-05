const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000';
import { test, expect } from '@playwright/test';

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'wait' });
});
const themeId = '00000000-0000-0000-0000-000000000001';

test('테마 보정 평점, 통계 숨김, 단일 키워드와 인원 즉시 필터', async ({ page }) => {
  let populated = true;
  await page.route(`**/theme/v1/${themeId}`, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    Object.assign(body.statistics, {
      avg_rating: 1,
      normalized_rating: populated ? 4.25 : null,
      avg_difficulty: null,
      avg_horrorness: null,
      avg_physicality: null,
      most_genre_list: null,
    });
    await route.fulfill({ response, json: body });
  });
  await page.goto('/login');
  await page.getByLabel('전화번호', { exact: true }).fill('01079999999');
  await page.getByLabel('비밀번호', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.getByRole('button', { name: /사라진 편지/ }).click();
  await expect(page.getByText('보정 평점', { exact: true })).toBeVisible();
  await expect(page.getByText('4.25', { exact: true })).toBeVisible();
  await expect(page.getByText('평점', { exact: true })).toHaveCount(0);
  await expect(page.getByText('난이도', { exact: true })).toHaveCount(0);
  await expect(page.getByText('장르 투표를 기다리고 있어요.')).toHaveCount(0);
  await expect(page.getByText(/통계는 매일/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /키워드.*포함|오래된 순|최신 순/ })).toHaveCount(0);
  const query = (keyword: string, people?: string) =>
    page.waitForRequest((r) => {
      const url = new URL(r.url());
      return (
        url.pathname === '/review/v1' &&
        url.searchParams.getAll('keyword').join(',') === keyword &&
        url.searchParams.get('sort') === 'newest' &&
        (!people || url.searchParams.get('people_size') === people)
      );
    });
  let pending = query('1');
  await page.getByRole('button', { name: /^인테리어 \d/ }).click();
  await pending;
  // Keyword 2 replaces keyword 1 instead of adding a second selection.
  pending = query('2');
  const enums = await (await page.request.get(`${API}/meta/v1/enums`)).json();
  await page
    .getByRole('button', { name: new RegExp(`^${enums.review_keyword[1].label} \\d`) })
    .click();
  await pending;
  pending = query('2', '5');
  await page.getByRole('button', { name: '5인+', exact: true }).click();
  await pending;
  await page.screenshot({ path: 'test-results/theme-review-filters.png', fullPage: true });
  populated = false;
  await page.getByRole('button', { name: '뒤로', exact: true }).click();
  await page.getByRole('button', { name: /사라진 편지/ }).click();
  await expect(page.getByText('플레이어들의 기록')).toBeVisible();
  await expect(page.getByText('보정 평점', { exact: true })).toHaveCount(0);
});

test('리뷰 기본 오늘, 반점 평가, 힌트 하한과 남은 시간 검증', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('전화번호', { exact: true }).fill('01079999999');
  await page.getByLabel('비밀번호', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('tab', { name: '테마 검색', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /사라진 편지/ }).click();
  await page.getByRole('button', { name: '이 테마 기록하기', exact: true }).click();
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await expect(
    page.getByRole('button', { name: `플레이 날짜 ${today}`, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '힌트 수 줄이기', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '평점 4.5점', exact: true }).click();
  await page.getByRole('button', { name: '난이도 2.5점', exact: true }).click();
  await page.getByRole('button', { name: '공포도 1.5점', exact: true }).click();
  await page.getByRole('button', { name: '활동성 3.5점', exact: true }).click();
  await page.getByLabel('남은 분', { exact: true }).fill('61');
  await page.getByRole('button', { name: '발자국 남기기', exact: true }).click();
  await expect(
    page.getByText('남은 시간이 테마 전체 시간보다 길 수 없어요.').first(),
  ).toBeVisible();
  await page.getByLabel('남은 분', { exact: true }).fill('0');
  await page.getByLabel('남은 초', { exact: true }).fill('60');
  await expect(page.getByText('남은 초는 0~59로 입력해주세요.')).toBeVisible();
  await page.getByLabel('남은 초', { exact: true }).fill('0');
  await expect(page.getByText('테마 60분 · 플레이 시간 60분 00초')).toBeVisible();
  await page.getByRole('button', { name: '평점 4.5점', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/review-score-mobile.png', fullPage: true });
  await page.getByRole('button', { name: `플레이 날짜 ${today}`, exact: true }).click();
  await expect(page.getByText('플레이 날짜 선택', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'test-results/review-calendar-mobile.png',
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '오늘 선택', exact: true }).click();
});
