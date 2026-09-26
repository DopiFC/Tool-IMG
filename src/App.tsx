import React, { useState, useRef } from 'react';
import { Upload, Download, Copy, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import { ParseResult } from './types';
import { parseWarehouseCsv } from './utils/csvProcessor';
import { exportTableToImage, copyTableToClipboard } from './utils/imageExporter';
import { SAMPLE_TSV_DATA } from './data/sampleData';

export default function App() {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  /**
   * Kiểm tra định dạng file nghiêm ngặt: Chỉ chấp nhận đuôi .csv hoặc .txt
   * Chặn ngay lập tức các định dạng khác như .xlsx, .pdf... và thông báo Alert theo yêu cầu
   */
  const validateAndProcessFile = (file: File) => {
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv' && extension !== 'txt') {
      alert('Lỗi: Vui lòng tải lên đúng định dạng file CSV!');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content || !content.trim()) {
          alert('Lỗi: File tải lên không có nội dung dữ liệu!');
          return;
        }

        // Xử lý đọc file và bóc tách dữ liệu strictly trên RAM
        const result = parseWarehouseCsv(content, file.name);
        setParseResult(result);
      } catch (err: any) {
        alert('Lỗi khi đọc file: ' + (err?.message || 'Không thể xử lý dữ liệu file.'));
      }
    };

    reader.onerror = () => {
      alert('Lỗi: Không thể đọc được file đã chọn!');
    };

    reader.readAsText(file, 'utf-8');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Nạp dữ liệu mẫu nhanh để kiểm tra (chạy trực tiếp trên RAM)
  const handleLoadSample = () => {
    const result = parseWarehouseCsv(SAMPLE_TSV_DATA, 'du_lieu_mau_tab.tsv');
    setParseResult(result);
  };

  // Tải file ảnh với html2canvas scale 2, useCORS, Promise đợi render 100%
  const handleExportImage = async () => {
    if (!tableRef.current) {
      alert('Lỗi: Chưa có dữ liệu bảng để xuất ảnh!');
      return;
    }

    try {
      setIsExporting(true);
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = `Bao_Cao_Kho_Con_${timestamp}.png`;
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

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-900 flex flex-col font-sans">
      {/* Top Banner đặc trưng màu xanh Long Châu #1452A3 */}
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
              className="px-4 py-2 bg-[#E30019] hover:bg-[#c40015] text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              Nạp dữ liệu mẫu
            </button>
            {parseResult && (
              <button
                onClick={() => {
                  setParseResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
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

        {/* 1. KHU VỰC TẢI LÊN FILE CSV */}
        <section className="bg-white border border-[#cbd5e1] rounded-xl p-6 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#1452A3] mb-3 flex items-center gap-2">
            <span>1. Tải Lên File CSV / TXT (Phân cách dấu Tab)</span>
          </h2>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#E30019] bg-[#fff5f5]'
                : 'border-[#94a3b8] hover:border-[#1452A3] bg-[#f8fafc] hover:bg-[#f1f5f9]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 mx-auto text-[#1452A3] mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              Nhấp để chọn file hoặc kéo thả file CSV / TXT vào đây
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Chỉ chấp nhận file có đuôi <strong>.csv</strong> hoặc <strong>.txt</strong> (Tự động chặn các file khác)
            </p>
            <div className="mt-3">
              <span className="inline-block px-3 py-1 bg-[#E30019] hover:bg-[#c40015] text-white text-xs font-bold rounded-md shadow-xs">
                Chọn tệp CSV / TXT
              </span>
            </div>
          </div>

          {/* Thống kê dữ liệu đã lọc trên RAM */}
          {parseResult && (
            <div className="mt-4 pt-4 border-t border-[#e2edf8] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#f0f7ff] border border-[#cbe1f7] rounded-lg p-2.5">
                <span className="text-slate-500 block">Tên tệp:</span>
                <span className="font-bold text-[#1452A3] truncate block mt-0.5" title={parseResult.fileName}>
                  {parseResult.fileName}
                </span>
              </div>
              <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5">
                <span className="text-slate-500 block">Tổng dòng file gốc:</span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  {parseResult.rawCount} dòng
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2.5 text-emerald-900">
                <span className="block font-medium">Dòng giữ lại (3 kho &amp; SL &gt; 0):</span>
                <span className="font-bold text-sm block mt-0.5 text-emerald-700">
                  {parseResult.filteredCount} dòng
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700">
                <span className="text-slate-500 block">Dòng loại bỏ (Kho khác / SL=0):</span>
                <span className="font-bold text-sm block mt-0.5 text-slate-800">
                  {parseResult.discardedCount} dòng
                </span>
              </div>
            </div>
          )}
        </section>

        {/* 2. KHU VỰC HIỂN THỊ BẢNG KẾT QUẢ & NÚT XUẤT ẢNH */}
        {parseResult && (
          <section className="bg-white border border-[#cbd5e1] rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e2edf8]">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#1452A3]">
                  2. Bảng Kết Quả &amp; Xuất Báo Cáo
                </h2>
              </div>

              {/* Nút thao tác: Nút chính màu Đỏ Long Châu #E30019 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportImage}
                  disabled={isExporting}
                  className="px-5 py-2.5 bg-[#E30019] hover:bg-[#c40015] disabled:bg-red-300 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
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
                {/* Bảng HTML chuẩn - Render toàn bộ 100% dòng dữ liệu của 3 kho không cắt xén */}
                <table
                  style={{
                    fontFamily: "'Times New Roman', serif",
                    fontSize: '13px',
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #ccc',
                    backgroundColor: '#ffffff',
                    tableLayout: 'auto'
                  }}
                >
                  {/* Header Cột: Màu xanh dương đậm chuẩn Long Châu #1452A3, chữ Trắng in đậm */}
                  <thead>
                    <tr style={{ backgroundColor: '#1452A3', color: '#ffffff' }}>
                      <th style={{ border: '1px solid #ccc', padding: '6px 4px', textAlign: 'center', width: '45px', fontSize: '13px', fontWeight: 'bold' }}>
                        STT
                      </th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center', width: '85px', fontSize: '13px', fontWeight: 'bold' }}>
                        Mã shop
                      </th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'left', minWidth: '140px', fontSize: '13px', fontWeight: 'bold' }}>
                        Tên shop
                      </th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center', width: '80px', fontSize: '13px', fontWeight: 'bold' }}>
                        Mã kho
                      </th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'left', width: '130px', fontSize: '13px', fontWeight: 'bold' }}>
                        Tên kho
                      </th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center', width: '100px', fontSize: '13px', fontWeight: 'bold' }}>
                        Mã sản phẩm
                      </th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'left', minWidth: '220px', fontSize: '13px', fontWeight: 'bold' }}>
                        Tên sản phẩm
                      </th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'right', width: '100px', fontSize: '13px', fontWeight: 'bold' }}>
                        Tổng số lượng
                      </th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center', width: '75px', fontSize: '13px', fontWeight: 'bold' }}>
                        Tên ĐVT
                      </th>
                    </tr>
                  </thead>

                  {/* Body chứa các nhóm kho */}
                  <tbody>
                    {parseResult.groups.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          style={{
                            border: '1px solid #ccc',
                            padding: '16px',
                            textAlign: 'center',
                            fontStyle: 'italic',
                            fontSize: '13px'
                          }}
                        >
                          Không có dòng dữ liệu nào thuộc 3 kho thỏa mãn điều kiện số lượng &gt; 0.
                        </td>
                      </tr>
                    ) : (
                      parseResult.groups.map((group, groupIdx) => {
                        // LOGIC: Nếu một kho sau khi lọc số lượng > 0 mà không có sản phẩm nào thì KHÔNG IN
                        if (!group.items || group.items.length === 0) return null;

                        return (
                          <React.Fragment key={`grp-${groupIdx}-${group.tenKho}`}>
                            {/* Hàng Tiêu Đề Gộp Cột (Colspan) Nền Xanh Dương Đậm #1452A3, chữ Trắng, in đậm, CĂN GIỮA */}
                            <tr style={{ backgroundColor: '#1452A3', color: '#ffffff' }}>
                              <td
                                colSpan={9}
                                style={{
                                  border: '1px solid #ccc',
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
                                <td style={{ border: '1px solid #ccc', padding: '5px 4px', textAlign: 'center', fontSize: '13px' }}>
                                  {item.stt}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '5px 6px', textAlign: 'center', fontSize: '13px' }}>
                                  {item.maShop}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left', fontSize: '13px' }}>
                                  {item.tenShop}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '5px 6px', textAlign: 'center', fontSize: '13px' }}>
                                  {item.maKho}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left', fontSize: '13px' }}>
                                  {item.tenKho}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '5px 6px', textAlign: 'center', fontSize: '13px' }}>
                                  {item.maSanPham}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left', fontSize: '13px' }}>
                                  {item.tenSanPham}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>
                                  {item.tongSoLuong}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '5px 6px', textAlign: 'center', fontSize: '13px' }}>
                                  {item.tenDvt}
                                </td>
                              </tr>
                            ))}
                            {/* TUYỆT ĐỐI KHÔNG HIỂN THỊ DÒNG TỔNG CỘNG HAY CỘNG NHÓM Ở CUỐI TỪNG NHÓM KHO */}
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
