# SubSign Professor — FACPP

Parte **verde** do fluxo (coordenador/professores da disciplina):

1. O aluno envia o documento pelo app do aluno. O app chama `POST /api/recebimento` e o documento aparece na caixa da disciplina.
2. O professor entra com a **disciplina + código de acesso**, baixa o PDF original e assina no Adobe.
3. Sobe o PDF assinado no mesmo documento e clica em **Enviar**. O app envia o PDF assinado, em anexo, para:
   - o **paciente** (e-mail digitado pelo aluno no app do aluno, preso ao documento);
   - o **e-mail da disciplina** do documento;
   - `prontuarios@facpp.edu.br` (fixo).

O app começa **vazio**: não existe nenhum dado de exemplo. Tudo fica em `DATA_DIR` (volume `subsign_data`).

## Acesso por disciplina

Cada uma das 13 disciplinas (lista em `disciplinas.ts`) tem um código próprio. A sessão só enxerga os documentos da disciplina em que entrou, e o envio vai sempre para o e-mail da disciplina do documento — não dá para enviar na disciplina errada. Os códigos são gerados na primeira subida e impressos uma vez no log (`docker logs subsign-professor-app`), ou definidos em `DISCIPLINAS_CODIGOS` (ver `.env.example`). Só o hash fica gravado em `data/acessos.json`.

## Contrato do app do aluno

```
POST https://<endereço-do-app-professor>/api/recebimento
X-Api-Key: <RECEBIMENTO_TOKEN>
Content-Type: application/json

{
  "idExterno": "id do documento no app do aluno",   // opcional; evita duplicar em reenvio
  "disciplinaEmail": "clinica.integrada2@facpp.edu.br",  // exatamente um dos 13 e-mails
  "pacienteNome": "Fulana de Tal",
  "pacienteEmail": "fulana@exemplo.com",
  "alunoNome": "Ciclano",                           // opcional
  "alunoRa": "202301988",                           // opcional
  "numero": "FPD-0001",                             // opcional
  "tipo": "Tipo 1",                                 // opcional
  "nomeArquivo": "FPD-fulana.pdf",                  // opcional
  "pdfBase64": "<PDF em base64, até 25 MB>"
}
```

Respostas: `201 {id}` (recebido), `200 {duplicado:true}` (idExterno repetido), `401` (chave errada), `422` (disciplina/e-mail inválidos — o aluno corrige no app), `503` (RECEBIMENTO_TOKEN não configurado).

Exemplo em Python:

```python
import base64, requests
requests.post(URL + "/api/recebimento",
  headers={"X-Api-Key": TOKEN},
  json={"disciplinaEmail": "clinica.integrada2@facpp.edu.br", "pacienteNome": "Fulana",
        "pacienteEmail": "fulana@exemplo.com", "alunoNome": "Ciclano",
        "pdfBase64": base64.b64encode(open("fpd.pdf","rb").read()).decode()},
  timeout=60).raise_for_status()
```

## Conferências no envio

- O PDF assinado idêntico ao original é recusado (ainda não foi assinado).
- Se o PDF assinado começa com os bytes do original (assinatura do Adobe "por cima") e traz uma assinatura digital nova, ele é considerado conferido. Caso contrário o professor precisa marcar "Conferi: é o documento do paciente X".
- Enviar o mesmo PDF duas vezes pede confirmação.

## Rodar

```
npm install
cp .env.example .env   # ajuste
npm run dev
```

Produção: `docker compose up -d --build`.
