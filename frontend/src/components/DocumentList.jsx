import DownloadButton from './DownloadButton.jsx';

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name) {
  return name.split('.').pop()?.toUpperCase() || 'FILE';
}

export default function DocumentList({ documents, isLoading, error, onRefresh }) {
  return (
    <section className="documents-section" aria-labelledby="documents-title">
      <div className="documents-heading">
        <div>
          <div className="section-kicker"><span>02</span> ACERVO</div>
          <h2 id="documents-title">Seus documentos</h2>
        </div>
        <button
          className="refresh-button"
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Atualizar lista de documentos"
          title="Atualizar lista"
        >
          <span aria-hidden="true">↻</span>
        </button>
      </div>

      {error ? (
        <div className="list-message list-error" role="alert">
          <p>{error}</p>
          <button className="text-button" type="button" onClick={onRefresh}>Tentar novamente</button>
        </div>
      ) : isLoading ? (
        <p className="list-message" role="status">Carregando documentos…</p>
      ) : documents.length === 0 ? (
        <div className="empty-state">
          <span className="empty-mark" aria-hidden="true">—</span>
          <p>Nenhum documento por aqui ainda.</p>
        </div>
      ) : (
        <div className="document-list" role="list">
          {documents.map((document) => (
            <article className="document-row" key={document.id} role="listitem">
              <span className="file-type" aria-label={`Arquivo ${getFileExtension(document.originalName)}`}>
                {getFileExtension(document.originalName)}
              </span>
              <div className="document-info">
                <h3 title={document.originalName}>{document.originalName}</h3>
                <p>{formatDate(document.uploadedAt)} <span>·</span> {formatFileSize(document.size)}</p>
              </div>
              <DownloadButton document={document} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}