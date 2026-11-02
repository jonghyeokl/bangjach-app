#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { spawn } = require('node:child_process');
const core = require('./core.cjs');

async function downloadImage(url, fetcher = fetch) {
  if (new URL(url).origin !== 'https://cdn.keigon.net') throw new Error('사진 출처가 다릅니다.');
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 12 * 1024 * 1024) throw new Error('사진이 12MB를 초과합니다.');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  }
  const data = Buffer.concat(chunks);
  let extension;
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) extension = 'jpg';
  else if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    extension = 'png';
  else if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP')
    extension = 'webp';
  else throw new Error('JPEG/PNG/WebP 사진 파일이 아닙니다.');
  return { data, extension };
}
async function exportData(data, output, { images = true, fetcher = fetch, delay = 500 } = {}) {
  core.validateExport(data);
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(path.join(output, 'images'), { recursive: true });
  const failures = [];
  for (const row of data.themes) {
    row.image_file = null;
    if (!images || !row.image_url) continue;
    try {
      const image = await downloadImage(row.image_url, fetcher);
      row.image_file = `images/${String(row.rank).padStart(2, '0')}-${row.source_id}.${image.extension}`;
      await fs.writeFile(path.join(output, row.image_file), image.data);
    } catch (error) {
      failures.push({ rank: row.rank, theme_name: row.theme_name, error: error.message });
    }
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  }
  data.image_download = {
    requested: images,
    succeeded: data.themes.filter((row) => row.image_file).length,
    failures,
  };
  await fs.writeFile(path.join(output, 'themes.json'), JSON.stringify(data, null, 2) + '\n');
  await fs.writeFile(path.join(output, 'themes.csv'), core.csv(data));
  return data;
}
async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      output: { type: 'string' },
      'no-images': { type: 'boolean' },
      help: { type: 'boolean' },
      'import-db': { type: 'boolean' },
      apply: { type: 'boolean' },
      'photo-bucket': { type: 'string' },
      'local-photos': { type: 'boolean' },
      backend: { type: 'string' },
    },
  });
  if (values.help) {
    console.log(
      'npm run collect:bbabang\nnpm run collect:bbabang -- --input ~/Downloads/bbabang-top200.json [--import-db [--apply]] [--photo-bucket NAME] [--local-photos] [--output DIR]',
    );
    return;
  }
  if (values.apply && !values['import-db'])
    throw new Error('--apply는 --import-db와 함께 사용하세요.');
  if (values['import-db'] && (!values.input || values['no-images'])) {
    throw new Error('DB 등록에는 --input과 사진 다운로드가 필요합니다.');
  }
  const output = path.resolve(
    values.output ?? 'test-data/bbabang/' + new Date().toISOString().replace(/[:.]/g, '-'),
  );
  if (!values.input) {
    await fs.mkdir(output, { recursive: true });
    const contents = await Promise.all(
      ['core.cjs', 'browser.js'].map((file) => fs.readFile(path.join(__dirname, file), 'utf8')),
    );
    const file = path.join(output, 'collector.js');
    await fs.writeFile(file, contents.join('\n'));
    console.log(
      `브라우저 수집 스크립트: ${file}\n빠방이 정상적으로 열리는 Chrome의 개발자 도구 > Sources > Snippets에서 실행하세요.\n전국 / 예약 가능 OFF / 안 한 테마 OFF 후 정렬을 추천도 높은 순으로 바꾸면 ${core.COUNT}개를 저장할 수 있습니다.\n자세한 실행법: docs/bbabang-collector.md`,
    );
    return;
  }
  const data = JSON.parse(await fs.readFile(path.resolve(values.input), 'utf8'));
  await exportData(data, output, { images: !values['no-images'] });
  console.log(`테마 ${data.count}개 / 사진 ${data.image_download.succeeded}개\n${output}`);
  const missing = data.themes.filter((row) => row.missing_fields?.length);
  if (missing.length)
    console.log(`원본 누락 항목이 있는 테마: ${missing.length}개 (themes.json 참고)`);
  if (data.image_download.failures.length) {
    console.error(
      `사진 다운로드 실패 ${data.image_download.failures.length}개: themes.json의 image_download.failures 확인`,
    );
    process.exitCode = 1;
    return;
  }
  if (values['import-db']) {
    const backend = path.resolve(values.backend ?? path.join(__dirname, '../../../bangjach'));
    const python = path.join(backend, '.venv/bin/python');
    await fs.access(python);
    const args = ['-m', 'app.jobs.import_bbabang', path.join(output, 'themes.json')];
    if (values.apply) args.push('--apply');
    if (values['photo-bucket']) args.push('--photo-bucket', values['photo-bucket']);
    if (values['local-photos']) args.push('--local-photos');
    const code = await new Promise((resolve, reject) => {
      const child = spawn(python, args, { cwd: backend, stdio: 'inherit' });
      child.on('error', reject);
      child.on('close', (status) => resolve(status ?? 1));
    });
    process.exitCode = code;
  }
}
module.exports = { downloadImage, exportData };
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
