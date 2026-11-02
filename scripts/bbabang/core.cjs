/* Shared by the browser collector and the local exporter. No credentials are retained. */
(function (root) {
  const FILTER = ['isopen != false', 'store_isopen != false'];
  const SORT = ['recommendTotalRating:desc'];
  const COUNT = 30;
  function isRequestedSearch(data) {
    return (
      data?.index === 'qrooms' &&
      data.query === '' &&
      Array.isArray(data.filter) &&
      data.filter.length === FILTER.length &&
      FILTER.every((value) => data.filter.includes(value)) &&
      JSON.stringify(data.sort) === JSON.stringify(SORT)
    );
  }
  function website(value) {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
        ? url.href
        : null;
    } catch {
      return null;
    }
  }
  function imageUrl(value) {
    if (!value || typeof value !== 'string') return null;
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      return url.origin === 'https://cdn.keigon.net' ? url.href : null;
    }
    const parts = value.split('/');
    if (parts.some((part) => !part || part === '.' || part === '..')) return null;
    return 'https://cdn.keigon.net/' + parts.map(encodeURIComponent).join('/');
  }
  function text(value) {
    return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';
  }
  function dataset(payload, request) {
    if (!isRequestedSearch(request))
      throw new Error('전국·필터 해제·추천도 높은 순 조건이 아닙니다.');
    let result = payload?.result ?? payload?.data;
    if (typeof result === 'string') result = JSON.parse(result);
    if (!Array.isArray(result?.hits) || (result.offset ?? 0) !== 0) {
      throw new Error('첫 페이지 검색 응답 형식이 달라졌습니다. 수집을 중단합니다.');
    }
    // selectAd is a separate request; its injected advertisement is never included.
    const organic = result.hits.filter((hit) => hit.is_ad !== true && hit.isAd !== true);
    const selected = organic.slice(0, COUNT);
    if (selected.length !== COUNT)
      throw new Error(`30개가 필요하지만 ${selected.length}개만 받았습니다.`);
    const seen = new Set();
    let previous = null;
    const themes = selected.map((hit, index) => {
      if (!Number.isSafeInteger(hit.ref_id) || !text(hit.title) || !text(hit.store_name)) {
        throw new Error('테마 ID·테마명·카페명 필드가 누락되었습니다.');
      }
      if (seen.has(hit.ref_id))
        throw new Error('중복 테마 ID가 있습니다. 순위를 다시 확인해주세요.');
      seen.add(hit.ref_id);
      const score = hit.recommendTotalRating;
      const count = hit.isRecommendedTotal;
      if (!Number.isFinite(score) || !Number.isFinite(count))
        throw new Error('추천도 필드가 없습니다.');
      if (previous && previous.score < score) {
        throw new Error('검색 결과가 추천도 내림차순이 아닙니다.');
      }
      previous = { score, count };
      const photo = imageUrl(hit.poster_loc) ?? imageUrl(hit.thumb_loc);
      const length = Number(hit.playtime);
      const row = {
        rank: index + 1,
        source_id: hit.ref_id,
        theme_name: text(hit.title),
        cafe_name: text(hit.store_name),
        image_url: photo,
        length_minutes: Number.isInteger(length) && length > 0 ? length : null,
        description: text(hit.description),
        website: website(hit.store_homepage),
        recommendation_score: score,
        recommendation_count: count,
      };
      row.missing_fields = ['image_url', 'length_minutes', 'description', 'website'].filter(
        (key) => !row[key],
      );
      return row;
    });
    return {
      schema_version: 1,
      source: 'https://bbabang.net/#home',
      collected_at: new Date().toISOString(),
      filters: {
        region: '전국',
        available_only: false,
        unplayed_only: false,
        sort: '추천도 높은 순',
        exclude_ad_slots: true,
        operating_themes_only: true,
      },
      request: { index: 'qrooms', query: '', filter: [...FILTER], sort: [...SORT], limit: COUNT },
      count: themes.length,
      themes,
    };
  }
  function validateExport(data) {
    if (
      data?.schema_version !== 1 ||
      data.count !== COUNT ||
      data.themes?.length !== COUNT ||
      !isRequestedSearch(data.request) ||
      data.source !== 'https://bbabang.net/#home'
    ) {
      throw new Error('빠방 수집기로 저장한 30개 JSON 파일을 선택해주세요.');
    }
    const ids = new Set();
    data.themes.forEach((row, index) => {
      if (
        row.rank !== index + 1 ||
        !Number.isSafeInteger(row.source_id) ||
        ids.has(row.source_id) ||
        typeof row.theme_name !== 'string' ||
        !row.theme_name ||
        typeof row.cafe_name !== 'string' ||
        !row.cafe_name ||
        typeof row.description !== 'string'
      )
        throw new Error('테마 행 형식이 올바르지 않습니다.');
      ids.add(row.source_id);
      if (
        row.image_url !== null &&
        (!row.image_url || new URL(row.image_url).origin !== 'https://cdn.keigon.net')
      ) {
        throw new Error('검증되지 않은 사진 주소입니다.');
      }
    });
    return data;
  }
  function csv(data) {
    const columns = [
      'rank',
      'source_id',
      'theme_name',
      'cafe_name',
      'image_url',
      'image_file',
      'length_minutes',
      'description',
      'website',
    ];
    const cell = (value) => {
      let str = String(value ?? '');
      if (/^[\s]*[=+@-]/.test(str)) str = "'" + str;
      return '"' + str.replace(/"/g, '""') + '"';
    };
    return (
      '\ufeff' +
      [columns, ...data.themes.map((row) => columns.map((key) => row[key]))]
        .map((row) => row.map(cell).join(','))
        .join('\r\n') +
      '\r\n'
    );
  }
  const core = { COUNT, FILTER, SORT, isRequestedSearch, dataset, validateExport, imageUrl, csv };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  else root.BbabangCollectorCore = core;
})(globalThis);
