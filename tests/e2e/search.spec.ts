import { test, expect } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000';
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'wait' });
});

test('검색 상단, 2단계 지역 선택과 취소, 즉시 검색·정렬·초기화', async ({ page, request }) => {
  const meta = await (await request.get(`${API}/meta/v1/enums`)).json();
  let latest = new URL('http://localhost');
  await page.route('**/theme/v1?*', async (route) => {
    latest = new URL(route.request().url());
    const response = await route.fetch();
    const body = await response.json();
    // Stable list length exercises pagination even when the test database is small.
    const sample = await (
      await request.get(`${API}/theme/v1/00000000-0000-0000-0000-000000000001`)
    ).json();
    Object.assign(sample, { is_played: true, image_url: null });
    sample.statistics.normalized_rating = 4.25;
    await route.fulfill({ response, json: { ...body, total: 21, items: [sample] } });
  });
  await page.goto('/login');
  await page.getByLabel('전화번호', { exact: true }).fill('01070000001');
  await page.getByLabel('비밀번호', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  const card = page.getByRole('button', { name: /사라진 편지/ });
  await expect(card).toBeVisible();
  await expect(page.getByText(/다음 발자국|집계 점수|함께 풀고/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: '안 한 테마', exact: true })).toBeVisible();
  await expect(card).toHaveCSS('background-color', 'rgb(231, 239, 232)');
  expect((await card.boundingBox())!.y).toBeLessThan(250);
  await expect(page.getByText('★ 4.25', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/search-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect.poll(() => latest.searchParams.get('page')).toBe('2');
  await page.getByRole('button', { name: '지역 선택: 전국', exact: true }).click();
  for (const region of meta.region) {
    await page.getByRole('button', { name: region.label, exact: true }).click();
    for (const area of meta.subregion.filter(
      (a: { parent: number }) => a.parent === region.value,
    )) {
      await expect(
        page
          .getByTestId('subregion-options')
          .getByRole('button', { name: area.label, exact: true }),
      ).toBeAttached();
    }
  }
  await page.getByRole('button', { name: '서울', exact: true }).click();
  await expect(page.getByText('서울 세부 지역', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '홍대', exact: true }).click();
  await page.getByRole('button', { name: '강남', exact: true }).click();
  await page.screenshot({ path: 'test-results/search-regions.png', fullPage: true });
  await page.getByRole('button', { name: '지역 적용', exact: true }).click();
  await expect.poll(() => latest.searchParams.getAll('subregion')).toEqual([101, 102].map(String));
  expect(latest.searchParams.get('page')).toBe('1');
  expect(latest.searchParams.getAll('region')).toEqual(['1']);
  await page.getByRole('button', { name: '지역 선택: 홍대 외 1', exact: true }).click();
  await page.getByRole('button', { name: '경기', exact: true }).click();
  await expect(page.getByRole('button', { name: '홍대', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '지역 선택: 홍대 외 1', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '지역 선택: 홍대 외 1', exact: true }).click();
  await page.getByRole('button', { name: '경기', exact: true }).click();
  await page.getByRole('button', { name: '수원', exact: true }).click();
  await page.getByRole('button', { name: '지역 적용', exact: true }).click();
  await expect.poll(() => latest.searchParams.getAll('subregion')).toEqual(['201']);
  await page.getByRole('button', { name: '지역 선택: 수원', exact: true }).click();
  await page.getByRole('button', { name: '전국', exact: true }).click();
  await page.getByRole('button', { name: '지역 적용', exact: true }).click();
  await expect.poll(() => latest.searchParams.getAll('subregion')).toEqual([]);
  expect(latest.searchParams.getAll('region')).toEqual([]);
  await expect(page.getByRole('heading', { name: '지역 선택', exact: true })).toHaveCount(0);
  await page.getByLabel('테마 또는 카페', { exact: true }).fill('편지');
  await page.getByLabel('테마 또는 카페', { exact: true }).press('Enter');
  await expect.poll(() => latest.searchParams.get('q')).toBe('편지');
  await page.getByRole('button', { name: '정렬 선택', exact: true }).click();
  await page.getByRole('button', { name: '난이도 낮은 순', exact: true }).click();
  await expect.poll(() => latest.searchParams.get('order')).toBe('asc');
  expect(latest.searchParams.get('sort')).toBe('difficulty');
  await page.getByRole('button', { name: '상세 필터', exact: true }).click();
  await page.getByRole('button', { name: '공포', exact: true }).click();
  const minimum = page.getByRole('slider', { name: '난이도 최소', exact: true });
  await minimum.focus();
  await minimum.press('ArrowRight');
  await minimum.press('ArrowRight');
  await minimum.press('ArrowRight');
  await expect(minimum).toHaveAttribute('aria-valuenow', '4');
  await page.getByRole('button', { name: '필터 적용', exact: true }).click();
  await expect.poll(() => latest.searchParams.get('difficulty_min')).toBe('4');
  await page.getByRole('button', { name: '상세 필터', exact: true }).click();
  await page.getByRole('button', { name: '필터 초기화', exact: true }).click();
  await page.getByRole('button', { name: '필터 적용', exact: true }).click();
  await expect.poll(() => latest.searchParams.has('difficulty_min')).toBe(false);
  expect(latest.searchParams.getAll('genre')).toEqual([]);
});
