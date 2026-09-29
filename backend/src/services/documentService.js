const { randomUUID } = require('node:crypto');
const { validateDocumentFile } = require('./documentFileValidator');

function createDocumentService({ repository, owner, clock = () => new Date() }) {
  return {
    async createDocument(file) {
      if (!file) {
        throw createServiceError('Envie um arquivo no campo "file".', 400, 'FILE_REQUIRED');
      }

      try {
        await validateDocumentFile(file);
        const document = createDocumentMetadata(file, owner, clock);
        repository.save(document);
        return toPublicMetadata(document);
      } catch (error) {
        await removeUploadedFile(repository, file.filename);
        throw error;
      }
    },

    listDocuments() {
      return repository.listByOwner(owner).map(toPublicMetadata);
    },

    getDocumentForDownload(id) {
      const document = repository.findByIdAndOwner(id, owner);
      if (!document) {
        throw createServiceError('Documento não encontrado.', 404, 'DOCUMENT_NOT_FOUND');
      }

      return {
        filePath: repository.getFilePath(document),
        originalName: document.originalName,
      };
    },
  };
}

function createDocumentMetadata(file, owner, clock) {
  return {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: clock().toISOString(),
    owner,
    storageFilename: file.filename,
  };
}

async function removeUploadedFile(repository, filename) {
  try {
    await repository.removeStoredFile(filename);
  } catch {
    // A falha de limpeza não deve mascarar o erro que interrompeu o upload.
  }
}

function createServiceError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function toPublicMetadata({ id, originalName, size, uploadedAt, owner }) {
  return { id, originalName, size, uploadedAt, owner };
}

module.exports = { createDocumentService };