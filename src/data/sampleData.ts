// Dữ liệu mẫu chuẩn định dạng Tab-Separated Values (\t)
// Đầy đủ 3 kho mục tiêu theo nhận diện Nhà thuốc Long Châu:
// 1. Kho hàng KM (15+ sản phẩm thỏa mãn)
// 2. Kho hàng chờ xử lý (hỗ trợ cả text 'Kho chờ xử lý', 15+ sản phẩm thỏa mãn)
// 3. Kho hành chính (15+ sản phẩm thỏa mãn)
//
// Đặc biệt: Cấu trúc cột ĐVT đa cấp đúng chuẩn thực tế:
// - Cột "Tổng số lượng" đại diện cho ĐƠN VỊ NHỎ NHẤT của sản phẩm
// - Cột "Tên ĐVT L3" (Ví dụ: Viên, Gói nhỏ, Ống con) - Ưu tiên 1
// - Cột "Tên ĐVT L2" (Ví dụ: Vỉ, Vĩ, Hộp con) - Ưu tiên 2
// - Cột "Tên ĐVT L1" (Ví dụ: Hộp, Chai, Tuýp, Thùng) - Ưu tiên 3
//
// Kèm các case kiểm chứng nghiêm ngặt:
// - Sản phẩm có đầy đủ L1, L2, L3 -> Bắt buộc lấy L3 (Ví dụ 300 Viên)
// - Sản phẩm chỉ có L1, L2 -> Lấy L2
// - Sản phẩm chỉ có L1 -> Lấy L1
// - Sản phẩm có Số lượng = 0 -> Bắt buộc bị LOẠI BỎ hoàn toàn
// - Sản phẩm thuộc kho khác (Kho tổng, Kho bảo hành) -> Bắt buộc bị LOẠI BỎ
export const SAMPLE_TSV_DATA = [
  ['Mã shop', 'Tên shop', 'Mã kho', 'Tên kho', 'Mã sản phẩm', 'Tên sản phẩm', 'Tổng số lượng', 'Tên ĐVT L1', 'Tên ĐVT L2', 'Tên ĐVT L3'].join('\t'),

  // ===================== NHÓM 1: Kho hàng KM =====================
  // Case chuẩn yêu cầu: L1="Hộp", L2="Vỉ", L3="Viên" -> Tổng SL 300 phải hiển thị ĐVT là "Viên"
  ['LC01', 'Nhà thuốc Long Châu Q1', 'KM01', 'Kho hàng KM', 'LC-101', 'Thuốc giảm đau Panadol Extra Đỏ 500mg', '300', 'Hộp', 'Vỉ', 'Viên'].join('\t'),
  ['LC01', 'Nhà thuốc Long Châu Q1', 'KM01', 'Kho hàng KM', 'LC-102', 'Viên sủi tăng đề kháng Berocca Cam', '450', 'Hộp', 'Tuýp', 'Viên'].join('\t'),
  ['LC02', 'Nhà thuốc Long Châu Q3', 'KM01', 'Kho hàng KM', 'LC-103', 'Men vi sinh Enterogermina 4 tỷ bào tử', '240', 'Hộp', 'Vỉ', 'Ống'].join('\t'),
  ['LC02', 'Nhà thuốc Long Châu Q3', 'KM01', 'Kho hàng KM', 'LC-104', 'Cốm tiêu hóa Bio-acimin Gold Plus', '600', 'Hộp', 'Gói nhỏ', 'Gói'].join('\t'),
  ['LC01', 'Nhà thuốc Long Châu Q1', 'KM01', 'Kho hàng KM', 'LC-105', 'Khẩu trang y tế 4 lớp kháng khuẩn LC Safe', '1500', 'Thùng', 'Hộp', 'Cái'].join('\t'),
  ['LC02', 'Nhà thuốc Long Châu Q3', 'KM01', 'Kho hàng KM', 'LC-106', 'Dầu nóng xoa bóp Salonpas Gel 30g', '85', 'Hộp', '', 'Tuýp'].join('\t'),
  ['LC01', 'Nhà thuốc Long Châu Q1', 'KM01', 'Kho hàng KM', 'LC-107', 'Siro ho thảo dược Prospan chai 100ml', '120', 'Hộp', 'Chai', ''].join('\t'),
  ['LC02', 'Nhà thuốc Long Châu Q3', 'KM01', 'Kho hàng KM', 'LC-108', 'Nước muối sinh lý Fysoline kháng khuẩn', '320', 'Hộp', 'Vỉ', 'Ống'].join('\t'),
  ['LC01', 'Nhà thuốc Long Châu Q1', 'KM01', 'Kho hàng KM', 'LC-109', 'Bông y tế cắt sẵn tiệt trùng Bạch Tuyết 500g', '95', 'Thùng', 'Gói', ''].join('\t'),
  ['LC02', 'Nhà thuốc Long Châu Q3', 'KM01', 'Kho hàng KM', 'LC-110', 'Băng dán cá nhân Urgo Waterproof màng thở', '420', 'Hộp', '', 'Miếng'].join('\t'),
  ['LC01', 'Nhà thuốc Long Châu Q1', 'KM01', 'Kho hàng KM', 'LC-111', 'Viên ngậm đau họng Strepsils Mật Ong Chanh', '680', 'Hộp', 'Vỉ', 'Viên'].join('\t'),
  ['LC02', 'Nhà thuốc Long Châu Q3', 'KM01', 'Kho hàng KM', 'LC-112', 'Xịt mũi cá heo Sterimar kháng viêm 50ml', '65', 'Chai', '', ''].join('\t'),
  ['LC01', 'Nhà thuốc Long Châu Q1', 'KM01', 'Kho hàng KM', 'LC-113', 'Bột điện giải Oresol hương cam Pluz', '500', 'Hộp', '', 'Gói'].join('\t'),
  ['LC02', 'Nhà thuốc Long Châu Q3', 'KM01', 'Kho hàng KM', 'LC-114', 'Nhiệt kế điện tử hồng ngoại đo trán Microlife', '40', 'Chiếc', '', ''].join('\t'),
  // Case kiểm chứng số lượng = 0 (Bắt buộc bị loại bỏ)
  ['LC01', 'Nhà thuốc Long Châu Q1', 'KM01', 'Kho hàng KM', 'LC-115', 'Mặt hàng KM tồn kho bằng 0 (Test loại bỏ)', '0', 'Hộp', 'Vỉ', 'Viên'].join('\t'),

  // ===================== NHÓM 2: Kho hàng chờ xử lý =====================
  ['LC03', 'Nhà thuốc Long Châu Tân Bình', 'CZ02', 'Kho hàng chờ xử lý', 'LC-201', 'Máy đo huyết áp bắp tay tự động Omron HEM-7120', '35', 'Chiếc', '', ''].join('\t'),
  ['LC03', 'Nhà thuốc Long Châu Tân Bình', 'CZ02', 'Kho hàng chờ xử lý', 'LC-202', 'Máy xông khí dung mũi họng Beurer IH18', '28', 'Bộ', '', ''].join('\t'),
  ['LC01', 'Nhà thuốc Long Châu Q1', 'CZ02', 'Kho chờ xử lý', 'LC-203', 'Cân sức khỏe điện tử thông minh Xiaomi Gen 2', '45', 'Cái', '', ''].join('\t'),
  ['LC03', 'Nhà thuốc Long Châu Tân Bình', 'CZ02', 'Kho chờ xử lý', 'LC-204', 'Viên bổ não Ginkgo Biloba 120mg Nature Made', '180', 'Hộp', '', 'Viên'].join('\t'),
  ['LC03', 'Nhà thuốc Long Châu Tân Bình', 'CZ02', 'Kho hàng chờ xử lý', 'LC-205', 'Que thử đường huyết Accu-Chek Instant 50 que', '75', 'Hộp', '', 'Que'].join('\t'),
  ['LC01', 'Nhà thuốc Long Châu Q1', 'CZ02', 'Kho chờ xử lý', 'LC-206', 'Dung dịch nhỏ mắt nhỏ mũi Efticol 0.9%', '360', 'Hộp', 'Lốc', 'Lọ'].join('\t'),
  ['LC03', 'Nhà thuốc Long Châu Tân Bình', 'CZ02', 'Kho hàng chờ xử lý', 'LC-207', 'Thuốc bôi ngoài da trị nấm Canesten 20g', '90', 'Hộp', '', 'Tuýp'].join('\t'),
  ['LC01', 'Nhà thuốc Long Châu Q1', 'CZ02', 'Kho chờ xử lý', 'LC-208', 'Vitamin C sủi Plussz Cam 20 viên', '220', 'Hộp', 'Tuýp', 'Viên'].join('\t'),
  ['LC03', 'Nhà thuốc Long Châu Tân Bình', 'CZ02', 'Kho hàng chờ xử lý', 'LC-209', 'Sữa dinh dưỡng y học Ensure Gold 850g', '52', 'Thùng', '', 'Lon'].join('\t'),
  ['LC01', 'Nhà thuốc Long Châu Q1', 'CZ02', 'Kho chờ xử lý', 'LC-210', 'Dầu cù là Sao Vàng truyền thống 10g', '310', 'Lốc', '', 'Hộp'].join('\t'),
  ['LC03', 'Nhà thuốc Long Châu Tân Bình', 'CZ02', 'Kho hàng chờ xử lý', 'LC-211', 'Nước súc miệng diệt khuẩn Betadine họng 125ml', '85', 'Hộp', '', 'Chai'].join('\t'),
  ['LC01', 'Nhà thuốc Long Châu Q1', 'CZ02', 'Kho chờ xử lý', 'LC-212', 'Gạc y tế tiệt trùng đóng gói sẵn 10x10cm', '480', 'Hộp', '', 'Gói'].join('\t'),
  ['LC03', 'Nhà thuốc Long Châu Tân Bình', 'CZ02', 'Kho hàng chờ xử lý', 'LC-213', 'Gel trị sẹo mờ thâm Dermatix Ultra 15g', '60', 'Hộp', '', 'Tuýp'].join('\t'),
  // Case kiểm chứng số lượng = 0 (Bắt buộc bị loại bỏ)
  ['LC03', 'Nhà thuốc Long Châu Tân Bình', 'CZ02', 'Kho hàng chờ xử lý', 'LC-214', 'Mặt hàng hỏng chờ xử lý SL=0 (Test loại bỏ)', '0', 'Hộp', 'Vỉ', 'Viên'].join('\t'),

  // ===================== NHÓM 3: Kho hành chính =====================
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-301', 'Giấy in hóa đơn nhiệt K80x45mm quầy thu ngân', '600', 'Thùng', '', 'Cuộn'].join('\t'),
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-302', 'Túi đựng thuốc tự hủy sinh học Long Châu cỡ S', '250', 'Bao', '', 'Kg'].join('\t'),
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-303', 'Túi đựng thuốc tự hủy sinh học Long Châu cỡ M', '180', 'Bao', '', 'Kg'].join('\t'),
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-304', 'Giấy in A4 Double A 70gsm phục vụ văn phòng', '320', 'Thùng', '', 'Ram'].join('\t'),
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-305', 'Hộp mực máy in hóa đơn HP Laser 12A', '45', 'Hộp', '', 'Cái'].join('\t'),
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-306', 'Bút bi ký đơn thuốc Thiên Long 0.5mm xanh', '750', 'Hộp', '', 'Cây'].join('\t'),
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-307', 'Cồn sát khuẩn tay nhanh dung tích 500ml quầy', '140', 'Thùng', '', 'Chai'].join('\t'),
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-308', 'Khăn giấy lụa quầy dược sĩ Pulppy 180 tờ', '220', 'Thùng', '', 'Hộp'].join('\t'),
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-309', 'Băng dính đóng gói bưu phẩm Long Châu 5cm', '95', 'Cây', '', 'Cuộn'].join('\t'),
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-310', 'Kẹp bướm sắt tài liệu văn phòng Deli 19mm', '160', 'Hộp', '', 'Hộp'].join('\t'),
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-311', 'Bìa còng lưu trữ hóa đơn chứng từ KingJim 7cm', '85', 'Thùng', '', 'Chiếc'].join('\t'),
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-312', 'Dao rọc bưu kiện chuyên dụng kho dược 18mm', '60', 'Hộp', '', 'Cây'].join('\t'),
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-313', 'Thẻ đeo nhân viên Dược sĩ có nam châm cài', '150', 'Hộp', '', 'Cái'].join('\t'),
  // Case kiểm chứng số lượng = 0 (Bắt buộc bị loại bỏ)
  ['LC04', 'Văn Phòng Điều Hành Long Châu', 'HC03', 'Kho hành chính', 'LC-314', 'Vật tư văn phòng hết tồn kho SL=0 (Test loại bỏ)', '0', 'Hộp', '', 'Cái'].join('\t'),

  // ===================== DÒNG TEST KHO NGOẠI LAI (BẮT BUỘC BỊ LOẠI BỎ) =====================
  ['LC99', 'Tổng Kho Phân Phối Miền Nam', 'KH99', 'Kho tổng phân phối Dĩ An', 'LC-901', 'Thuốc bột pha hỗn dịch hạ sốt Hapacol 250', '500', 'Hộp', 'Gói', 'Gói'].join('\t'),
  ['LC98', 'Trung Tâm Bảo Hành & Thiết Bị', 'KH98', 'Kho bảo trì máy đo y tế', 'LC-902', 'Bao đo huyết áp thay thế Omron cỡ M', '20', 'Hộp', '', 'Cái'].join('\t')
].join('\n');
