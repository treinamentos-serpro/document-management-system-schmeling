const multer = require('multer');

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 413, 'FILE_TOO_LARGE', 'O arquivo excede o limite permitido de 10 MiB.');
    }

    return sendError(res, 400, 'INVALID_UPLOAD', 'A requisição de upload é inválida.');
  }

  if (error.message === 'Multipart: Boundary not found' || error.message === 'Unexpected end of form') {
    return sendError(res, 400, 'INVALID_UPLOAD', 'A requisição de upload é inválida.');
  }

  if (error.code === 'ENOENT') {
    return sendError(res, 404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  const statusCode = error.statusCode || 500;
  const publicErrors = new Map([
    ['FILE_REQUIRED', [400, 'Arquivos vazios ou ausentes não são permitidos.']],
    ['FILE_TYPE_NOT_ALLOWED', [415, 'O formato do arquivo não é permitido.']],
    ['FILE_CONTENT_NOT_ALLOWED', [415, 'O conteúdo do arquivo não corresponde ao formato informado.']],
    ['DOCUMENT_NOT_FOUND', [404, 'Documento não encontrado.']],
    ['STORAGE_PATH_INVALID', [500, 'Erro interno do servidor.']],
  ]);
  const publicError = publicErrors.get(error.code);
  const code = statusCode >= 500 || !publicError ? 'INTERNAL_ERROR' : error.code;
  const message = statusCode >= 500 || !publicError ? 'Erro interno do servidor.' : publicError[1];
  return sendError(res, statusCode, code, message);
}

function sendError(res, statusCode, code, message) {
  return res.status(statusCode).json({ error: { code, message } });
}

module.exports = { errorHandler };