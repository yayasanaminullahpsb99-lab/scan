/**
 * Generates realistic sample document images on client canvas
 * so users can test scanning, filters, and PDF generation immediately
 */

export interface SampleDoc {
  id: string;
  name: string;
  category: string;
  generate: () => Promise<string>;
}

export function createLetterSample(): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1700;
    const ctx = canvas.getContext('2d')!;

    // Slightly off-white / realistic paper background with slight gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1700);
    bgGrad.addColorStop(0, '#fbfaf5');
    bgGrad.addColorStop(1, '#f7f4ec');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1700);

    // Subtle paper grain/shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.fillRect(0, 0, 1200, 20);

    // Header Kop Surat
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.fillText('PT NUSANTARA KARYA TEKNOLOGI', 600, 140);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Gedung Cyber Tower Lt. 12, Jl. H.R. Rasuna Said Kav. 8, Jakarta Selatan 12950', 600, 180);
    ctx.fillText('Telp: (021) 555-0199 | Email: sekretariat@nusantarakarya.co.id', 600, 215);

    // Divider line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(100, 245);
    ctx.lineTo(1100, 245);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 252);
    ctx.lineTo(1100, 252);
    ctx.stroke();

    // Document Metadata
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e293b';
    ctx.font = '22px sans-serif';

    ctx.fillText('Nomor        : 048/NKT-DIR/SK/IX/2026', 100, 320);
    ctx.fillText('Lampiran   : 1 (Satu) Berkas', 100, 360);
    ctx.fillText('Perihal       : SURAT KETERANGAN RESMI PELAKSANAAN PROYEK', 100, 400);

    ctx.textAlign = 'right';
    ctx.fillText('Jakarta, 26 September 2026', 1100, 320);

    // Recipient
    ctx.textAlign = 'left';
    ctx.font = '22px sans-serif';
    ctx.fillText('Kepada Yth.', 100, 480);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Pimpinan Lembaga & Mitra Kerjasama', 100, 515);
    ctx.font = '22px sans-serif';
    ctx.fillText('Di Tempat', 100, 550);

    // Content Body
    ctx.font = '22px serif';
    ctx.fillText('Dengan hormat,', 100, 620);

    const bodyParagraph1 =
      'Sehubungan dengan penyelesaian tahapan digitalisasi sistem dan arsip dokumen, dengan ini kami sampaikan bahwa seluruh berkas laporan keuangan, surat pertanggungjawaban operasional, serta dokumentasi implementasi perangkat lunak telah diverifikasi secara teliti dan dinyatakan lengkap serta sah sesuai standar tata kelola yang berlaku.';
    wrapText(ctx, bodyParagraph1, 100, 670, 1000, 38);

    const bodyParagraph2 =
      'Dokumen ini diterbitkan sebagai bukti otentik pengesahan administrasi untuk keperluan penjaminan mutu, pengarsipan digital, dan pelaporan berkala. Apabila diperlukan verifikasi silang lebih lanjut, pihak terkait dapat menghubungi sekretariat kami pada hari dan jam kerja operasional.';
    wrapText(ctx, bodyParagraph2, 100, 830, 1000, 38);

    ctx.fillText('Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.', 100, 1000);

    // Closing & Signature
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Hormat kami,', 1000, 1100);
    ctx.fillText('PT Nusantara Karya Teknologi', 1000, 1140);

    // Blue Signature representation
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(850, 1230);
    ctx.bezierCurveTo(890, 1180, 930, 1270, 970, 1200);
    ctx.bezierCurveTo(990, 1170, 1020, 1220, 1050, 1190);
    ctx.stroke();

    // Red Official Stamp representation
    ctx.save();
    ctx.translate(820, 1230);
    ctx.rotate(-0.15);
    ctx.strokeStyle = '#dc2626';
    ctx.fillStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 90, 60, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PT NUSANTARA KARYA', 0, -12);
    ctx.fillText('★ RESMI / VALID ★', 0, 14);
    ctx.fillText('JAKARTA PUSAT', 0, 36);
    ctx.restore();

    ctx.textAlign = 'right';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Bambang Irawan, S.T., M.M.', 1000, 1310);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Direktur Utama', 1000, 1345);

    resolve(canvas.toDataURL('image/jpeg', 0.94));
  });
}

export function createReceiptSample(): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 950;
    const ctx = canvas.getContext('2d')!;

    // Slightly warm receipt paper
    ctx.fillStyle = '#f8f6f0';
    ctx.fillRect(0, 0, 1400, 950);

    // Border
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 5;
    ctx.strokeRect(40, 40, 1320, 870);

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(48, 48, 1304, 854);

    // Title
    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 42px serif';
    ctx.textAlign = 'left';
    ctx.fillText('KWITANSI PEMBAYARAN', 80, 110);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('No. KW-2026/09/8892', 80, 150);

    ctx.textAlign = 'right';
    ctx.font = '22px sans-serif';
    ctx.fillText('Tgl: 26 September 2026', 1300, 110);

    // Receipt Table
    const fields = [
      { label: 'Telah Diterima Dari', val: 'Bapak Ahmad Faisal / CV Berkah Sentosa' },
      { label: 'Uang Sejumlah', val: 'Tiga Juta Tujuh Ratus Lima Puluh Ribu Rupiah' },
      { label: 'Untuk Pembayaran', val: 'Pelunasan Pengadaan Alat Kantor & Cetak Laporan Tahunan' },
    ];

    let startY = 230;
    fields.forEach((f) => {
      ctx.textAlign = 'left';
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(f.label, 80, startY);
      ctx.fillText(':', 340, startY);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px serif';
      ctx.fillText(f.val, 370, startY);

      // dotted line
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(370, startY + 10);
      ctx.lineTo(1300, startY + 10);
      ctx.stroke();
      ctx.setLineDash([]);

      startY += 85;
    });

    // Total Amount Box
    ctx.fillStyle = '#e0f2fe';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.fillRect(80, 560, 480, 100);
    ctx.strokeRect(80, 560, 480, 100);

    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('JUMLAH : ', 105, 620);
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('Rp 3.750.000,-', 230, 625);

    // Paid Stamp (LUNAS)
    ctx.save();
    ctx.translate(720, 620);
    ctx.rotate(-0.1);
    ctx.strokeStyle = '#16a34a';
    ctx.fillStyle = '#16a34a';
    ctx.lineWidth = 4;
    ctx.strokeRect(-120, -45, 240, 90);
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LUNAS', 0, 15);
    ctx.restore();

    // Signature
    ctx.textAlign = 'center';
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Penerima,', 1140, 540);

    // Blue pen signature
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(1050, 620);
    ctx.bezierCurveTo(1090, 580, 1140, 650, 1180, 590);
    ctx.bezierCurveTo(1200, 570, 1220, 610, 1240, 600);
    ctx.stroke();

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('( Ratna Kumalasari )', 1140, 675);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Bagian Keuangan & Kasir', 1140, 705);

    resolve(canvas.toDataURL('image/jpeg', 0.94));
  });
}

export function createInvoiceSample(): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1500;
    const ctx = canvas.getContext('2d')!;

    // Clean white/subtle paper
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, 1000, 1500);

    // Invoice Header
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FAKTUR PENJUALAN', 60, 100);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Toko Sentra Solusi Digital', 60, 135);
    ctx.fillText('Jl. Malioboro No. 45, Yogyakarta', 60, 165);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('INV-2026/X/9102', 940, 100);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Tanggal: 26 Sep 2026', 940, 135);
    ctx.fillText('Jatuh Tempo: 10 Okt 2026', 940, 165);

    // Table Header
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(60, 240, 880, 50);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NO', 80, 272);
    ctx.fillText('DESKRIPSI BARANG / JASA', 140, 272);
    ctx.textAlign = 'right';
    ctx.fillText('QTY', 620, 272);
    ctx.fillText('HARGA', 760, 272);
    ctx.fillText('TOTAL', 920, 272);

    const items = [
      { no: '1', desc: 'Kertas HVS A4 80 GSM (5 Rim)', qty: '4', price: 'Rp 65.000', total: 'Rp 260.000' },
      { no: '2', desc: 'Cartridge Tinta Printer Hitam & Warna', qty: '2', price: 'Rp 320.000', total: 'Rp 640.000' },
      { no: '3', desc: 'Map Folder Arsip Plastik (Pack)', qty: '5', price: 'Rp 45.000', total: 'Rp 225.000' },
      { no: '4', desc: 'Layanan Pemindaian & Digitalisasi Arsip', qty: '1', price: 'Rp 500.000', total: 'Rp 500.000' },
    ];

    let rowY = 340;
    items.forEach((item) => {
      ctx.fillStyle = '#334155';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.no, 80, rowY);
      ctx.fillText(item.desc, 140, rowY);
      ctx.textAlign = 'right';
      ctx.fillText(item.qty, 620, rowY);
      ctx.fillText(item.price, 760, rowY);
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(item.total, 920, rowY);

      // Line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, rowY + 20);
      ctx.lineTo(940, rowY + 20);
      ctx.stroke();

      rowY += 60;
    });

    // Summary calculation
    const sumY = rowY + 30;
    ctx.textAlign = 'right';
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Subtotal :', 760, sumY);
    ctx.fillText('PPN (11%) :', 760, sumY + 40);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('Total Tagihan :', 760, sumY + 90);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Rp 1.625.000', 920, sumY);
    ctx.fillText('Rp 178.750', 920, sumY + 40);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#2563eb';
    ctx.fillText('Rp 1.803.750', 920, sumY + 90);

    // Bank transfer info
    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Informasi Pembayaran:', 60, sumY);
    ctx.font = '16px sans-serif';
    ctx.fillText('Bank Central Asia (BCA)', 60, sumY + 30);
    ctx.fillText('No. Rekening: 8820-192-881', 60, sumY + 55);
    ctx.fillText('A.N. Toko Sentra Solusi Digital', 60, sumY + 80);

    resolve(canvas.toDataURL('image/jpeg', 0.94));
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

export const SAMPLE_DOCUMENTS: SampleDoc[] = [
  {
    id: 'sample-letter',
    name: 'Surat Resmi & Stempel',
    category: 'Surat',
    generate: createLetterSample,
  },
  {
    id: 'sample-receipt',
    name: 'Kwitansi Pembayaran Lunas',
    category: 'Kwitansi',
    generate: createReceiptSample,
  },
  {
    id: 'sample-invoice',
    name: 'Faktur Penjualan / Nota',
    category: 'Faktur',
    generate: createInvoiceSample,
  },
];
