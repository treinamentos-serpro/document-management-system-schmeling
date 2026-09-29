function createDocumentController(service) {
  return {
    async upload(req, res) {
      const document = await service.createDocument(req.file);
      res.status(201).json(document);
    },

    async list(req, res) {
      const documents = await service.listDocuments();
      res.status(200).json(documents);
    },

    async download(req, res, next) {
      const document = await service.getDocumentForDownload(req.params.id);
      res.download(document.filePath, document.originalName, (error) => {
        if (error) next(error);
      });
    },
  };
}

module.exports = { createDocumentController };