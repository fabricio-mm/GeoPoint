# Geopoint - Sistema de Ponto Eletrônico

Sistema de controle de ponto eletrônico com geolocalização para empresas.

## Funcionalidades

- **Login com múltiplos perfis**: Admin, Analista RH e Funcionário
- **Registro de ponto**: Entrada, saída e intervalos com validação de localização
- **Dashboard Admin**: Gestão de usuários, jornadas de trabalho e visualização de apontamentos
- **Dashboard RH**: Aprovação de solicitações e análise de registros
- **Dashboard Funcionário**: Registro de ponto, histórico e solicitações

## Credenciais de Teste

| Email | Senha | Perfil |
|-------|-------|--------|
| carlos@empresa.com | admin123 | Administrador |
| ana@empresa.com | rh123 | Analista RH |
| joao@empresa.com | emp123 | Funcionário |

## Como Executar

### Pré-requisitos

- Node.js 18+ instalado ([instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm ou bun

### Instalação

```bash
# Clonar o repositório
git clone <URL_DO_REPOSITORIO>

# Entrar na pasta do projeto
cd geopoint

# Instalar dependências
npm install
# ou
bun install
```

### Executar em Desenvolvimento

```bash
npm run dev
# ou
bun dev
```

Acesse:  http://localhost:8080/

### Build para Produção

```bash
npm run build
# ou
bun run build
```

### Preview do Build

```bash
npm run preview
# ou
bun preview
```

## Tecnologias

- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **React Router** - Roteamento
- **date-fns** - Manipulação de datas
- **Lucide React** - Ícones

## Estrutura do Projeto

```
src/
├── components/     # Componentes reutilizáveis
│   ├── Header/
│   ├── HistoryCalendar/
│   └── ui/         # Componentes shadcn
├── contexts/       # Contextos React (Auth)
├── data/           # Dados mock
├── hooks/          # Hooks customizados
├── pages/          # Páginas da aplicação
│   ├── AdminDashboard/
│   ├── EmployeeDashboard/
│   ├── RHDashboard/
│   ├── Dashboard/
│   └── Login/
├── types/          # Tipos TypeScript
└── lib/            # Utilitários
```

## Licença

MIT
