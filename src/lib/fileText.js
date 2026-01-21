import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as mammoth from 'mammoth/mammoth.browser';

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return `${size.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

async function extractTextFromPdf(file) {
  const ab = await file.arrayBuffer();
  const doc = await getDocument({ data: ab }).promise;
  let out = '';
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => (typeof it.str === 'string' ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    out += `${pageText}\n`;
  }
  return out.trim();
}

async function extractTextFromDocx(file) {
  const ab = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: ab });
  return String(result?.value || '').replace(/\s+\n/g, '\n').trim();
}

export async function extractTextFromFile(file, opts = {}) {
  const maxBytes = opts.maxBytes ?? 8 * 1024 * 1024; // 8MB
  if (!file) throw new Error('No file provided.');
  if (file.size > maxBytes) {
    throw new Error(`File too large (${formatBytes(file.size)}). Max ${formatBytes(maxBytes)}.`);
  }

  const name = String(file.name || '').toLowerCase();
  const type = String(file.type || '').toLowerCase();

  if (
    type.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.csv') ||
    name.endsWith('.rtf')
  ) {
    return (await file.text()).trim();
  }

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return await extractTextFromPdf(file);
  }

  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return await extractTextFromDocx(file);
  }

  throw new Error(`Unsupported file type: ${file.name || 'unknown'}. Please upload TXT, PDF, or DOCX.`);
}

