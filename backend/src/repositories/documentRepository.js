const fs = require('node:fs/promises');
const path = require('node:path');

function createDocumentRepository(storageDirectory) {
  const documents = new Map();

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
      return path.join(storageDirectory, document.storageFilename);
    },

    async removeStoredFile(filename) {
      const filePath = path.join(storageDirectory, path.basename(filename));
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    },
  };
}

module.exports = { createDocumentRepository };