const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const app = require('../src/app');
const { createDocumentRepository } = require('../src/repositories/documentRepository');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('não permite caminhos de arquivo fora do storage', async (t) => {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-path-test-'));
  const repository = createDocumentRepository(storageDirectory);

  t.after(() => fs.rm(storageDirectory, { recursive: true, force: true }));

  assert.throws(
    () => repository.getFilePath({ storageFilename: '../outside.txt' }),
    /Caminho de armazenamento inválido/,
  );
});

test('faz upload, lista, baixa e valida documentos', async (t) => {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const testApp = app.createApp({ storageDirectory, owner: 'test-user' });
  const server = testApp.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDirectory, { recursive: true, force: true });
  });

  const emptyList = await fetch(`${baseUrl}/documents`);
  assert.deepStrictEqual(await emptyList.json(), []);

  const content = Buffer.from('%PDF-1.4\nconteudo de teste');
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'application/pdf' }), 'relatorio.pdf');
  const uploadResponse = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
  assert.strictEqual(uploadResponse.status, 201);
  const document = await uploadResponse.json();
  assert.deepStrictEqual(Object.keys(document), ['id', 'originalName', 'size', 'uploadedAt', 'owner']);
  assert.strictEqual(document.originalName, 'relatorio.pdf');
  assert.strictEqual(document.size, content.length);
  assert.strictEqual(document.owner, 'test-user');
  assert.ok(Number.isFinite(Date.parse(document.uploadedAt)));

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.deepStrictEqual(await listResponse.json(), [document]);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.strictEqual(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /relatorio\.pdf/);
  assert.deepStrictEqual(Buffer.from(await downloadResponse.arrayBuffer()), content);

  const missingResponse = await fetch(`${baseUrl}/documents/missing/download`);
  assert.strictEqual(missingResponse.status, 404);
  assert.strictEqual((await missingResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');

  const noFileResponse = await fetch(`${baseUrl}/upload`, { method: 'POST' });
  assert.strictEqual(noFileResponse.status, 400);
  assert.strictEqual((await noFileResponse.json()).error.code, 'FILE_REQUIRED');

  const malformedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    body: 'malformed multipart body',
  });
  assert.strictEqual(malformedResponse.status, 400);
  assert.strictEqual((await malformedResponse.json()).error.code, 'INVALID_UPLOAD');

  const unsupportedForm = new FormData();
  unsupportedForm.append('file', new Blob(['texto'], { type: 'text/plain' }), 'notas.txt');
  const unsupportedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: unsupportedForm,
  });
  assert.strictEqual(unsupportedResponse.status, 415);
  assert.strictEqual((await unsupportedResponse.json()).error.code, 'FILE_TYPE_NOT_ALLOWED');

  const spoofedForm = new FormData();
  spoofedForm.append('file', new Blob(['texto'], { type: 'application/pdf' }), 'fraude.pdf');
  const spoofedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: spoofedForm,
  });
  assert.strictEqual(spoofedResponse.status, 415);
  assert.strictEqual((await spoofedResponse.json()).error.code, 'FILE_CONTENT_NOT_ALLOWED');

  const emptyForm = new FormData();
  emptyForm.append('file', new Blob([], { type: 'application/pdf' }), 'vazio.pdf');
  const emptyResponse = await fetch(`${baseUrl}/upload`, { method: 'POST', body: emptyForm });
  assert.strictEqual(emptyResponse.status, 400);
  assert.strictEqual((await emptyResponse.json()).error.code, 'FILE_REQUIRED');

  const oversizedForm = new FormData();
  oversizedForm.append(
    'file',
    new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'application/pdf' }),
    'grande.pdf',
  );
  const oversizedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: oversizedForm,
  });
  assert.strictEqual(oversizedResponse.status, 413);
  assert.strictEqual((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');

  assert.strictEqual((await fs.readdir(storageDirectory)).length, 1);
});
