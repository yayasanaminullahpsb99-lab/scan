import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const port = 3000;

// Middleware to parse large JSON payloads for base64 images
app.use(express.json({ limit: '50mb' }));

// Gemini AI Instance
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI();
  }
} catch (err) {
  console.warn('Gemini AI initialization warning:', err);
}

// API endpoint to analyze document and extract OCR / suggest file title
app.post('/api/analyze-doc', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Gambar tidak ditemukan' });
    }

    if (!ai && process.env.GEMINI_API_KEY) {
      ai = new GoogleGenAI();
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Fitur AI belum dikonfigurasi (GEMINI_API_KEY tidak tersedia). Fitur scan dan ekspor PDF tetap berfungsi normal.',
      });
    }

    // Clean base64 string if it contains data prefix
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: `Analisis gambar dokumen yang dipindai ini.
Kembalikan respon dalam format JSON murni tanpa markdown triple backtick dengan struktur:
{
  "suggestedFileName": "Nama_File_Singkat_Bermakna (contoh: Surat_Pernyataan_Budi, Kwitansi_Listrik_Maret, Nota_Belanja_123, Dokumen_Penting)",
  "documentType": "Jenis dokumen (contoh: Kwitansi, Surat Resmi, Nota Kasir, Formulir, Sertifikat, KTP/ID, Lainnya)",
  "extractedText": "Seluruh teks yang terbaca dari dokumen dengan format rapi",
  "summary": "Ringkasan isi dokumen dalam 1-2 kalimat bahasa Indonesia"
}`,
            },
          ],
        },
      ],
    });

    const responseText = response.text || '';
    // Clean potential markdown wrap
    const cleanedText = responseText
      .replace(/^```json/m, '')
      .replace(/^```/m, '')
      .replace(/```$/m, '')
      .trim();

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedText);
    } catch {
      parsedResult = {
        suggestedFileName: 'Dokumen_Scan',
        documentType: 'Dokumen',
        extractedText: responseText,
        summary: 'Teks dokumen berhasil diekstrak.',
      };
    }

    return res.json({ success: true, data: parsedResult });
  } catch (error: any) {
    console.error('Error analyzing document:', error);
    return res.status(500).json({
      error: error.message || 'Gagal memproses dokumen dengan AI',
    });
  }
});

// Setup Vite or Static File serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`DocuScan Server ready at http://0.0.0.0:${port}`);
  });
}

startServer();
