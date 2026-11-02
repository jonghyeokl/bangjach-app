/* Runs in the user's ordinary bbabang.net tab. Uses the site's own authenticated request. */
(() => {
  if (location.origin !== 'https://bbabang.net') throw new Error('빠방 사이트에서 실행해주세요.');
  if (window.bbangCollector)
    throw new Error('수집기가 이미 실행 중입니다. 새로고침 후 다시 실행해주세요.');
  const core = window.BbabangCollectorCore;
  const original = window.fetch;
  let active = true;
  let busy = false;
  const status = document.createElement('div');
  status.style.cssText =
    'position:fixed;bottom:90px;right:16px;z-index:2147483647;background:white;color:#163d30;padding:16px;max-width:340px;box-shadow:0 2px 12px #999;border-radius:12px;font:14px sans-serif;white-space:pre-wrap';
  const message = document.createElement('div');
  const download = document.createElement('button');
  download.textContent = `${core.COUNT}개 JSON 저장`;
  download.hidden = true;
  const close = document.createElement('button');
  close.textContent = '수집 종료';
  close.style.marginLeft = '12px';
  status.append(message, download, close);
  document.body.append(status);
  let result = null;
  const stop = () => {
    active = false;
    if (window.fetch === wrapped) window.fetch = original;
  };
  close.onclick = () => {
    stop();
    status.remove();
    delete window.bbangCollector;
  };
  download.onclick = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `bbabang-top${core.COUNT}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  async function wrapped(input, init) {
    const url = new URL(
      typeof input === 'string' || input instanceof URL ? input : input.url,
      location.href,
    );
    const isSearch =
      url.origin === 'https://asia-northeast3-roomescape-app-mvp.cloudfunctions.net' &&
      url.pathname === '/meiliSearch';
    if (!active || busy || !isSearch) return original.call(this, input, init);
    let request;
    let body;
    try {
      request = new Request(input instanceof Request ? input.clone() : input, init);
      body = await request.clone().json();
    } catch {
      return original.call(this, input, init);
    }
    if (!core.isRequestedSearch(body.data)) {
      message.textContent =
        '조건 대기 중\n전국 / 예약 가능 OFF / 안 한 테마 OFF / 추천도 높은 순으로 설정해주세요.';
      return original.call(this, input, init);
    }
    busy = true;
    message.textContent = `조건 확인 완료. 광고 요청을 제외하고 상위 ${core.COUNT}개를 받는 중…`;
    // Keep the site's method, App Check headers and credentials unchanged; only change the requested row count.
    const adjusted = { ...body, data: { ...body.data, limit: core.COUNT } };
    let response;
    try {
      response = await original.call(
        this,
        new Request(request, { body: JSON.stringify(adjusted) }),
      );
      if (!response.ok)
        throw new Error(
          `검색 요청 실패 (${response.status}). 인증·App Check 제한은 우회하지 않습니다.`,
        );
      result = core.dataset(await response.clone().json(), adjusted.data);
      const missing = result.themes.filter((row) => row.missing_fields.length).length;
      const missingCafes = new Set(
        result.themes.filter((row) => row.missing_cafe_fields.length).map((row) => row.cafe_name),
      ).size;
      message.textContent = `광고 슬롯 제외 ${core.COUNT}개 수집 완료.\n원본에 일부 항목이 없는 테마: ${missing}개\n사진 주소 포함 JSON을 저장해주세요.`;
      if (missingCafes)
        message.textContent += `\nDB 등록 전 카페 정보 보완 필요: ${missingCafes}곳`;
      download.hidden = false;
      stop();
    } catch (error) {
      message.textContent = error.message + '\n새로고침 후 정상적으로 검색되는지 확인해주세요.';
      stop();
      if (!response) throw error;
    } finally {
      busy = false;
    }
    return response;
  }
  window.fetch = wrapped;
  window.bbangCollector = { stop, getResult: () => result };
  message.textContent =
    '수집 준비 완료\n전국 / 예약 가능 OFF / 안 한 테마 OFF로 설정한 뒤, 정렬을 다른 항목으로 바꿨다가 추천도 높은 순을 선택해주세요.';
})();
