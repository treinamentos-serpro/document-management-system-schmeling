import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  async function refreshDocuments() {
    setIsLoading(true);
    setLoadError('');
    try {
      setDocuments(await listDocuments());
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    listDocuments()
      .then((items) => {
        if (isActive) setDocuments(items);
      })
      .catch((error) => {
        if (isActive) setLoadError(error.message);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>Documentos</span>
        </a>
        <span className="environment-label"><span /> Espaço demonstrativo</span>
      </header>

      <main className="page-content">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">ARQUIVO DIGITAL <span>/</span> DOCUMENTOS</p>
            <h1 id="page-title">Biblioteca de documentos</h1>
            <p className="page-description">Envie e acesse seus arquivos em um só lugar.</p>
          </div>
          <div className="document-count" aria-live="polite">
            <strong>{documents.length.toString().padStart(2, '0')}</strong>
            <span>{documents.length === 1 ? 'documento' : 'documentos'}</span>
          </div>
        </section>

        <div className="workspace-grid">
          <UploadComponent onUploaded={refreshDocuments} />
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            error={loadError}
            onRefresh={refreshDocuments}
          />
        </div>

        <footer className="page-footer">
          <span>ARMAZENAMENTO LOCAL</span>
          <span>Arquivos disponíveis nesta sessão</span>
        </footer>
      </main>
    </div>
  );
}
