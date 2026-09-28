import Papa from 'papaparse';
import {
  FilteredWarehouseItem,
  WarehouseGroup,
  TableReportData,
  MergedDataResult,
  WarehouseInfo,
  ParsedFileInfo
} from '../types';

/**
 * Loại bỏ ký tự BOM (\uFEFF) nếu có và trim khoảng trắng
 */
export function cleanString(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/^\uFEFF/, '').trim();
}

/**
 * Chuẩn hóa chuỗi để so khớp linh hoạt không phân biệt dấu và khoảng trắng thừa
 */
export function normalizeText(text: string): string {
  return String(text || '')
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
export function findColumnValue(row: Record<string, any>, candidates: string[]): string {
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
 * LOGIC ĐƠN VỊ TÍNH ĐA CẤP (CRITICAL - BẢO LƯU 100%):
 * Cột "Tổng số lượng" trong file đại diện cho ĐƠN VỊ NHỎ NHẤT hiện có của sản phẩm.
 *
 * Kiểm tra lần lượt 3 cấp đơn vị để tìm ra ĐVT chính xác (ưu tiên từ nhỏ đến lớn):
 * - Ưu tiên 1 (Level 3): Cột "Tên ĐVT L3" (ví dụ: Viên, Gói nhỏ, Ống con).
 *   Nếu cột này CÓ DỮ LIỆU (khác rỗng, không null/undefined sau khi trim), BẮT BUỘC lấy giá trị này.
 * - Ưu tiên 2 (Level 2): Nếu cột L3 trống, kiểm tra cột "Tên ĐVT L2" (ví dụ: Vỉ, Vĩ, Hộp con).
 *   Nếu CÓ DỮ LIỆU, lấy giá trị này.
 * - Ưu tiên 3 (Level 1): Nếu cả L3 và L2 đều trống, lấy giá trị ở cột "Tên ĐVT L1" (ví dụ: Hộp, Tuýp, Chai, Lọ, Thùng).
 * - Fallback: Nếu không có các cột L1/L2/L3, kiểm tra các cột ĐVT chung ("Tên ĐVT", "ĐVT", "Đơn vị tính", "Unit").
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
 * Chuyển đổi và làm sạch giá trị số lượng thành kiểu số
 */
export function parseQuantity(rawVal: string | number | undefined | null): number {
  if (rawVal === null || rawVal === undefined) return 0;
  const str = String(rawVal).trim();
  if (!str) return 0;

  const cleaned = str.replace(/,/g, '').replace(/\s+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Đọc nội dung 1 file qua Papa.parse (Hỗ trợ Tab \t, dấu phẩy ,, dấu chấm phẩy ;)
 */
export function parseSingleFile(content: string, fileName: string): { fileName: string; rows: Record<string, any>[] } {
  let delimiter = '\t';
  const firstLine = content.split(/\r?\n/)[0] || '';
  if (!firstLine.includes('\t') && firstLine.includes(',')) {
    delimiter = ',';
  } else if (!firstLine.includes('\t') && firstLine.includes(';')) {
    delimiter = ';';
  }

  const parsed = Papa.parse<Record<string, any>>(content, {
    header: true,
    delimiter: delimiter,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => cleanString(header)
  });

  return {
    fileName,
    rows: parsed.data || []
  };
}

/**
 * BƯỚC 1: Đọc bất đồng bộ nhiều file (tối đa 5 file) qua Promise.all và gộp thành mergedData
 */
export async function parseMultipleFiles(files: File[]): Promise<MergedDataResult> {
  const filePromises = files.map((file) => {
    return new Promise<{ fileName: string; rows: Record<string, any>[] }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = (e.target?.result as string) || '';
          const result = parseSingleFile(content, file.name);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error(`Không thể đọc file: ${file.name}`));
      reader.readAsText(file, 'utf-8');
    });
  });

  const parsedFiles = await Promise.all(filePromises);

  const fileNames: string[] = [];
  const filesInfo: ParsedFileInfo[] = [];
  let mergedRows: Record<string, any>[] = [];

  for (const item of parsedFiles) {
    fileNames.push(item.fileName);
    filesInfo.push({
      fileName: item.fileName,
      rowCount: item.rows.length
    });
    // Gộp (merge) toàn bộ dữ liệu (array) từ các file này thành một mảng dữ liệu duy nhất
    mergedRows = mergedRows.concat(item.rows);
  }

  // Quét và tìm danh sách CÁC KHO DUY NHẤT (Unique "Tên kho")
  const warehouseMap = new Map<string, { totalRows: number; validRows: number }>();

  for (const row of mergedRows) {
    const rawKho = findColumnValue(row, ['Tên kho', 'Ten kho', 'Kho']);
    const cleanKho = cleanString(rawKho);
    if (!cleanKho) continue;

    const qtyRaw = findColumnValue(row, ['Tổng số lượng', 'Tong so luong', 'Số lượng', 'SL', 'Quantity']);
    const qty = parseQuantity(qtyRaw);

    const existing = warehouseMap.get(cleanKho) || { totalRows: 0, validRows: 0 };
    existing.totalRows += 1;
    if (qty > 0) {
      existing.validRows += 1;
    }
    warehouseMap.set(cleanKho, existing);
  }

  const detectedWarehouses: WarehouseInfo[] = Array.from(warehouseMap.entries()).map(([name, stats]) => ({
    name,
    totalRows: stats.totalRows,
    validRows: stats.validRows
  }));

  return {
    fileNames,
    filesInfo,
    mergedRows,
    totalRawRows: mergedRows.length,
    detectedWarehouses
  };
}

/**
 * Xử lý chuỗi text thô (ví dụ dữ liệu mẫu) thành MergedDataResult
 */
export function parseContentAsMergedData(content: string, fileName = 'sample.tsv'): MergedDataResult {
  const single = parseSingleFile(content, fileName);
  const warehouseMap = new Map<string, { totalRows: number; validRows: number }>();

  for (const row of single.rows) {
    const rawKho = findColumnValue(row, ['Tên kho', 'Ten kho', 'Kho']);
    const cleanKho = cleanString(rawKho);
    if (!cleanKho) continue;

    const qtyRaw = findColumnValue(row, ['Tổng số lượng', 'Tong so luong', 'Số lượng', 'SL', 'Quantity']);
    const qty = parseQuantity(qtyRaw);

    const existing = warehouseMap.get(cleanKho) || { totalRows: 0, validRows: 0 };
    existing.totalRows += 1;
    if (qty > 0) {
      existing.validRows += 1;
    }
    warehouseMap.set(cleanKho, existing);
  }

  const detectedWarehouses: WarehouseInfo[] = Array.from(warehouseMap.entries()).map(([name, stats]) => ({
    name,
    totalRows: stats.totalRows,
    validRows: stats.validRows
  }));

  return {
    fileNames: [fileName],
    filesInfo: [{ fileName, rowCount: single.rows.length }],
    mergedRows: single.rows,
    totalRawRows: single.rows.length,
    detectedWarehouses
  };
}

/**
 * BƯỚC 3: Vẽ Bảng dựa trên những kho được chọn từ Combo box
 * ĐIỀU KIỆN LỌC ĐỒNG THỜI (&&):
 * 1. Thuộc các kho được tick chọn
 * 2. VÀ Tổng số lượng > 0.
 * 
 * KHÔNG GIỚI HẠN SỐ DÒNG: 100% dòng được render.
 * Đánh lại STT bắt đầu từ 1 cho mỗi nhóm kho.
 * Nếu một kho không có sản phẩm nào có SL > 0, KHÔNG in dòng tiêu đề kho đó.
 */
export function buildReportFromMergedData(
  mergedData: MergedDataResult,
  selectedWarehouses: string[]
): TableReportData {
  // Tạo map chứa danh sách sản phẩm theo từng kho được chọn
  const groupMap = new Map<string, FilteredWarehouseItem[]>();
  for (const w of selectedWarehouses) {
    groupMap.set(w, []);
  }

  let totalFiltered = 0;
  let discardedCount = 0;

  for (const row of mergedData.mergedRows) {
    const rawKho = findColumnValue(row, ['Tên kho', 'Ten kho', 'Kho']);
    const cleanKho = cleanString(rawKho);

    const qtyRaw = findColumnValue(row, ['Tổng số lượng', 'Tong so luong', 'Số lượng', 'SL', 'Quantity']);
    const numericQuantity = parseQuantity(qtyRaw);

    // Tìm kho tương ứng trong danh sách được chọn
    const matchedWarehouse = selectedWarehouses.find(
      (w) => cleanString(w).toLowerCase() === cleanKho.toLowerCase()
    );

    // ĐIỀU KIỆN BẮT BUỘC ĐỒNG THỜI (&&):
    // 1. Kho nằm trong danh sách được tick chọn
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

    // Cột "Tên ĐVT": Đa cấp ưu tiên Level 3 (Viên) -> Level 2 (Vỉ) -> Level 1 (Hộp)
    const tenDvt = extractDvt(row);

    const currentItems = groupMap.get(matchedWarehouse) || [];
    const newStt = currentItems.length + 1;

    currentItems.push({
      stt: newStt,
      maShop: maShop || '-',
      tenShop: tenShop || '-',
      maKho: maKho || '-',
      tenKho: cleanKho || matchedWarehouse,
      maSanPham: maSanPham || '-',
      tenSanPham: tenSanPham || '-',
      tongSoLuong: qtyRaw || String(numericQuantity),
      tenDvt: tenDvt || '-'
    });

    groupMap.set(matchedWarehouse, currentItems);
    totalFiltered++;
  }

  // Chuyển thành danh sách nhóm (chỉ lấy nhóm có sản phẩm SL > 0)
  const groups: WarehouseGroup[] = [];
  for (const w of selectedWarehouses) {
    const items = groupMap.get(w) || [];
    if (items.length > 0) {
      groups.push({
        tenKho: w,
        items
      });
    }
  }

  return {
    fileNames: mergedData.fileNames,
    rawCount: mergedData.totalRawRows,
    filteredCount: totalFiltered,
    discardedCount,
    selectedWarehouses,
    groups
  };
}
