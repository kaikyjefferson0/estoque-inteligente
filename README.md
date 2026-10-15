# Estoque Inteligente

Sistema web Full Stack para controle e gerenciamento de estoque, desenvolvido com React, TypeScript e Python.

A aplicação permite gerenciar produtos, fornecedores, usuários e movimentações de estoque, além de acompanhar lotes, datas de validade e alertas de estoque baixo.

## Acesso ao projeto

- **Aplicação Web:** [Estoque Inteligente](https://estoque-inteligente-web.onrender.com)
- **API REST:** [Backend](https://estoque-inteligente-2xfr.onrender.com)
- **Documentação da API:** [Swagger UI](https://estoque-inteligente-2xfr.onrender.com/docs)

## Funcionalidades

- Cadastro e gerenciamento de produtos
- Cadastro de fornecedores
- Gerenciamento de usuários
- Registro de entradas e saídas de estoque
- Ajustes de estoque
- Controle de lotes e datas de validade
- Alertas de estoque baixo
- Alertas de vencimento de produtos
- Histórico de movimentações
- Autenticação de usuários
- Controle de permissões
- Identificação de produtos por código de barras

## Tecnologias utilizadas

### Frontend

- React
- TypeScript
- CSS3

### Backend

- Python
- FastAPI
- Uvicorn

### Banco de dados

- PostgreSQL
- SQLAlchemy
- Psycopg 3
- Alembic

### Segurança

- Argon2 para hash de senhas
- JWT para autenticação

### Hospedagem e versionamento

- Render
- Git
- GitHub

## Arquitetura

O projeto utiliza uma arquitetura Full Stack, com separação entre frontend, backend e banco de dados.

O frontend foi desenvolvido com React e TypeScript e se comunica com o backend por meio de uma API REST. O backend utiliza FastAPI para processar as requisições e SQLAlchemy para interagir com o PostgreSQL. As alterações na estrutura do banco de dados são gerenciadas pelo Alembic.

## Como executar localmente

### Pré-requisitos

- Python
- Node.js e npm
- PostgreSQL
- Git

### Backend

1. Clone o repositório e acesse a pasta do backend.
2. Crie e ative um ambiente virtual Python.
3. Instale as dependências do projeto.
4. Configure as variáveis de ambiente necessárias, incluindo a conexão com o PostgreSQL.
5. Execute as migrações do banco de dados.
6. Inicie o servidor FastAPI com Uvicorn.

### Frontend

1. Acesse a pasta do frontend.
2. Instale as dependências com npm.
3. Configure a URL da API nas variáveis de ambiente.
4. Inicie o servidor de desenvolvimento.

Os comandos de instalação e execução devem seguir a estrutura e os arquivos de configuração presentes no repositório.

## Objetivo do projeto

O Estoque Inteligente foi desenvolvido para colocar em prática conhecimentos de desenvolvimento Full Stack, incluindo a criação de APIs REST, integração com banco de dados relacional, autenticação de usuários e organização de aplicações web.

O projeto reúne funcionalidades voltadas ao gerenciamento de estoque e permite aplicar conceitos de desenvolvimento backend, frontend e persistência de dados em uma aplicação integrada.

## Autor

[Seu nome]

GitHub: https://github.com/SEU_USUARIO
