export interface FilteredWarehouseItem {
  stt: number;          // Reset to 1..N per warehouse group
  maShop: string;
  tenShop: string;
  maKho: string;
  tenKho: string;
  maSanPham: string;
  tenSanPham: string;
  tongSoLuong: number | string;
  tenDvt: string;       // ĐVT đa cấp: Ưu tiên L3 (Viên) -> L2 (Vỉ) -> L1 (Hộp)
}

export interface WarehouseGroup {
  tenKho: string;
  items: FilteredWarehouseItem[];
}

export interface WarehouseInfo {
  name: string;
  totalRows: number;
  validRows: number; // rows with quantity > 0
}

export interface ParsedFileInfo {
  fileName: string;
  rowCount: number;
}

export interface MergedDataResult {
  fileNames: string[];
  filesInfo: ParsedFileInfo[];
  mergedRows: Record<string, any>[];
  totalRawRows: number;
  detectedWarehouses: WarehouseInfo[];
}

export interface TableReportData {
  fileNames: string[];
  rawCount: number;
  filteredCount: number;
  discardedCount: number;
  selectedWarehouses: string[];
  groups: WarehouseGroup[];
}

// Giữ lại kiểu tương thích ngược
export type ParseResult = TableReportData;
