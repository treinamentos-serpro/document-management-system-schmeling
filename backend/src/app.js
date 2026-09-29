// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const path = require('node:path');
const { createDocumentRepository } = require('./repositories/documentRepository');
const { createDocumentService } = require('./services/documentService');
const { createDocumentRouter } = require('./routes/documentRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const PORT = process.env.PORT || 3000;
const STORAGE_DIRECTORY = path.resolve(__dirname, '../storage');

function createApp({
  storageDirectory = STORAGE_DIRECTORY,
  owner = process.env.DMS_OWNER || 'demo',
  repository = createDocumentRepository(storageDirectory),
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(createDocumentRouter({
    storageDirectory,
    service: createDocumentService({ repository, owner }),
  }));
  app.use(errorHandler);

  return app;
}

const app = createApp();
app.createApp = createApp;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
