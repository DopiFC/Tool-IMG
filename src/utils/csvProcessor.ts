import Papa from 'papaparse';
import { FilteredWarehouseItem, WarehouseGroup, ParseResult } from '../types';

export const TARGET_WAREHOUSES = [
  'Kho hàng KM',
  'Kho hàng chờ xử lý',
  'Kho hành chính'
] as const;

/**
 * Loại bỏ ký tự BOM (\uFEFF) nếu có và trim khoảng trắng
 */
function cleanString(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/^\uFEFF/, '').trim();
}

/**
 * Chuẩn hóa chuỗi để so khớp linh hoạt không phân biệt dấu và khoảng trắng thừa
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tìm giá trị cột tương ứng trong dòng dữ liệu từ danh sách tên cột tiềm năng
 */
function findColumnValue(row: Record<string, any>, candidates: string[]): string {
  const rowKeys = Object.keys(row);

  // 1. So khớp chính xác
  for (const candidate of candidates) {
    for (const key of rowKeys) {
      if (cleanString(key).toLowerCase() === candidate.toLowerCase()) {
        const val = cleanString(row[key]);
        if (val) return val;
      }
    }
  }

  // 2. So khớp không dấu
  const normCandidates = candidates.map(normalizeText);
  for (let i = 0; i < normCandidates.length; i++) {
    for (const key of rowKeys) {
      if (normalizeText(cleanString(key)) === normCandidates[i]) {
        const val = cleanString(row[key]);
        if (val) return val;
      }
    }
  }

  // 3. So khớp chuỗi con
  for (const candidate of candidates) {
    for (const key of rowKeys) {
      if (cleanString(key).toLowerCase().includes(candidate.toLowerCase())) {
        const val = cleanString(row[key]);
        if (val) return val;
      }
    }
  }

  return '';
}

/**
 * Trích xuất Đơn vị tính (ĐVT) đa cấp (Ưu tiên từ nhỏ nhất đến lớn nhất):
 * Cột "Tổng số lượng" trong file đại diện cho ĐƠN VỊ NHỎ NHẤT hiện có của sản phẩm.
 *
 * Kiểm tra lần lượt 3 cấp đơn vị để tìm ra ĐVT chính xác:
 * - Ưu tiên 1 (Level 3): Cột "Tên ĐVT L3" (ví dụ: Viên, Gói nhỏ, Ống con).
 *   Nếu cột này CÓ DỮ LIỆU (khác rỗng, không null/undefined sau khi trim), BẮT BUỘC lấy giá trị này.
 * - Ưu tiên 2 (Level 2): Nếu cột L3 trống, kiểm tra cột "Tên ĐVT L2" (ví dụ: Vỉ, Vĩ, Hộp nhỏ).
 *   Nếu CÓ DỮ LIỆU, lấy giá trị này.
 * - Ưu tiên 3 (Level 1): Nếu cả L3 và L2 đều trống, lấy giá trị ở cột "Tên ĐVT L1" (ví dụ: Hộp, Tuýp, Chai, Lọ, Thùng).
 * - Fallback: Nếu không có các cột L1/L2/L3, kiểm tra các cột ĐVT chung ("Tên ĐVT", "ĐVT", "Đơn vị tính").
 */
export function extractDvt(row: Record<string, any>): string {
  // Ưu tiên 1 (Level 3): Đơn vị nhỏ nhất (vd: Viên)
  const dvtL3 = findColumnValue(row, [
    'Tên ĐVT L3', 'Ten DVT L3', 'ĐVT L3', 'DVT L3', 'Tên ĐVT L03', 'Ten DVT L03', 'Đơn vị tính L3', 'Don vi tinh L3'
  ]);
  if (dvtL3 && dvtL3.trim() !== '') {
    return dvtL3.trim();
  }

  // Ưu tiên 2 (Level 2): Đơn vị trung gian (vd: Vỉ)
  const dvtL2 = findColumnValue(row, [
    'Tên ĐVT L2', 'Ten DVT L2', 'ĐVT L2', 'DVT L2', 'Tên ĐVT L02', 'Ten DVT L02', 'Đơn vị tính L2', 'Don vi tinh L2'
  ]);
  if (dvtL2 && dvtL2.trim() !== '') {
    return dvtL2.trim();
  }

  // Ưu tiên 3 (Level 1): Đơn vị lớn nhất (vd: Hộp, Tuýp, Chai)
  const dvtL1 = findColumnValue(row, [
    'Tên ĐVT L1', 'Ten DVT L1', 'ĐVT L1', 'DVT L1', 'Tên ĐVT L01', 'Ten DVT L01', 'Đơn vị tính L1', 'Don vi tinh L1'
  ]);
  if (dvtL1 && dvtL1.trim() !== '') {
    return dvtL1.trim();
  }

  // Fallback chung nếu file không phân tách theo L1/L2/L3
  const dvtFallback = findColumnValue(row, [
    'Tên ĐVT', 'Ten DVT', 'ĐVT', 'DVT', 'Đơn vị tính', 'Don vi tinh', 'Unit'
  ]);
  if (dvtFallback && dvtFallback.trim() !== '') {
    return dvtFallback.trim();
  }

  return '-';
}

/**
 * Kiểm tra xem "Tên kho" có chứa đúng 1 trong 3 kho con yêu cầu không:
 * 1. "Kho hàng KM" (hoặc chứa "kho hang km", "kho km")
 * 2. "Kho hàng chờ xử lý" (hoặc chứa "kho hang cho xu ly", "kho cho xu ly")
 * 3. "Kho hành chính" (hoặc chứa "kho hanh chinh", "hanh chinh")
 */
export function matchTargetWarehouse(tenKho: string): string | null {
  if (!tenKho) return null;
  const rawClean = cleanString(tenKho).toLowerCase();
  const normalized = normalizeText(tenKho);

  // 1. Kho hàng KM
  if (
    rawClean.includes('kho hàng km') ||
    rawClean.includes('kho hang km') ||
    rawClean.includes('kho km') ||
    normalized.includes('kho hang km') ||
    normalized.includes('kho km')
  ) {
    return 'Kho hàng KM';
  }

  // 2. Kho hàng chờ xử lý / Kho chờ xử lý
  if (
    rawClean.includes('kho hàng chờ xử lý') ||
    rawClean.includes('kho chờ xử lý') ||
    rawClean.includes('kho hang cho xu ly') ||
    rawClean.includes('kho cho xu ly') ||
    normalized.includes('kho hang cho xu ly') ||
    normalized.includes('kho cho xu ly')
  ) {
    return 'Kho hàng chờ xử lý';
  }

  // 3. Kho hành chính
  if (
    rawClean.includes('kho hành chính') ||
    rawClean.includes('kho hanh chinh') ||
    rawClean.includes('hành chính') ||
    normalized.includes('kho hanh chinh') ||
    normalized.includes('hanh chinh')
  ) {
    return 'Kho hành chính';
  }

  return null;
}

/**
 * Chuyển đổi và làm sạch giá trị số lượng thành kiểu số
 * Hỗ trợ các định dạng số: 100, "1,000", "1.500", " 25 "
 */
export function parseQuantity(rawVal: string | number | undefined | null): number {
  if (rawVal === null || rawVal === undefined) return 0;
  const str = String(rawVal).trim();
  if (!str) return 0;

  // Loại bỏ khoảng trắng và dấu phẩy ngăn cách hàng nghìn (ví dụ "1,500" -> "1500")
  const cleaned = str.replace(/,/g, '').replace(/\s+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse file CSV/TSV phân cách bởi dấu Tab (\t)
 * ĐIỀU KIỆN LỌC ĐỒNG THỜI (&&):
 * 1. Cột "Tên kho" PHẢI chứa 1 trong 3 từ khóa: "Kho hàng KM", "Kho chờ xử lý", "Kho hành chính"
 * 2. VÀ Cột "Tổng số lượng" PHẢI > 0 (>= 1). Bằng 0 hoặc không hợp lệ bị loại bỏ hoàn toàn.
 * 
 * KHÔNG GIỚI HẠN SỐ DÒNG: Có bao nhiêu sản phẩm thỏa mãn điều kiện thì đưa hết vào mảng kết quả.
 * Đánh lại số thứ tự STT bắt đầu từ 1 cho từng dòng trong mỗi nhóm kho.
 */
export function parseWarehouseCsv(fileContent: string, fileName: string): ParseResult {
  // Cấu hình phân cách: Ưu tiên dấu Tab (\t) theo đúng cấu trúc file kho nội bộ
  let delimiter = '\t';
  const firstLine = fileContent.split(/\r?\n/)[0] || '';
  if (!firstLine.includes('\t') && firstLine.includes(',')) {
    delimiter = ',';
  } else if (!firstLine.includes('\t') && firstLine.includes(';')) {
    delimiter = ';';
  }

  const parsed = Papa.parse<Record<string, any>>(fileContent, {
    header: true,
    delimiter: delimiter,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => cleanString(header)
  });

  const rawRows = parsed.data || [];
  const rawCount = rawRows.length;

  // Gom nhóm dữ liệu theo từng kho mục tiêu
  const groupMap: Record<string, FilteredWarehouseItem[]> = {
    'Kho hàng KM': [],
    'Kho hàng chờ xử lý': [],
    'Kho hành chính': []
  };

  let discardedCount = 0;
  let totalFiltered = 0;

  for (const row of rawRows) {
    const tenKhoRaw = findColumnValue(row, ['Tên kho', 'Ten kho', 'Kho']);
    const matchedWarehouse = matchTargetWarehouse(tenKhoRaw);

    const tongSoLuongRaw = findColumnValue(row, ['Tổng số lượng', 'Tong so luong', 'Số lượng', 'SL', 'Quantity']);
    const numericQuantity = parseQuantity(tongSoLuongRaw);

    // ĐIỀU KIỆN BẮT BUỘC ĐỒNG THỜI (&&):
    // 1. Tên kho thuộc 1 trong 3 kho con
    // 2. VÀ Tổng số lượng phải > 0
    if (!matchedWarehouse || !(numericQuantity > 0)) {
      discardedCount++;
      continue;
    }

    const maShop = findColumnValue(row, ['Mã shop', 'Ma shop', 'Shop ID', 'Shop Code']);
    const tenShop = findColumnValue(row, ['Tên shop', 'Ten shop', 'Shop Name']);
    const maKho = findColumnValue(row, ['Mã kho', 'Ma kho', 'Kho ID']);
    const maSanPham = findColumnValue(row, ['Mã sản phẩm', 'Mã SP', 'Ma san pham', 'SKU']);
    const tenSanPham = findColumnValue(row, ['Tên sản phẩm', 'Tên SP', 'Ten san pham']);

    // Cột "Tên ĐVT": Ưu tiên Level 3 (nhỏ nhất, vd: Viên) -> Level 2 (Vỉ) -> Level 1 (Hộp)
    const tenDvt = extractDvt(row);

    // Đánh số STT bắt đầu từ 1 cho từng dòng trong nhóm kho
    const currentGroupItems = groupMap[matchedWarehouse];
    const newStt = currentGroupItems.length + 1;

    currentGroupItems.push({
      stt: newStt,
      maShop: maShop || '-',
      tenShop: tenShop || '-',
      maKho: maKho || '-',
      tenKho: tenKhoRaw || matchedWarehouse,
      maSanPham: maSanPham || '-',
      tenSanPham: tenSanPham || '-',
      tongSoLuong: tongSoLuongRaw || String(numericQuantity),
      tenDvt: tenDvt || '-'
    });

    totalFiltered++;
  }

  // Chuyển map thành danh sách nhóm hiển thị (chỉ lấy nhóm có dữ liệu)
  const groups: WarehouseGroup[] = [];
  for (const target of TARGET_WAREHOUSES) {
    if (groupMap[target] && groupMap[target].length > 0) {
      groups.push({
        tenKho: target,
        items: groupMap[target]
      });
    }
  }

  return {
    rawCount,
    filteredCount: totalFiltered,
    discardedCount,
    groups,
    fileName
  };
}
