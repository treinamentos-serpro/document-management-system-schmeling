const { randomUUID } = require('node:crypto');

function createDocumentService({ repository, owner, clock = () => new Date() }) {
  return {
    async createDocument(file) {
      if (!file) {
        const error = new Error('Envie um arquivo no campo "file".');
        error.statusCode = 400;
        error.code = 'FILE_REQUIRED';
        throw error;
      }

      if (file.size === 0) {
        await repository.removeStoredFile(file.filename);
        const error = new Error('Arquivos vazios não são permitidos.');
        error.statusCode = 400;
        error.code = 'FILE_REQUIRED';
        throw error;
      }

      const document = {
        id: randomUUID(),
        originalName: file.originalname,
        size: file.size,
        uploadedAt: clock().toISOString(),
        owner,
        storageFilename: file.filename,
      };

      try {
        repository.save(document);
      } catch (error) {
        await repository.removeStoredFile(file.filename);
        throw error;
      }

      return toPublicMetadata(document);
    },

    listDocuments() {
      return repository.listByOwner(owner).map(toPublicMetadata);
    },

    getDocumentForDownload(id) {
      const document = repository.findByIdAndOwner(id, owner);
      if (!document) {
        const error = new Error('Documento não encontrado.');
        error.statusCode = 404;
        error.code = 'DOCUMENT_NOT_FOUND';
        throw error;
      }

      return {
        filePath: repository.getFilePath(document),
        originalName: document.originalName,
      };
    },
  };
}

function toPublicMetadata({ id, originalName, size, uploadedAt, owner }) {
  return { id, originalName, size, uploadedAt, owner };
}

module.exports = { createDocumentService };