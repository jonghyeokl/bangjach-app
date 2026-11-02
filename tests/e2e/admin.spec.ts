import { test, expect } from '@playwright/test';

test('관리자 탭에서 카페와 테마 등록, 검색 갱신, 왼쪽 뒤로가기', async ({ page }) => {
  const text = (value: string) => page.getByText(value, { exact: true }).filter({ visible: true });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/login');
  await expect(page.getByRole('button', { name: '뒤로', exact: true })).toBeVisible();
  const back = await page.getByRole('button', { name: '뒤로', exact: true }).boundingBox();
  expect(back!.x).toBeLessThan(40);
  await page.getByRole('button', { name: '뒤로', exact: true }).click();
  await expect(page.getByRole('button', { name: '회원가입', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.getByLabel('전화번호', { exact: true }).fill('01079999999');
  await page.getByLabel('비밀번호', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('tab')).toHaveCount(4);
  await expect(text('다음 발자국을 남기세요')).toBeVisible();
  await expect(page.getByRole('button', { name: '뒤로', exact: true })).toHaveCount(0);
  const admin = page.getByRole('tab', { name: '테마 추가', exact: true });
  const box = await admin.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.y).toBeLessThan(800);
  await admin.click();
  await page.getByRole('button', { name: '카페 추가', exact: true }).click();
  await page.getByRole('button', { name: '카페 등록', exact: true }).click();
  await expect(text('카페명·지역·주소·전화번호를 입력해주세요.')).toBeVisible();
  const suffix = String(Date.now());
  const cafeName = '등록카페' + suffix;
  const themeName = '등록테마' + suffix;
  await page.getByLabel('카페명 *', { exact: true }).fill(cafeName);
  await page.getByRole('button', { name: '서울', exact: true }).click();
  await page.getByLabel('주소 *', { exact: true }).fill('서울 테스트 주소');
  await page.getByLabel('카페 전화번호 *', { exact: true }).fill('0200000000');
  await page.getByLabel('카페 홈페이지', { exact: true }).fill('https://example.com');
  await page.getByRole('button', { name: '카페 등록', exact: true }).click();
  await expect(
    text(`${cafeName} 카페를 추가했어요. 이어서 테마를 등록할 수 있어요.`),
  ).toBeVisible();
  await expect(text(cafeName)).toBeVisible();
  await page.getByLabel('테마명 *', { exact: true }).fill(themeName);
  await page.getByLabel('제한 시간 (분) *', { exact: true }).fill('60');
  await page.getByLabel('테마 설명', { exact: true }).fill('관리자 등록 테스트');
  await page.getByRole('button', { name: '테마 등록', exact: true }).click();
  await expect(text(`${themeName} 테마를 추가했어요.`)).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-mobile.png', fullPage: true });
  await page.getByRole('tab', { name: '테마 검색', exact: true }).click();
  await expect(text(themeName)).toBeVisible();
  await page.getByRole('button', { name: new RegExp(themeName) }).click();
  await expect(text('관리자 등록 테스트')).toBeVisible();
  await expect(page.getByRole('button', { name: '뒤로', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '뒤로', exact: true }).click();
  await page.getByRole('tab', { name: '마이페이지', exact: true }).click();
  await expect(page.getByRole('button', { name: '캘린더', exact: true })).toHaveCSS(
    'background-color',
    'rgb(231, 239, 232)',
  );
  await page.screenshot({ path: 'test-results/me-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '설정 및 로그아웃', exact: true }).click();
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  expect(errors).toEqual([]);
});

test('일반 계정은 관리자 탭 및 직접 주소 접근 불가, 기본 탭의 데이터 유지', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('전화번호', { exact: true }).fill('01070000001');
  await page.getByLabel('비밀번호', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('tab')).toHaveCount(3);
  await expect(
    page.getByText('사라진 편지', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  let requests = 0;
  page.on('request', (req) => {
    if (req.url().includes('/theme/v1?')) requests++;
  });
  await page.getByRole('tab', { name: '마이페이지', exact: true }).click();
  await expect(
    page.getByText('지금까지 1개의 발자국', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: '테마 검색', exact: true }).click();
  await expect(
    page.getByText('사라진 편지', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  expect(requests).toBe(0);
  // Client-side direct navigation must also respect the role, not only hide a label.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('tab', { name: '테마 추가', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('테마명 *', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText('다음 발자국을 남기세요', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
});
