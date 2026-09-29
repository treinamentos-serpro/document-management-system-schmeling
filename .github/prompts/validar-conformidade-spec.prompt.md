---
description: "Compara requisitos e mudanças do DMS com docs/specs/dms-spec.md, verificando implementação, contratos e testes."
name: validar-conformidade-spec
argument-hint: requisito, endpoint ou arquivos a validar
agent: agent
---

# Validar conformidade com a especificação do DMS

Analise `${input:escopo:requisito, endpoint ou arquivos a validar}` em relação a `docs/specs/dms-spec.md` e às instruções em `.github/copilot-instructions.md`.

## Processo

1. Identifique os requisitos funcionais, não funcionais e contratos de API relevantes para o escopo. Não presuma que código existente está correto apenas porque está implementado.
2. Siga o comportamento pelos pontos pertinentes da aplicação. No backend, confira as responsabilidades e o fluxo `routes -> controllers -> services -> repositories`; no frontend, confira componentes e o cliente em `frontend/src/services`, incluindo o prefixo público `/api`.
3. Compare o comportamento real com os critérios de aceitação da especificação. Considere, conforme o escopo, entrada, resposta de sucesso, erros/status, limites de upload, metadados, owner, ordenação, disponibilidade do arquivo e estados da interface.
4. Verifique se os testes existentes demonstram o comportamento requerido. Diferencie comportamento verificado por teste de comportamento apenas inferido pela leitura do código.
5. Apresente primeiro divergências e riscos, ordenados por impacto, com referências aos arquivos e evidências. Depois liste requisitos conformes, lacunas de cobertura e verificações executadas.

## Correções

- Faça alterações somente quando a solicitação pedir explicitamente corrigir ou implementar as divergências. Em modo de auditoria, não edite arquivos.
- Para correções, mude o menor escopo necessário, preserve APIs públicas e padrões locais, e adicione ou ajuste testes na localização e runner existentes (`backend/test` com `node:test`).
- Não introduza autenticação, banco de dados, armazenamento externo, versionamento ou outras capacidades fora do escopo documentado.
- Não exponha caminhos do filesystem, detalhes internos ou stack traces nas respostas HTTP.
- Execute validações focadas: `cd backend && npm test` para mudanças de backend; `cd frontend && npm run build` para mudanças de frontend. Se alterar ambos, execute as duas. Informe qualquer validação que não pôde ser feita.

## Pontos de conformidade do DMS

- Upload: `multipart/form-data` no campo `file`; apenas um arquivo; PDF, DOCX, XLSX, PNG ou JPEG; tamanho maior que zero e até 10 MiB; erros consistentes para ausência, tipo inválido, tamanho excedido e falha interna.
- Metadados públicos: `id`, `originalName`, `size`, `uploadedAt` ISO 8601 e `owner`; não inclua nome físico ou caminho de armazenamento na resposta.
- Owner: vem da configuração do servidor, não de dados escolhidos pelo cliente.
- Persistência: arquivo local em `backend/storage` via `multer` com `diskStorage`; metadados somente em memória.
- Listagem: documentos do owner configurado, ordenados por data decrescente; array vazio quando não houver documentos.
- Download: conteúdo binário e nome original sugerido; identificador inexistente ou arquivo local indisponível resulta em `404`.
- Frontend: usa `fetch` com prefixo `/api` e contempla carregamento, sucesso, erro e lista vazia onde aplicável.