# 🚀 MyWorkflows - AI Agent for n8n Automation

MyWorkflows é um micro-SaaS que oferece um agente de IA especializado em ajudar e construir workflows para o n8n. A plataforma acelera e facilita o processo de criação de automações, além de ajudar na resolução de bugs, funcionando como um agente de IA vertical especializado em automações n8n.

## 🎯 Proposta de Valor

- **Acelerar** o processo de criação de automações
- **Facilitar** a construção de workflows complexos
- **Resolver bugs** com assistência de IA especializada
- **Agente vertical** focado exclusivamente em n8n
- **Interface profissional** similar ao ChatGPT/Claude com streaming em tempo real
- **Múltiplos modelos** de IA especializados em programação

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript + Vite
- shadcn/ui + Tailwind CSS
- React Query + WebSocket
- React Hook Form + Zod

### Backend
- Node.js + Express
- WebSocket Server
- Supabase (Auth + Database)
- OpenRouter AI Integration
- Stripe Payment Processing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- OpenRouter API key
- Stripe account (for billing)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/myworkflows.git
cd myworkflows

# Install dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development servers
npm run dev:all
```

The app will be available at:
- Frontend: http://localhost:8080
- WebSocket: ws://localhost:3001
- API: http://localhost:3002

## 📦 Key Features

### ✅ Implemented
- **Authentication & User Management** via Supabase
- **n8n Connection Management** with encrypted API keys
- **Workflow Import & Sync** from n8n instances
- **AI Chat Interface** with 8 specialized models
- **Real-time Streaming** responses via WebSocket
- **MCP Tool System** for dynamic workflow access
- **Context System** with @mentions
- **Billing System** with Stripe integration
- **Rate Limiting** based on plans (Free/Pro)
- **Automated Maintenance** scripts

### 📋 Usage

1. **Connect your n8n instance**: Add connection with API key
2. **Import workflows**: Select and import from your n8n
3. **Chat with AI**: Get help building and debugging workflows
4. **Manage subscription**: Upgrade to Pro for more features

## 🧪 Testing & Maintenance

```bash
# Run health check
npm run health

# Run code audit
npm run audit

# Run automated tests
npm run test:auto

# Run complete maintenance
npm run maintenance
```

## 📚 Documentation

- [CLAUDE.md](./CLAUDE.md) - Detailed project documentation
- [BILLING_PLAN.md](./BILLING_PLAN.md) - Billing system details
- [MAINTENANCE_GUIDE.md](./MAINTENANCE_GUIDE.md) - Maintenance procedures
- [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md) - Deployment guide

## 🚀 Deployment

The project is configured for Railway deployment:

```bash
# Build for production
npm run build:all

# Deploy to Railway
git push origin main
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support, email support@myworkflows.com or open an issue.

---

Made with ❤️ for the n8n community