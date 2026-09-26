import html2canvasNpm from 'html2canvas';

/**
 * Lấy thể hiện của html2canvas (ưu tiên bản CDN gắn trên window, fallback sang module npm)
 */
function getHtml2Canvas() {
  if (typeof window !== 'undefined' && (window as any).html2canvas) {
    return (window as any).html2canvas;
  }
  return html2canvasNpm;
}

/**
 * Chờ toàn bộ font chữ của tài liệu tải xong 100%
 */
export async function waitForFontsLoaded(): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (err) {
      console.warn('Lỗi khi chờ document.fonts.ready:', err);
    }
  }
}

/**
 * Chờ 2 frame render của trình duyệt để đảm bảo DOM được layout hoàn tất
 */
export function waitForDomRender(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 50);
      });
    });
  });
}

/**
 * Hàm xuất bảng thành ảnh với Promise, cấu hình:
 * { scale: 2, useCORS: true, logging: false }
 * Tối ưu đặc biệt cho bảng siêu dài (hàng trăm đến hàng nghìn dòng):
 * - Đo chính xác toàn bộ chiều cao thực của bảng (scrollHeight)
 * - Thiết lập windowHeight & height bằng đúng scrollHeight để không bị cắt xén hay đen/trắng ảnh
 * - Reset scrollY: 0, scrollX: 0
 * - onclone: ép bung toàn bộ container cha và bảng, không cho phép overflow: hidden
 */
export async function exportTableToImage(
  targetElement: HTMLElement,
  fileName = 'Bao_Cao_Kho_Con.png'
): Promise<string> {
  // 1. Chờ font chữ và DOM sẵn sàng 100%
  await waitForFontsLoaded();
  await waitForDomRender();

  const html2canvas = getHtml2Canvas();

  // 2. Đo đạc kích thước thực tế toàn vẹn của bảng
  const actualWidth = Math.max(
    targetElement.scrollWidth,
    targetElement.offsetWidth,
    targetElement.clientWidth
  );
  const actualHeight = Math.max(
    targetElement.scrollHeight,
    targetElement.offsetHeight,
    targetElement.clientHeight
  );

  return new Promise((resolve, reject) => {
    // 3. Chụp phần tử với cấu hình tối ưu triệt để cho bảng siêu dài
    const winHeight = document.documentElement ? document.documentElement.scrollHeight : actualHeight;

    html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: actualWidth,
      height: actualHeight,
      windowWidth: actualWidth + 100,
      windowHeight: winHeight, // Bắt buộc { scale: 2, useCORS: true, windowHeight: document.documentElement.scrollHeight }
      onclone: (_clonedDoc: Document, clonedEl: HTMLElement) => {
        // Đảm bảo phần tử clone hiển thị toàn bộ nội dung, không bị giới hạn bất kỳ thuộc tính nào
        clonedEl.style.overflow = 'visible';
        clonedEl.style.height = `${actualHeight}px`;
        clonedEl.style.maxHeight = 'none';
        clonedEl.style.width = `${actualWidth}px`;
        clonedEl.style.maxWidth = 'none';
        clonedEl.style.position = 'static';
        clonedEl.style.transform = 'none';

        // Đảm bảo toàn bộ bảng và ô trong bảng tuân thủ nghiêm ngặt Times New Roman 13px và viền 1px solid #ccc
        const tables = clonedEl.querySelectorAll('table');
        tables.forEach((tbl) => {
          const t = tbl as HTMLElement;
          t.style.fontFamily = "'Times New Roman', serif";
          t.style.fontSize = '13px';
          t.style.borderCollapse = 'collapse';
          t.style.border = '1px solid #ccc';
          t.style.overflow = 'visible';
          t.style.height = 'auto';
        });

        const cells = clonedEl.querySelectorAll('th, td');
        cells.forEach((cell) => {
          const c = cell as HTMLElement;
          c.style.fontFamily = "'Times New Roman', serif";
          c.style.fontSize = '13px';
          c.style.border = '1px solid #ccc';
          c.style.whiteSpace = 'normal';
          c.style.wordBreak = 'break-word';
        });
      }
    })
      .then((canvas: HTMLCanvasElement) => {
        // 4. Chuyển canvas thành file ảnh và kích hoạt tải về máy
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Không thể tạo file ảnh từ canvas.'));
              return;
            }

            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
            resolve(downloadUrl);
          },
          'image/png',
          1.0
        );
      })
      .catch((error: any) => {
        reject(error);
      });
  });
}

/**
 * Hỗ trợ sao chép ảnh trực tiếp vào Clipboard cho bảng siêu dài
 */
export async function copyTableToClipboard(targetElement: HTMLElement): Promise<boolean> {
  await waitForFontsLoaded();
  await waitForDomRender();

  const html2canvas = getHtml2Canvas();

  const actualWidth = Math.max(
    targetElement.scrollWidth,
    targetElement.offsetWidth,
    targetElement.clientWidth
  );
  const actualHeight = Math.max(
    targetElement.scrollHeight,
    targetElement.offsetHeight,
    targetElement.clientHeight
  );

  const winHeight = document.documentElement ? document.documentElement.scrollHeight : actualHeight;

  return new Promise((resolve, reject) => {
    html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: actualWidth,
      height: actualHeight,
      windowWidth: actualWidth + 100,
      windowHeight: winHeight,
      onclone: (_clonedDoc: Document, clonedEl: HTMLElement) => {
        clonedEl.style.overflow = 'visible';
        clonedEl.style.height = `${actualHeight}px`;
        clonedEl.style.maxHeight = 'none';
        clonedEl.style.width = `${actualWidth}px`;
        clonedEl.style.maxWidth = 'none';
      }
    })
      .then((canvas: HTMLCanvasElement) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('Không thể tạo ảnh để copy.'));
            return;
          }

          try {
            if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              resolve(true);
            } else {
              throw new Error('Trình duyệt không hỗ trợ sao chép ảnh trực tiếp.');
            }
          } catch (err) {
            reject(err);
          }
        }, 'image/png');
      })
      .catch(reject);
  });
}
