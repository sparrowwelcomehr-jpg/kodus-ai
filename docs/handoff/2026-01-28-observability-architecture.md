# Arquitetura de Observabilidade do Pipeline (Handover)

**Data:** 28/01/2026
**Status:** Implementado & Validado

Este documento detalha as mudanças realizadas na arquitetura de logs do pipeline de Code Review para suportar rastreamento granular, status corretos e mensagens amigáveis.

---

## 1. Banco de Dados (`code_review_execution`)

A tabela deixou de ser um log append-only simples e passou a rastrear o estado de cada etapa (State Machine).

### Colunas Importantes

- **`stage_name` (VARCHAR):** Nome técnico da etapa (ex: `ValidateConfigStage`).
- **`status` (ENUM):**
    - `in_progress`: Rodando.
    - `success`: Concluído com sucesso.
    - `error`: Falha crítica (exceção).
    - `skipped`: Pulado por regra de negócio.
    - **`partial_error` (NOVO):** Concluído, mas com falhas parciais (ex: alguns arquivos falharam, mas o PR continuou).
- **`finishedAt` (TIMESTAMP):** Data de conclusão. (Use `created_at` para início).
- **`metadata` (JSONB):** Contém detalhes ricos.
    - `visibility`: `'primary'` (Importante) ou `'secondary'` (Detalhe técnico).
    - `label`: Nome amigável para exibição (ex: "Analyzing Files").
    - `partialErrors`: Array de objetos `{ file, message }` (se status for `partial_error`).

---

## 2. Lógica de Execução (Backend)

### Ciclo de Vida (State Machine)

1.  **Start:** O Observer cria um registro (`INSERT`) com status `in_progress`.
2.  **Execution:** O stage roda.
3.  **Finish:** O Observer busca o registro ativo no banco e realiza um `UPDATE` para o status final (`success`/`error`/etc) e preenche `finishedAt`.

_Resultado:_ Uma linha única por etapa no banco. Sem duplicatas.

### Resiliência

- O sistema usa o `correlationId` para identificar o Job.
- Se o contexto em memória falhar, ele faz uma busca (`findLatestInProgress`) no banco para garantir que o Update ocorra no registro correto.

---

## 3. Instruções para o Backend (Query Agent)

Para buscar os dados para a UI, use uma query simples filtrando pelo ID da execução pai.

```sql
SELECT * FROM code_review_execution
WHERE automation_execution_id = :uuid
ORDER BY created_at ASC
```

**Nota:** O índice `IDX_cre_automation_exec_created` já existe para otimizar essa consulta.

---

## 4. Instruções para o Frontend (UI Agent)

Lógica recomendada para renderização da Timeline:

1.  **Filtragem (Visão Padrão):**
    - Exibir apenas itens onde `metadata.visibility !== 'secondary'`.
    - Oferecer botão "Show Debug/Technical Steps" para exibir os `secondary`.

2.  **Conteúdo:**
    - **Título:** Usar `metadata.label`. Se não existir, fallback para `stage_name`.
    - **Mensagem:** Exibir `message` (Já vem formatada e amigável).
    - **Tempo:** `finishedAt - createdAt`.

3.  **Status e Cores:**
    - `success` → 🟢 Verde.
    - `in_progress` → 🔵 Azul (Spinner).
    - `skipped` → ⚪ Cinza.
    - `error` → 🔴 Vermelho.
    - **`partial_error`** → 🟠 Laranja (Alerta ⚠️).

4.  **Tratamento de Erros Parciais:**
    - Se status for `partial_error` (Laranja), mostrar aviso expansível.
    - Iterar sobre `metadata.partialErrors` para listar os arquivos que falharam.

---

## 5. Dicionário de Mensagens

As mensagens de erro e skip agora são padronizadas e orientadas à ação.
Exemplo de string no banco:
`"Draft PR Skipped — Enable 'Run on Draft' in settings (runOnDraft=false)"`

Não é necessário processar a string no front, ela já vem pronta para leitura humana.
