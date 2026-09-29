# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web demonstrativa para enviar, listar e baixar documentos armazenados localmente, com metadados mantidos em memória e associação a um único usuário configurado.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos enviados pelo usuário configurado.
- Download de um documento pelo identificador.
- Identificação simples do proprietário em modo monousuário, sem autenticação nesta fase.
- Armazenamento dos arquivos no filesystem local da aplicação.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Autenticação, cadastro e troca de usuário.
- Versionamento, atualização ou exclusão de documentos.
- Compartilhamento de documentos entre usuários.
- Persistência durável dos metadados, banco de dados, paginação e busca.
- Upload de múltiplos arquivos em uma única requisição.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo usando `multipart/form-data`, no campo `file`. |
| RF-02 | O upload aceita arquivos PDF, DOCX, XLSX, PNG e JPEG com tamanho maior que zero e de até 10 MiB (10.485.760 bytes). |
| RF-03 | O sistema rejeita requisições sem arquivo, arquivos vazios, arquivos acima do limite e formatos não permitidos, informando o erro por resposta HTTP. |
| RF-04 | Para cada upload aceito, o sistema gera um identificador único, registra os metadados do documento e associa o documento ao owner configurado. O cliente não pode escolher o owner. |
| RF-05 | O usuário pode listar os documentos associados ao owner configurado. A lista é ordenada do mais recente para o mais antigo; sem documentos, o resultado é uma lista vazia. |
| RF-06 | O usuário pode baixar um documento pelo identificador. O arquivo baixado preserva o nome original como nome sugerido ao cliente. |
| RF-07 | O sistema retorna `404 Not Found` quando o identificador solicitado para download não existir nos metadados em memória. |
| RF-08 | As respostas de erro das rotas de documentos usam um formato JSON consistente e não expõem detalhes internos do servidor ou caminhos do filesystem. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados exclusivamente no filesystem local da aplicação, sob `backend/storage`, usando `multer` com `diskStorage`. |
| RNF-02 | Os metadados são mantidos em memória. Reiniciar o processo remove os metadados; arquivos que permanecerem no filesystem não estarão disponíveis pela API após essa perda. |
| RNF-03 | Os parâmetros de configuração da aplicação, incluindo o owner demonstrativo, devem ser fornecidos por variáveis de ambiente ou configuração equivalente, sem valores específicos do ambiente codificados nas regras de negócio. |
| RNF-04 | O nome original do arquivo é metadado e nome de download; não deve ser usado como caminho ou nome físico de destino no armazenamento. |
| RNF-05 | A arquitetura do backend segue o fluxo `routes -> controllers -> services -> repositories`. Rotas delegam aos controllers, controllers tratam HTTP e validação básica, services concentram regras de negócio e repositories cuidam da persistência/acesso aos metadados e arquivos. Camadas internas não dependem das externas. |
| RNF-06 | O frontend é organizado em componentes React e acessa a API por `fetch` usando o prefixo público `/api`, encaminhado pelo proxy do Vite. |
| RNF-07 | Nenhum serviço de armazenamento de terceiros ou provedor externo é utilizado. |

## 5. Modelo de dados (metadados do documento)

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único do documento, gerado pelo sistema. |
| `originalName` | string | Nome original informado para o arquivo; usado como nome sugerido no download. |
| `size` | number | Tamanho do arquivo em bytes; deve ser maior que zero e não exceder 10.485.760. |
| `uploadedAt` | string | Data e hora do upload em formato ISO 8601. |
| `owner` | string | Identificador do usuário demonstrativo configurado na aplicação; não é informado pelo cliente. |

Os metadados são mantidos em memória. O nome físico do arquivo no armazenamento é interno e não faz parte do contrato público da API.

## 6. Contratos de API

### Prefixo e convenções

- O frontend acessa os endpoints pelo prefixo público `/api` (por exemplo, `/api/documents`).
- O proxy de desenvolvimento do Vite remove `/api` ao encaminhar a requisição. Os caminhos abaixo são os caminhos das rotas no backend; portanto, não incluem esse prefixo.
- As rotas não exigem autenticação nesta fase. O owner de todas as operações é o usuário demonstrativo configurado no servidor.
- Os tamanhos são expressos em bytes. O limite de upload de 10 MiB corresponde a 10.485.760 bytes.

### Formato de erro

Quando uma rota retornar erro JSON, o corpo segue este formato:

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "O arquivo excede o limite permitido de 10 MiB."
  }
}
```

`code` é um identificador estável apropriado ao erro e `message` é uma descrição segura para o usuário. Erros internos não devem incluir stack trace, caminho local ou detalhes de configuração.

### `POST /upload`

- Entrada: `multipart/form-data` contendo exatamente um arquivo no campo `file`.
- Formatos aceitos: PDF (`application/pdf`), DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`), XLSX (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), PNG (`image/png`) e JPEG (`image/jpeg`).
- Limite: 10 MiB por arquivo. Arquivos vazios não são aceitos.
- Sucesso: `201 Created`, com os metadados do documento criado em JSON.

Exemplo de resposta:

```json
{
  "id": "9b9a86f2-6d2e-4aa7-b6ea-2bb1e06a9438",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-09-29T14:30:00.000Z",
  "owner": "demo"
}
```

Erros esperados:

| Status | Código sugerido | Quando ocorre |
| --- | --- | --- |
| `400 Bad Request` | `FILE_REQUIRED` | Campo `file` ausente, multipart inválido ou arquivo vazio. |
| `413 Payload Too Large` | `FILE_TOO_LARGE` | Arquivo maior que 10 MiB. |
| `415 Unsupported Media Type` | `FILE_TYPE_NOT_ALLOWED` | Formato não incluído na lista permitida. |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Falha inesperada ao gravar o arquivo ou registrar os metadados. |

Se o arquivo não puder ser persistido como parte de um upload concluído, o sistema não deve retornar sucesso nem metadados de um documento incompleto.

### `GET /documents`

- Entrada: sem corpo ou parâmetros obrigatórios.
- Sucesso: `200 OK`, com um array JSON contendo os metadados dos documentos do owner configurado, ordenados por `uploadedAt` decrescente.
- Sem documentos: `200 OK` com `[]`.
- Erro esperado: `500 Internal Server Error` com o envelope de erro definido acima quando ocorrer uma falha inesperada ao consultar os metadados.

### `GET /documents/:id/download`

- Entrada: identificador do documento no parâmetro `id`.
- Sucesso: `200 OK`, conteúdo binário do arquivo e `Content-Disposition` com o nome original como nome sugerido para download.
- Erros esperados:

| Status | Código sugerido | Quando ocorre |
| --- | --- | --- |
| `404 Not Found` | `DOCUMENT_NOT_FOUND` | Não há metadados em memória para o identificador informado ou o arquivo local correspondente não está disponível. |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Ocorre uma falha inesperada durante a leitura do arquivo. |

## 7. Decisões arquiteturais

- Backend em Clean Architecture simples, com dependências direcionadas de `routes` para `controllers`, `services` e `repositories`; regras de negócio não ficam nas rotas.
- Frontend React organizado por componentes, páginas e serviços. A comunicação HTTP usa `fetch` e o prefixo `/api` do proxy de desenvolvimento.
- Upload implementado com `multer` e `diskStorage`, gravando arquivos somente em `backend/storage`.
- Metadados mantidos em memória nesta fase; a API não promete persistência dos metadados após reinício.
- Modo demonstrativo monousuário, sem autenticação. O owner é configurado no servidor e não pode ser escolhido pelo cliente.
- Armazenamento externo e versionamento permanecem fora do escopo.

## 8. Critérios de aceitação

- Um arquivo permitido, não vazio e dentro do limite resulta em `201` e metadados completos.
- Um upload sem arquivo, vazio, acima do limite ou de tipo não permitido retorna o status e o código de erro especificados, sem sucesso parcial.
- A listagem retorna apenas os metadados do owner configurado, em ordem decrescente de data, e retorna `[]` quando vazia.
- Um documento existente pode ser baixado como binário com o nome original sugerido; um documento inexistente ou indisponível retorna `404`.
- Os arquivos são gravados localmente e os metadados não são apresentados como persistentes após reinício.
- Respostas de erro não expõem detalhes internos do servidor.

## 9. Plano de execução

Este plano cobre a etapa de especificação. A implementação de arquivos de backend e frontend não faz parte desta entrega e deverá ser planejada em uma etapa posterior.

1. Consolidar e aprovar escopo, regras de upload, owner e limitações do armazenamento em memória.
2. Validar os contratos de sucesso e erro das três operações da API contra os requisitos funcionais.
3. Revisar os critérios de aceitação para confirmar que cobrem fluxos válidos, entradas inválidas, listagem vazia e documento indisponível.
4. Usar esta especificação aprovada como entrada para um plano de implementação futuro, fora do escopo desta etapa.