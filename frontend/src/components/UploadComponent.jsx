import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = '.pdf,.docx,.xlsx,.png,.jpg,.jpeg';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadComponent({ onUploaded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function selectFile(nextFile) {
    setError('');
    setSuccess('');
    setFile(nextFile);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      setError('Selecione um arquivo para continuar.');
      return;
    }
    if (file.size === 0) {
      setError('Arquivos vazios não podem ser enviados.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('O arquivo excede o limite de 10 MiB.');
      return;
    }

    setIsUploading(true);
    try {
      await uploadDocument(file);
      setSuccess(`${file.name} enviado com sucesso.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      await onUploaded();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-title">
      <div className="section-kicker"><span>01</span> NOVO ARQUIVO</div>
      <h2 id="upload-title">Adicionar documento</h2>
      <p className="section-copy">Inclua um arquivo na sua biblioteca.</p>

      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          id="document-file"
          className="visually-hidden"
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={(event) => selectFile(event.target.files?.[0] || null)}
          disabled={isUploading}
        />
        <label className={`file-picker${file ? ' has-file' : ''}`} htmlFor="document-file">
          <span className="upload-symbol" aria-hidden="true">↑</span>
          <span className="file-picker-copy">
            <strong>{file ? file.name : 'Escolher arquivo'}</strong>
            <small>{file ? formatFileSize(file.size) : 'PDF, DOCX, XLSX, PNG ou JPEG'}</small>
          </span>
          <span className="picker-arrow" aria-hidden="true">↗</span>
        </label>

        <p className="upload-limit">Tamanho máximo: 10 MiB</p>
        <button className="primary-button upload-submit" type="submit" disabled={isUploading}>
          {isUploading ? 'Enviando arquivo…' : 'Enviar documento'}
          {!isUploading && <span aria-hidden="true">→</span>}
        </button>
      </form>

      <div className="form-feedback" aria-live="polite">
        {error && <p className="feedback-error">{error}</p>}
        {success && <p className="feedback-success">{success}</p>}
      </div>
    </section>
  );
}