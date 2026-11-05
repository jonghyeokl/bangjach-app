import { test, expect } from '@playwright/test';
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000';

test('팔로잉 기본 피드, 전체 공개 범위, 좋아요 표시·취소·정렬과 화면 간 동기화', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  async function account(phone: string) {
    const r = await request.post(`${API}/user/v1/log-in`, {
      data: { phone_number: phone, password: 'test-password' },
    });
    const data = await r.json();
    return { user: data.user, headers: { Authorization: `Bearer ${data.access_token}` } };
  }
  const viewer = await account('01070000001');
  const following = await account('01070000002');
  const publicUser = await account('01070000000');
  const admin = await account('01079999999');
  await request.patch(`${API}/user/v1/me/settings`, {
    headers: publicUser.headers,
    data: { is_private: false },
  });
  const invitation = await request.post(`${API}/follow/v1`, {
    headers: viewer.headers,
    data: { user_id: following.user.id },
  });
  await request.post(`${API}/follow/v1/${(await invitation.json()).id}/accept`, {
    headers: following.headers,
  });
  async function review(headers: { Authorization: string }) {
    return (await (await request.get(`${API}/user/v1/me/reviews`, { headers })).json()).items[0];
  }
  const followedReview = await review(following.headers);
  const publicReview = await review(publicUser.headers);
  await request.put(`${API}/review/v1/${followedReview.id}/like`, { headers: following.headers });
  await request.put(`${API}/review/v1/${publicReview.id}/like`, { headers: publicUser.headers });
  await request.put(`${API}/review/v1/${publicReview.id}/like`, { headers: admin.headers });

  try {
    const requests: URL[] = [];
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (url.pathname === '/feed/v1') requests.push(url);
    });
    await page.goto('/login');
    await page.getByLabel('전화번호', { exact: true }).fill('01070000001');
    await page.getByLabel('비밀번호', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.getByRole('tab', { name: '피드', exact: true }).click();
    const card = (id: string) => page.getByTestId(`review-${id}`).filter({ visible: true });
    await expect(card(followedReview.id)).toBeVisible();
    await expect(card(publicReview.id)).toHaveCount(0);
    expect(requests.at(-1)!.searchParams.get('scope')).toBe('following');
    expect(requests.at(-1)!.searchParams.get('sort')).toBe('newest');
    await card(followedReview.id)
      .getByRole('button', { name: '좋아요 · 1개', exact: true })
      .click();
    await expect(
      card(followedReview.id).getByRole('button', { name: '좋아요 취소 · 2개', exact: true }),
    ).toBeVisible();
    await card(followedReview.id)
      .getByRole('button', { name: '좋아요 취소 · 2개', exact: true })
      .click();
    await expect(
      card(followedReview.id).getByRole('button', { name: '좋아요 · 1개', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: '전체', exact: true }).click();
    await expect(card(publicReview.id)).toBeVisible();
    const rows = page.locator('[data-testid^="review-"]').filter({ visible: true });
    await expect(rows.first()).toHaveAttribute('data-testid', `review-${followedReview.id}`);
    await page.getByRole('button', { name: '좋아요 순', exact: true }).click();
    await expect(rows.first()).toHaveAttribute('data-testid', `review-${publicReview.id}`);
    await card(publicReview.id).getByRole('button', { name: '좋아요 · 2개', exact: true }).click();
    await expect(
      card(publicReview.id).getByRole('button', { name: '좋아요 취소 · 3개', exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: 'test-results/feed-likes.png', fullPage: true });
    await card(publicReview.id)
      .getByRole('button', { name: /테마 상세 보기/ })
      .click();
    await expect(page).toHaveURL(/\/theme\//);
    await expect(page.getByText('플레이어들의 기록', { exact: true })).toBeVisible();
    await card(publicReview.id).scrollIntoViewIfNeeded();
    await expect(
      card(publicReview.id).getByRole('button', { name: '좋아요 취소 · 3개', exact: true }),
    ).toBeVisible();
    await card(publicReview.id)
      .getByRole('button', { name: '좋아요 취소 · 3개', exact: true })
      .click();
    await expect(
      card(publicReview.id).getByRole('button', { name: '좋아요 · 2개', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: '뒤로', exact: true }).click();
    await expect(
      card(publicReview.id).getByRole('button', { name: '좋아요 · 2개', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: '팔로잉하는 계정만', exact: true }).click();
    await expect(card(publicReview.id)).toHaveCount(0);
    expect(requests.at(-1)!.searchParams.get('page')).toBe('1');
    await expect(card(followedReview.id)).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await request.delete(`${API}/review/v1/${publicReview.id}/like`, { headers: viewer.headers });
    await request.delete(`${API}/review/v1/${publicReview.id}/like`, {
      headers: publicUser.headers,
    });
    await request.delete(`${API}/review/v1/${publicReview.id}/like`, { headers: admin.headers });
    await request.delete(`${API}/review/v1/${followedReview.id}/like`, {
      headers: following.headers,
    });
    await request.delete(`${API}/review/v1/${followedReview.id}/like`, { headers: viewer.headers });
    await request.patch(`${API}/user/v1/me/settings`, {
      headers: publicUser.headers,
      data: { is_private: true },
    });
  }
});
