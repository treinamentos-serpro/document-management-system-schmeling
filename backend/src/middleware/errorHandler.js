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
  const code = statusCode >= 500 ? 'INTERNAL_ERROR' : (error.code || 'BAD_REQUEST');
  const message = statusCode >= 500 ? 'Erro interno do servidor.' : error.message;
  return sendError(res, statusCode, code, message);
}

function sendError(res, statusCode, code, message) {
  return res.status(statusCode).json({ error: { code, message } });
}

module.exports = { errorHandler };