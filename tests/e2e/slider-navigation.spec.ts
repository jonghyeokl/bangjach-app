import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('전화번호', { exact: true }).fill('01070000001');
  await page.getByLabel('비밀번호', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('tab', { name: '테마 검색', exact: true })).toBeVisible();
}

test('양끝 슬라이더는 드래그로 정수만 선택하고 겹쳐도 다시 분리할 수 있다', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '상세 필터', exact: true }).click();
  for (const label of ['난이도', '공포도', '활동성']) {
    const low = page.getByRole('slider', { name: `${label} 최소`, exact: true });
    const high = page.getByRole('slider', { name: `${label} 최대`, exact: true });
    await low.scrollIntoViewIfNeeded();
    const left = (await low.boundingBox())!;
    const right = (await high.boundingBox())!;
    const start = left.x + left.width / 2;
    const end = right.x + right.width / 2;
    const y = left.y + left.height / 2;
    async function drag(from: number, to: number) {
      await page.mouse.move(from, y);
      await page.mouse.down();
      await page.mouse.move(to, y, { steps: 12 });
      await page.mouse.up();
    }
    await drag(start, start + (end - start) * 0.42);
    await expect(low).toHaveAttribute('aria-valuenow', '3');
    await drag(end, start + (end - start) * 0.73);
    await expect(high).toHaveAttribute('aria-valuenow', '4');
    await drag(start + (end - start) * 0.5, end + 15);
    await expect(low).toHaveAttribute('aria-valuenow', '4');
    await expect(high).toHaveAttribute('aria-valuenow', '4');
    await drag(start + (end - start) * 0.75, start + (end - start) * 0.25);
    await expect(low).toHaveAttribute('aria-valuenow', '2');
    await expect(high).toHaveAttribute('aria-valuenow', '4');
  }
  await page.screenshot({ path: 'test-results/range-sliders.png', fullPage: true });
  const sent = page.waitForRequest((r) => {
    const url = new URL(r.url());
    return url.pathname === '/theme/v1' && url.searchParams.get('difficulty_min') === '2';
  });
  await page.getByRole('button', { name: '필터 적용', exact: true }).click();
  const url = new URL((await sent).url());
  for (const key of ['difficulty', 'horrorness', 'physicality']) {
    expect(url.searchParams.get(`${key}_min`)).toBe('2');
    expect(url.searchParams.get(`${key}_max`)).toBe('4');
  }
  await page.getByRole('button', { name: '상세 필터', exact: true }).click();
  await expect(page.getByRole('slider', { name: '난이도 최소', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '2',
  );
  await page.getByRole('button', { name: '필터 초기화', exact: true }).click();
  await expect(page.getByRole('slider', { name: '난이도 최소', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '1',
  );
  await expect(page.getByRole('slider', { name: '난이도 최대', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '5',
  );
});

test('마이페이지 헤더는 상세 화면을 열고 돌아오는 동안에도 방자취를 유지한다', async ({ page }) => {
  await login(page);
  await page.getByRole('tab', { name: '마이페이지', exact: true }).click();
  await expect(page.getByTestId('tab-header')).toHaveText('방자취');
  for (const destination of ['캘린더', '팔로워', '팔로잉', '설정 및 로그아웃']) {
    await page.getByRole('button', { name: destination, exact: true }).click();
    await expect(
      page.getByTestId('page-header').getByRole('button', { name: '뒤로', exact: true }),
    ).toBeVisible();
    // Inspect the still-mounted tab while a detail route is active, not just after returning.
    await expect(page.getByTestId('tab-header')).toHaveText('방자취');
    await page.getByRole('button', { name: '뒤로', exact: true }).click();
    await expect(page.getByTestId('tab-header')).toBeVisible();
    await expect(page.getByTestId('tab-header')).toHaveText('방자취');
    await expect(page.getByRole('button', { name: '뒤로', exact: true })).toHaveCount(0);
  }
});

test('터치 드래그로도 점수 범위를 조절한다', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '상세 필터', exact: true }).click();
  const low = page.getByRole('slider', { name: '난이도 최소', exact: true });
  const high = page.getByRole('slider', { name: '난이도 최대', exact: true });
  await low.scrollIntoViewIfNeeded();
  const left = (await low.boundingBox())!;
  const right = (await high.boundingBox())!;
  const x0 = left.x + left.width / 2;
  const y = left.y + left.height / 2;
  const target = x0 + (right.x - left.x) / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
  for (let step = 1; step <= 12; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x0 + ((target - x0) * step) / 12, y: y + step / 4 }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(low).toHaveAttribute('aria-valuenow', '3');
  await expect(high).toHaveAttribute('aria-valuenow', '5');
  await cdp.detach();
});
