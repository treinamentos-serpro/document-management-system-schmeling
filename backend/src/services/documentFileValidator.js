const fs = require('node:fs/promises');

const FILE_SIGNATURES = new Map([
  ['application/pdf', (bytes) => bytes.toString('ascii', 0, 5) === '%PDF-'],
  ['image/png', (bytes) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))],
  ['image/jpeg', (bytes) => bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', isZip],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isZip],
]);

async function validateDocumentFile(file) {
  if (file.size === 0) {
    throw createValidationError('Arquivos vazios não são permitidos.', 400, 'FILE_REQUIRED');
  }

  if (!(await hasExpectedSignature(file.path, file.mimetype))) {
    throw createValidationError(
      'O conteúdo do arquivo não corresponde ao formato informado.',
      415,
      'FILE_CONTENT_NOT_ALLOWED',
    );
  }
}

async function hasExpectedSignature(filePath, mimeType) {
  const validate = FILE_SIGNATURES.get(mimeType);
  if (!validate) return false;

  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return validate(buffer.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

function isZip(bytes) {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b
    && [0x03, 0x05, 0x07].includes(bytes[2]) && [0x04, 0x06, 0x08].includes(bytes[3]);
}

function createValidationError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

module.exports = { validateDocumentFile };