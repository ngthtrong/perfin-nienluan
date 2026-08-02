/**
 * Phân hoạch dữ liệu theo nhóm với seed cố định. Mọi phần tử cùng `keyFn` luôn
 * nằm chung một phía, nhờ đó một mô tả chuẩn hóa không thể xuất hiện đồng thời
 * trong correction seed và tập đánh giá.
 */

function seededRng(seed) {
  let value = Number(seed) >>> 0;
  return function next() {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, rng) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Chỉ các nhóm có ít nhất một phần tử thỏa `seedEligibleFn` mới có thể đi vào
 * seed. Tỷ lệ được tối ưu theo số phần tử eligible thay vì số nhóm, vì kích
 * thước các nhóm văn bản trùng nhau có thể rất chênh lệch.
 */
function splitByGroup(items, {
  keyFn,
  seedEligibleFn = () => true,
  seedRatio = 0.5,
  seed = 1,
} = {}) {
  if (typeof keyFn !== 'function') throw new TypeError('keyFn phải là hàm');
  if (!(seedRatio >= 0 && seedRatio <= 1)) throw new RangeError('seedRatio phải nằm trong [0, 1]');

  const groups = new Map();
  for (const item of items) {
    const key = String(keyFn(item));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const candidates = [...groups.entries()]
    .map(([key, members]) => ({
      key,
      members,
      eligibleCount: members.filter(seedEligibleFn).length,
    }))
    .filter((group) => group.eligibleCount > 0)
    .sort((left, right) => left.key.localeCompare(right.key));
  const ordered = shuffle(candidates, seededRng(seed));
  const eligibleTotal = ordered.reduce((sum, group) => sum + group.eligibleCount, 0);
  const target = Math.floor(eligibleTotal * seedRatio);
  const seedKeys = new Set();
  let selected = 0;

  // Chọn greedily nếu thêm cả nhóm đưa tổng gần target hơn. Không bao giờ xé
  // nhóm để đạt đúng tỷ lệ, vì chống leakage quan trọng hơn khớp tỷ lệ tuyệt đối.
  for (const group of ordered) {
    const distanceWithout = Math.abs(target - selected);
    const distanceWith = Math.abs(target - (selected + group.eligibleCount));
    if (distanceWith < distanceWithout || (distanceWith === distanceWithout && selected < target)) {
      seedKeys.add(group.key);
      selected += group.eligibleCount;
    }
  }

  const seedItems = [];
  const evaluationItems = [];
  for (const item of items) {
    if (seedKeys.has(String(keyFn(item)))) seedItems.push(item);
    else evaluationItems.push(item);
  }
  const evaluationKeys = new Set(evaluationItems.map((item) => String(keyFn(item))));
  const overlap = [...seedKeys].filter((key) => evaluationKeys.has(key));

  return {
    seedItems,
    evaluationItems,
    seedKeys: [...seedKeys].sort(),
    evaluationKeys: [...evaluationKeys].sort(),
    seedEligibleCount: seedItems.filter(seedEligibleFn).length,
    evaluationEligibleCount: evaluationItems.filter(seedEligibleFn).length,
    eligibleTotal,
    targetEligibleCount: target,
    leakageKeys: overlap,
  };
}

module.exports = { splitByGroup };
