import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Download,
  Copy,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Files,
  Eye,
  Check
} from 'lucide-react';
import { MergedDataResult, TableReportData } from './types';
import {
  parseMultipleFiles,
  parseContentAsMergedData,
  buildReportFromMergedData
} from './utils/csvProcessor';
import { exportTableToImage, copyTableToClipboard } from './utils/imageExporter';
import { SAMPLE_TSV_DATA } from './data/sampleData';

export default function App() {
  const [mergedData, setMergedData] = useState<MergedDataResult | null>(null);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [reportData, setReportData] = useState<TableReportData | null>(null);

  // Trạng thái mở/đóng Custom Dropdown Combo Box
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * BƯỚC 1: Xử lý nhiều file cùng lúc (Tối đa 5 file)
   */
  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files || files.length === 0) return;

    // Kiểm tra tối đa 5 file
    if (files.length > 5) {
      alert(`Lỗi: Bạn đã chọn ${files.length} file. Hệ thống chỉ cho phép tải lên tối đa 5 file cùng lúc!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Kiểm tra định dạng từng file
    for (const f of files) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'txt') {
        alert(`Lỗi: File "${f.name}" không đúng định dạng! Hệ thống chỉ chấp nhận file .csv hoặc .txt.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    try {
      setIsLoading(true);
      // Sử dụng Promise.all() kết hợp Papa.parse để đọc bất đồng bộ tất cả các file
      const result = await parseMultipleFiles(files);

      if (result.detectedWarehouses.length === 0) {
        alert('Không tìm thấy thông tin cột "Tên kho" trong các file tải lên!');
        setIsLoading(false);
        return;
      }

      setMergedData(result);

      // Mặc định chọn tất cả các kho có sản phẩm > 0
      const validKho = result.detectedWarehouses
        .filter((w) => w.validRows > 0)
        .map((w) => w.name);

      const initialSelected = validKho.length > 0 ? validKho : result.detectedWarehouses.map((w) => w.name);
      setSelectedWarehouses(initialSelected);

      // Reset bảng kết quả cũ để chờ người dùng bấm "Hiển thị dữ liệu"
      setReportData(null);
      setIsDropdownOpen(false);
    } catch (err: any) {
      alert('Lỗi khi đọc file: ' + (err?.message || 'Không thể xử lý dữ liệu file.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Nạp dữ liệu mẫu để kiểm tra nhanh
  const handleLoadSample = () => {
    const sampleMerged = parseContentAsMergedData(SAMPLE_TSV_DATA, 'du_lieu_mau_3_kho.tsv');
    setMergedData(sampleMerged);

    const validKho = sampleMerged.detectedWarehouses
      .filter((w) => w.validRows > 0)
      .map((w) => w.name);
    setSelectedWarehouses(validKho);

    // Vẽ sẵn bảng cho dữ liệu mẫu
    const report = buildReportFromMergedData(sampleMerged, validKho);
    setReportData(report);
    setIsDropdownOpen(false);
  };

  // Toggle kho đơn lẻ
  const handleToggleWarehouse = (warehouseName: string) => {
    setSelectedWarehouses((prev) =>
      prev.includes(warehouseName)
        ? prev.filter((name) => name !== warehouseName)
        : [...prev, warehouseName]
    );
  };

  /**
   * BƯỚC 2: Chức năng "Chọn tất cả" (Toggle duy nhất 1 nút):
   * Logic: Ấn lần 1 -> Tick chọn toàn bộ kho; Ấn lần 2 -> Bỏ tick toàn bộ.
   */
  const handleToggleSelectAll = () => {
    if (!mergedData) return;
    const allWarehouseNames = mergedData.detectedWarehouses.map((w) => w.name);
    // Nếu hiện tại đã chọn đủ tất cả -> Bỏ tick toàn bộ
    if (selectedWarehouses.length === allWarehouseNames.length) {
      setSelectedWarehouses([]);
    } else {
      // Nếu chưa chọn hết hoặc đang rỗng -> Tick chọn toàn bộ
      setSelectedWarehouses(allWarehouseNames);
    }
  };

  /**
   * BƯỚC 3: Nút "Hiển thị dữ liệu" -> vẽ Bảng dựa trên những kho được tick trong combo box
   */
  const handleGenerateReport = () => {
    if (!mergedData) {
      alert('Vui lòng tải lên file CSV/TXT trước!');
      return;
    }

    if (selectedWarehouses.length === 0) {
      alert('Vui lòng tick chọn ít nhất 1 kho trong Combo box để hiển thị dữ liệu!');
      return;
    }

    const report = buildReportFromMergedData(mergedData, selectedWarehouses);
    setReportData(report);
    setIsDropdownOpen(false);

    // Cuộn nhẹ xuống bảng kết quả sau khi render
    setTimeout(() => {
      const tableSection = document.getElementById('report-section');
      if (tableSection) {
        tableSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Xuất ảnh bảng với html2canvas scale: 2, useCORS: true, scrollY: -window.scrollY
  const handleExportImage = async () => {
    if (!tableRef.current) {
      alert('Lỗi: Chưa có dữ liệu bảng để xuất ảnh!');
      return;
    }

    try {
      setIsExporting(true);
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = `Bao_Cao_Kho_${timestamp}.png`;
      await exportTableToImage(tableRef.current, fileName);
    } catch (err: any) {
      alert('Lỗi xuất ảnh: ' + (err?.message || 'Không thể tạo file ảnh.'));
    } finally {
      setIsExporting(false);
    }
  };

  // Sao chép ảnh vào Clipboard
  const handleCopyClipboard = async () => {
    if (!tableRef.current) return;

    try {
      setIsExporting(true);
      await copyTableToClipboard(tableRef.current);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err: any) {
      alert('Lỗi sao chép: ' + (err?.message || 'Trình duyệt chưa hỗ trợ sao chép ảnh trực tiếp.'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearAll = () => {
    setMergedData(null);
    setSelectedWarehouses([]);
    setReportData(null);
    setIsDropdownOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isAllSelected =
    mergedData &&
    mergedData.detectedWarehouses.length > 0 &&
    selectedWarehouses.length === mergedData.detectedWarehouses.length;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-900 flex flex-col font-sans">
      {/* Top Header màu xanh Long Châu #1452A3 */}
      <header className="bg-[#1452A3] text-white shadow-md border-b-4 border-[#0b3c7b]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white text-[#1452A3] flex items-center justify-center font-black text-xl shadow-xs">
              LC
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                Tool IMG
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              type="button"
              className="px-4 py-2 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              Nạp dữ liệu mẫu
            </button>
            {mergedData && (
              <button
                onClick={handleClearAll}
                type="button"
                className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                Xóa dữ liệu
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* 1. KHU VỰC TẢI LÊN FILE CSV / TXT (HỖ TRỢ TỐI ĐA 5 FILE) */}
        <section className="bg-white border border-[#cbd5e1] rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1452A3] flex items-center gap-2">
              <Files className="w-4 h-4" />
              <span>1. Tải Lên File CSV / TXT (Chọn tối đa 5 file)</span>
            </h2>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              Đọc đồng thời qua Promise.all &amp; PapaParse
            </span>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#D32F2F] bg-[#fff5f5]'
                : 'border-[#94a3b8] hover:border-[#1452A3] bg-[#f8fafc] hover:bg-[#f1f5f9]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.txt"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 mx-auto text-[#1452A3] mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              Nhấp để chọn 1 hoặc nhiều file (tối đa 5 file) hoặc kéo thả vào đây
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Chấp nhận file <strong>.csv</strong> hoặc <strong>.txt</strong> (Phân cách Tab hoặc phẩy). Tự động gộp dữ liệu các file thành mảng duy nhất.
            </p>
            <div className="mt-3">
              <span className="inline-block px-4 py-1.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold rounded-md shadow-xs">
                Chọn tệp (Tối đa 5 file)
              </span>
            </div>
          </div>

          {isLoading && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center text-xs font-semibold text-[#1452A3] flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang đọc và gộp dữ liệu từ các file...</span>
            </div>
          )}

          {/* Thống kê ban đầu khi các file được tải lên và gộp thành công */}
          {mergedData && !isLoading && (
            <div className="mt-4 pt-4 border-t border-[#e2edf8] space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-700">Các file đã nạp ({mergedData.filesInfo.length} file):</span>
                {mergedData.filesInfo.map((fi, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f0f7ff] border border-[#cbe1f7] text-[#1452A3] rounded-md font-medium"
                  >
                    <span>{fi.fileName}</span>
                    <span className="text-[10px] text-slate-500">({fi.rowCount} dòng)</span>
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5">
                  <span className="text-slate-500 block">Tổng dòng file gốc gộp (mergedData):</span>
                  <span className="font-bold text-slate-900 text-sm block mt-0.5">
                    {mergedData.totalRawRows} dòng
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2.5 text-emerald-900">
                  <span className="block font-medium">Số kho duy nhất tìm thấy:</span>
                  <span className="font-bold text-sm block mt-0.5 text-emerald-700">
                    {mergedData.detectedWarehouses.length} kho
                  </span>
                </div>
                <div className="bg-[#f0f7ff] border border-[#cbe1f7] rounded-lg p-2.5 text-[#1452A3]">
                  <span className="block font-medium">Số kho đang được tick:</span>
                  <span className="font-bold text-sm block mt-0.5">
                    {selectedWarehouses.length} / {mergedData.detectedWarehouses.length} kho
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2. KHU VỰC COMBO BOX CHỌN KHO & NÚT TOGGLE CHỌN TẤT CẢ */}
        {mergedData && !isLoading && (
          <section className="bg-white border border-[#cbd5e1] rounded-xl p-6 shadow-xs space-y-4">
            <div className="border-b border-[#e2edf8] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#1452A3]">
                2. Chọn Kho Cần Hiển Thị
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Tự động lọc các kho duy nhất từ mảng dữ liệu đã gộp. Sử dụng Combo box bên dưới để chọn các kho bạn muốn xem:
              </p>
            </div>

            {/* Hàng điều khiển Combo Box, Nút Toggle và Nút Hiển thị dữ liệu */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* CUSTOM DROPDOWN CHECKBOX (COMBO BOX) */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="min-w-[260px] sm:min-w-[320px] px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-[#1452A3] rounded-lg text-xs font-bold inline-flex items-center justify-between gap-2 shadow-xs cursor-pointer transition-all"
                  >
                    <span className="truncate">
                      {selectedWarehouses.length === 0
                        ? 'Chưa chọn kho nào'
                        : selectedWarehouses.length === mergedData.detectedWarehouses.length
                        ? `Đã chọn tất cả (${selectedWarehouses.length} kho)`
                        : `Đã chọn ${selectedWarehouses.length} / ${mergedData.detectedWarehouses.length} kho`}
                    </span>
                    {isDropdownOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#1452A3] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#1452A3] shrink-0" />
                    )}
                  </button>

                  {/* DANH SÁCH SỔ XUỐNG KHI BẤM VÀO COMBO BOX */}
                  {isDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-full sm:w-[380px] bg-white border border-slate-300 rounded-lg shadow-xl z-50 p-2 space-y-1 max-h-[320px] overflow-y-auto">
                      <div className="px-2 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                        <span>Danh sách kho duy nhất ({mergedData.detectedWarehouses.length})</span>
                        <span className="text-[#1452A3] lowercase font-normal">
                          {selectedWarehouses.length} được tick
                        </span>
                      </div>

                      {mergedData.detectedWarehouses.map((warehouse) => {
                        const isChecked = selectedWarehouses.includes(warehouse.name);
                        return (
                          <div
                            key={warehouse.name}
                            onClick={() => handleToggleWarehouse(warehouse.name)}
                            className={`flex items-start gap-2.5 p-2 rounded-md cursor-pointer select-none transition-colors ${
                              isChecked
                                ? 'bg-[#f0f7ff] text-[#1452A3]'
                                : 'hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="mt-0.5 h-4 w-4 rounded text-[#1452A3] focus:ring-[#1452A3] cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold truncate">
                                {warehouse.name}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                                <span>{warehouse.totalRows} dòng</span>
                                {warehouse.validRows > 0 ? (
                                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-1 rounded border border-emerald-200">
                                    {warehouse.validRows} SP &gt; 0
                                  </span>
                                ) : (
                                  <span className="text-rose-600 bg-rose-50 px-1 rounded border border-rose-200">
                                    0 SP &gt; 0
                                  </span>
                                )}
                              </div>
                            </div>
                            {isChecked && <Check className="w-3.5 h-3.5 text-[#1452A3] shrink-0 mt-0.5" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ĐÚNG 1 NÚT TOGGLE "CHỌN TẤT CẢ" (Ấn 1: Tick all; Ấn 2: Bỏ tick all) */}
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className={`px-3.5 py-2.5 border rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs ${
                    isAllSelected
                      ? 'bg-blue-50 border-[#1452A3] text-[#1452A3] hover:bg-blue-100'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                  title={isAllSelected ? 'Nhấp để bỏ chọn toàn bộ kho' : 'Nhấp để chọn toàn bộ kho'}
                >
                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${isAllSelected ? 'bg-[#1452A3] border-[#1452A3] text-white' : 'border-slate-400 bg-white'}`}>
                    {isAllSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                  <span>{isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
                </button>
              </div>

              {/* NÚT CHÍNH: HIỂN THỊ DỮ LIỆU - MÀU ĐỎ #D32F2F */}
              <button
                type="button"
                onClick={handleGenerateReport}
                className="px-6 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm shrink-0"
              >
                <Eye className="w-4 h-4" />
                <span>Hiển thị dữ liệu ({selectedWarehouses.length} kho)</span>
              </button>
            </div>
          </section>
        )}

        {/* 3. BƯỚC 3: KHU VỰC HIỂN THỊ BẢNG KẾT QUẢ & NÚT XUẤT ẢNH */}
        {reportData && (
          <section id="report-section" className="bg-white border border-[#cbd5e1] rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e2edf8]">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#1452A3]">
                  3. Bảng Kết Quả &amp; Xuất Báo Cáo
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600">
                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Kho hiển thị: <strong>{reportData.groups.length} kho</strong>
                  </span>
                  <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                    Tổng sản phẩm (SL &gt; 0): <strong>{reportData.filteredCount} dòng</strong>
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    Loại bỏ (SL = 0 / Kho khác): <strong>{reportData.discardedCount} dòng</strong>
                  </span>
                </div>
              </div>

              {/* Nút thao tác: Nút chính màu Đỏ Long Châu #D32F2F */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportImage}
                  disabled={isExporting}
                  className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] disabled:bg-red-300 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  {isExporting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Xuất thành Ảnh (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  disabled={isExporting}
                  className="px-4 py-2.5 bg-[#1452A3] hover:bg-[#0b3c7b] disabled:bg-blue-300 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4 text-white" />}
                  <span>{isCopied ? 'Đã sao chép!' : 'Sao chép ảnh'}</span>
                </button>
              </div>
            </div>

            {/* Container bảng dữ liệu cho phép cuộn tự do, không set cố định chiều cao */}
            <div className="w-full overflow-x-auto overflow-y-visible bg-[#f8fafc] p-4 border border-[#cbd5e1] rounded-lg">
              <div
                ref={tableRef}
                id="export-container"
                style={{
                  backgroundColor: '#ffffff',
                  padding: '16px',
                  fontFamily: "'Times New Roman', serif",
                  fontSize: '13px',
                  color: '#000000',
                  width: 'fit-content',
                  minWidth: '100%',
                  height: 'auto',
                  overflow: 'visible'
                }}
              >
                {/* Bảng HTML chuẩn: Times New Roman 13px, Viền bảng 1px solid black rõ nét */}
                <table
                  style={{
                    fontFamily: "'Times New Roman', serif",
                    fontSize: '13px',
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid black',
                    backgroundColor: '#ffffff',
                    tableLayout: 'auto'
                  }}
                >
                  {/* Header Cột: Màu xanh dương đậm chuẩn Long Châu #1452A3, chữ Trắng in đậm */}
                  <thead>
                    <tr style={{ backgroundColor: '#1452A3', color: '#ffffff' }}>
                      <th style={{ border: '1px solid black', padding: '6px 4px', textAlign: 'center', width: '45px', fontSize: '13px', fontWeight: 'bold' }}>
                        STT
                      </th>
                      <th style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center', width: '85px', fontSize: '13px', fontWeight: 'bold' }}>
                        Mã shop
                      </th>
                      <th style={{ border: '1px solid black', padding: '6px 10px', textAlign: 'left', minWidth: '140px', fontSize: '13px', fontWeight: 'bold' }}>
                        Tên shop
                      </th>
                      <th style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center', width: '80px', fontSize: '13px', fontWeight: 'bold' }}>
                        Mã kho
                      </th>
                      <th style={{ border: '1px solid black', padding: '6px 10px', textAlign: 'left', width: '130px', fontSize: '13px', fontWeight: 'bold' }}>
                        Tên kho
                      </th>
                      <th style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center', width: '100px', fontSize: '13px', fontWeight: 'bold' }}>
                        Mã sản phẩm
                      </th>
                      <th style={{ border: '1px solid black', padding: '6px 10px', textAlign: 'left', minWidth: '220px', fontSize: '13px', fontWeight: 'bold' }}>
                        Tên sản phẩm
                      </th>
                      <th style={{ border: '1px solid black', padding: '6px 10px', textAlign: 'right', width: '100px', fontSize: '13px', fontWeight: 'bold' }}>
                        Tổng số lượng
                      </th>
                      <th style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'center', width: '75px', fontSize: '13px', fontWeight: 'bold' }}>
                        Tên ĐVT
                      </th>
                    </tr>
                  </thead>

                  {/* Body chứa các nhóm kho đã tick chọn */}
                  <tbody>
                    {reportData.groups.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          style={{
                            border: '1px solid black',
                            padding: '16px',
                            textAlign: 'center',
                            fontStyle: 'italic',
                            fontSize: '13px'
                          }}
                        >
                          Không có sản phẩm nào thỏa mãn điều kiện số lượng &gt; 0 trong các kho đã chọn.
                        </td>
                      </tr>
                    ) : (
                      reportData.groups.map((group, groupIdx) => {
                        // LOGIC: Nếu một kho sau khi lọc số lượng > 0 mà không có sản phẩm nào thì KHÔNG IN
                        if (!group.items || group.items.length === 0) return null;

                        return (
                          <React.Fragment key={`grp-${groupIdx}-${group.tenKho}`}>
                            {/* Hàng Tiêu Đề Gộp Cột (Colspan) Nền Xanh Navy #1452A3, chữ Trắng, in đậm, CĂN GIỮA */}
                            <tr style={{ backgroundColor: '#1452A3', color: '#ffffff' }}>
                              <td
                                colSpan={9}
                                style={{
                                  border: '1px solid black',
                                  padding: '8px 10px',
                                  fontWeight: 'bold',
                                  fontSize: '13px',
                                  backgroundColor: '#1452A3',
                                  color: '#ffffff',
                                  textAlign: 'center'
                                }}
                              >
                                NHÓM KHO: {group.tenKho.toUpperCase()}
                              </td>
                            </tr>

                            {/* Danh Sách Sản Phẩm - RENDER 100% TOÀN BỘ DÒNG (Không giới hạn) */}
                            {group.items.map((item) => (
                              <tr key={`row-${groupIdx}-${item.stt}-${item.maSanPham}`} style={{ backgroundColor: '#ffffff' }}>
                                <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'center', fontSize: '13px' }}>
                                  {item.stt}
                                </td>
                                <td style={{ border: '1px solid black', padding: '5px 6px', textAlign: 'center', fontSize: '13px' }}>
                                  {item.maShop}
                                </td>
                                <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'left', fontSize: '13px' }}>
                                  {item.tenShop}
                                </td>
                                <td style={{ border: '1px solid black', padding: '5px 6px', textAlign: 'center', fontSize: '13px' }}>
                                  {item.maKho}
                                </td>
                                <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'left', fontSize: '13px' }}>
                                  {item.tenKho}
                                </td>
                                <td style={{ border: '1px solid black', padding: '5px 6px', textAlign: 'center', fontSize: '13px' }}>
                                  {item.maSanPham}
                                </td>
                                <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'left', fontSize: '13px' }}>
                                  {item.tenSanPham}
                                </td>
                                <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>
                                  {item.tongSoLuong}
                                </td>
                                <td style={{ border: '1px solid black', padding: '5px 6px', textAlign: 'center', fontSize: '13px' }}>
                                  {item.tenDvt}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* Footer chuẩn Copyright Bao2026 */}
      <footer className="mt-auto bg-[#1452A3] text-white py-4 border-t-2 border-[#0b3c7b] text-center text-xs">
        <p className="font-semibold tracking-wide">
          Copyright Bao2026
        </p>
      </footer>
    </div>
  );
}
