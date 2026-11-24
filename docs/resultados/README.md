# Resultados das suítes de teste

Execução de 24/11/2026, na máquina de desenvolvimento (Windows 11, Python 3.14.8, PostgreSQL local). Cada arquivo traz a saída completa, com a data, o comando e o código de saída no topo.

| Suíte | Comando | Total | Aprovados | Falhas | Tempo | Cobertura (%) |
|---|---|---|---|---|---|---|
| [Unitários](unitarios.txt) | `pytest -m unitario -v` | 74 | 74 | 0 | 0,27 s | não medida à parte |
| [Integração](integracao.txt) | `pytest -m integracao -v` | 613 | 613 | 0 | 99,83 s | não medida à parte |
| [Backend completo](pytest-completo.txt) | `pytest -rs` | 746 | 746 | 0 | 98,58 s | ver a linha abaixo |
| [Cobertura do backend](cobertura.txt) | `pytest --cov=app --cov-report=term-missing` | 746 | 746 | 0 | 99,43 s | **97** (1.821 de 1.883 linhas) |
| [Frontend (Vitest)](vitest.txt) | `npm run test` | 181 | 181 | 0 | 18,49 s | não medida |
| [E2E extra (Playwright)](playwright.txt) | `npm run test:e2e` | 26 | 26 | 0 | 156,6 s | não se aplica |
| E2E com Cypress: no próximo PR | – | – | – | – | – | – |

Os comandos `pytest` rodam dentro de `backend`; os `npm`, dentro de `frontend`. Nenhum teste foi pulado. O tempo é o que a própria suíte informa; o do Playwright é o total do comando, que também recria o banco e sobe a API e o site.

Os unitários rodaram com o Docker desligado e com `DATABASE_URL` e `SECRET_KEY` falsas, apontando para uma porta sem banco. Além disso, `backend/tests/unit/conftest.py` recusa qualquer tentativa de conexão.

O total do backend é maior que a soma de unitários e integração: 59 testes antigos (configuração, CORS, cabeçalhos HTTP e limites de entrada, entre outros) não usam as fixtures do banco e ainda não foram movidos para `tests/unit`, então ficam sem marcador. 74 + 613 + 59 = 746.

A cobertura é de linhas, mede todo o `app` (inclusive `app/scripts`, sem `omit`) e passa da meta de 80%. O relatório navegável é gerado com `pytest --cov=app --cov-report=html`, em `backend/htmlcov/index.html` (fora do git).

## Diferença entre unitário, integração e E2E

No projeto, o **teste unitário** chama uma função pura com valores escolhidos e confere a resposta, sem banco, sem HTTP e sem relógio: é o mais rápido e o lugar dos valores-limite (com mínimo 5, testa 4, 5 e 6). O **teste de integração** usa o PostgreSQL de verdade (banco `_test`, criado pelas migrations) e confere se rota, service, SQL, restrições e transações funcionam juntos; o CT-110, por exemplo, prova que a regra em SQL e a regra em Python concordam nos mesmos limites. O **teste de ponta a ponta (E2E)** abre o site num navegador, com a API e o banco reais, e repete o que o usuário faz: é o mais lento e o que chega mais perto do uso real. O **Vitest** cobre as funções e os componentes do frontend, sem a API.

| Camada | O que testa | Usa banco? | Usa navegador? | Ferramenta |
|---|---|---|---|---|
| Unitário | Uma regra pura e seus valores-limite | Não | Não | pytest (`-m unitario`) |
| Integração | Rota + service + SQL + restrições do banco | Sim (`_test`) | Não | pytest (`-m integracao`) |
| Frontend | Funções e componentes da tela | Não | Não | Vitest |
| E2E | O fluxo inteiro: site + API + banco | Sim (`_e2e`) | Sim | Playwright (extra); Cypress no próximo PR |
