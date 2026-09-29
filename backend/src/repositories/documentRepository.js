const fs = require('node:fs/promises');
const path = require('node:path');

function createDocumentRepository(storageDirectory) {
  const storageRoot = path.resolve(storageDirectory);
  const documents = new Map();

  function resolveStoredFile(filename) {
    const filePath = path.resolve(storageRoot, filename);
    if (filePath === storageRoot || !filePath.startsWith(`${storageRoot}${path.sep}`)) {
      const error = new Error('Caminho de armazenamento inválido.');
      error.code = 'STORAGE_PATH_INVALID';
      throw error;
    }

    return filePath;
  }

  return {
    save(document) {
      documents.set(document.id, document);
    },

    listByOwner(owner) {
      return [...documents.values()]
        .filter((document) => document.owner === owner)
        .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
    },

    findByIdAndOwner(id, owner) {
      const document = documents.get(id);
      return document?.owner === owner ? document : undefined;
    },

    getFilePath(document) {
      return resolveStoredFile(document.storageFilename);
    },

    async removeStoredFile(filename) {
      const filePath = resolveStoredFile(path.basename(filename));
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    },
  };
}

module.exports = { createDocumentRepository };