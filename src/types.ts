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

export interface ParseResult {
  rawCount: number;
  filteredCount: number;
  discardedCount: number;
  groups: WarehouseGroup[];
  fileName: string;
}
