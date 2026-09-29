const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const { createDocumentController } = require('../controllers/documentController');

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ['application/pdf', ['.pdf']],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['.docx']],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ['.xlsx']],
  ['image/png', ['.png']],
  ['image/jpeg', ['.jpg', '.jpeg']],
]);

const UPLOAD_LIMITS = {
  fileSize: MAX_FILE_SIZE,
  files: 1,
  fields: 0,
  parts: 2,
  fieldNameSize: 100,
  headerPairs: 200,
};

function createDocumentRouter({ storageDirectory, service }) {
  const router = express.Router();
  const controller = createDocumentController(service);
  const storage = multer.diskStorage({
    destination(req, file, callback) {
      fs.mkdir(storageDirectory, { recursive: true }, (error) => {
        callback(error, storageDirectory);
      });
    },
    filename(req, file, callback) {
      callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  });
  const upload = multer({
    storage,
    limits: UPLOAD_LIMITS,
    fileFilter(req, file, callback) {
      const extension = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = ALLOWED_TYPES.get(file.mimetype);

      if (!allowedExtensions || !allowedExtensions.includes(extension)) {
        const error = new Error('O formato do arquivo não é permitido.');
        error.statusCode = 415;
        error.code = 'FILE_TYPE_NOT_ALLOWED';
        callback(error);
        return;
      }

      callback(null, true);
    },
  });

  router.post('/upload', upload.single('file'), controller.upload);
  router.get('/documents', controller.list);
  router.get('/documents/:id/download', controller.download);

  return router;
}

module.exports = { createDocumentRouter };