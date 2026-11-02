export const peopleOptions = [1, 2, 3, 4, 5].map((value) => ({
  value,
  label: value === 5 ? '5인+' : `${value}인`,
}));
export const peopleText = (value: number) => (value >= 5 ? '5인+' : `${value}인`);
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function elapsedSeconds(lengthMinutes: number, minutes: string, seconds: string) {
  if (!minutes && !seconds) return null;
  if ((minutes && !/^\d+$/.test(minutes)) || (seconds && !/^\d+$/.test(seconds)))
    throw new Error('남은 시간은 0 이상의 정수로 입력해주세요.');
  const m = Number(minutes || 0),
    s = Number(seconds || 0);
  if (s > 59) throw new Error('남은 초는 0~59로 입력해주세요.');
  const remaining = m * 60 + s;
  if (!Number.isSafeInteger(remaining) || remaining > lengthMinutes * 60)
    throw new Error('남은 시간이 테마 전체 시간보다 길 수 없어요.');
  return lengthMinutes * 60 - remaining;
}
export function durationText(seconds: number) {
  return `${Math.floor(seconds / 60)}분 ${String(seconds % 60).padStart(2, '0')}초`;
}
