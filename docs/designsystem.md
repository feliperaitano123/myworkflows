# 🎨 Design System - MyWorkflows

## 📋 Visão Geral

O MyWorkflows utiliza um design system moderno e consistente baseado em **shadcn/ui** + **Tailwind CSS**, oferecendo uma experiência visual profissional para automação de workflows n8n.

### Princípios de Design
- **Consistência**: Componentes padronizados e reutilizáveis
- **Acessibilidade**: Seguindo padrões WCAG e Radix UI
- **Flexibilidade**: Suporte a tema claro e escuro
- **Performance**: CSS otimizado e carregamento rápido
- **Experiência**: Interface limpa e intuitiva

---

## 🎨 Sistema de Cores

### Paleta Principal (Light Theme)
```css
/* Cores Base */
--background: 0 0% 100%;           /* #FFFFFF - Fundo principal */
--foreground: 0 0% 3.9%;           /* #0A0A0A - Texto principal */
--card: 0 0% 100%;                 /* #FFFFFF - Fundo de cards */
--card-foreground: 0 0% 3.9%;      /* #0A0A0A - Texto em cards */

/* Cores Primárias */
--primary: 0 0% 9%;                /* #171717 - Botões principais */
--primary-foreground: 0 0% 98%;    /* #FAFAFA - Texto em botões primários */

/* Cores Secundárias */
--secondary: 0 0% 96.1%;           /* #F5F5F5 - Botões secundários */
--secondary-foreground: 0 0% 9%;   /* #171717 - Texto em botões secundários */

/* Cores de Estado */
--destructive: 0 84.2% 60.2%;      /* #EF4444 - Ações destrutivas */
--destructive-foreground: 0 0% 98%; /* #FAFAFA - Texto em ações destrutivas */

/* Cores Neutras */
--muted: 0 0% 96.1%;               /* #F5F5F5 - Fundos discretos */
--muted-foreground: 0 0% 45.1%;    /* #737373 - Texto discreto */
--accent: 0 0% 96.1%;              /* #F5F5F5 - Acentos */
--accent-foreground: 0 0% 9%;      /* #171717 - Texto em acentos */

/* Bordas e Inputs */
--border: 0 0% 89.8%;              /* #E5E5E5 - Bordas padrão */
--input: 0 0% 89.8%;               /* #E5E5E5 - Bordas de inputs */
--ring: 0 0% 3.9%;                 /* #0A0A0A - Focus ring */
```

### Paleta Escura (Dark Theme)
```css
/* Cores Base */
--background: 0 0% 3.9%;           /* #0A0A0A - Fundo principal */
--foreground: 0 0% 98%;            /* #FAFAFA - Texto principal */
--card: 0 0% 3.9%;                 /* #0A0A0A - Fundo de cards */
--card-foreground: 0 0% 98%;       /* #FAFAFA - Texto em cards */

/* Cores Primárias */
--primary: 0 0% 98%;               /* #FAFAFA - Botões principais */
--primary-foreground: 0 0% 9%;     /* #171717 - Texto em botões primários */

/* Cores Secundárias */
--secondary: 0 0% 14.9%;           /* #262626 - Botões secundários */
--secondary-foreground: 0 0% 98%;  /* #FAFAFA - Texto em botões secundários */

/* Cores de Estado */
--destructive: 0 62.8% 30.6%;      /* #991B1B - Ações destrutivas */
--destructive-foreground: 0 0% 98%; /* #FAFAFA - Texto em ações destrutivas */

/* Cores Neutras */
--muted: 0 0% 14.9%;               /* #262626 - Fundos discretos */
--muted-foreground: 0 0% 63.9%;    /* #A3A3A3 - Texto discreto */
--accent: 0 0% 14.9%;              /* #262626 - Acentos */
--accent-foreground: 0 0% 98%;     /* #FAFAFA - Texto em acentos */

/* Bordas e Inputs */
--border: 0 0% 14.9%;              /* #262626 - Bordas padrão */
--input: 0 0% 14.9%;               /* #262626 - Bordas de inputs */
--ring: 0 0% 83.1%;                /* #D4D4D4 - Focus ring */
```

### Cores para Gráficos
```css
--chart-1: 12 76% 61%;             /* #F97316 - Laranja */
--chart-2: 173 58% 39%;            /* #0891B2 - Azul ciano */
--chart-3: 197 37% 24%;            /* #1E40AF - Azul escuro */
--chart-4: 43 74% 66%;             /* #EAB308 - Amarelo */
--chart-5: 27 87% 67%;             /* #F59E0B - Âmbar */
```

---

## ✍️ Tipografia

### Configuração Base
- **Font Family**: Sistema padrão (`system-ui`, `-apple-system`, `BlinkMacSystemFont`)
- **Font Smoothing**: Antialiased
- **Line Height**: Otimizada para legibilidade

### Hierarquia de Texto
```css
/* Títulos */
.text-4xl    /* 36px - Títulos principais de página */
.text-3xl    /* 30px - Títulos de seção */
.text-2xl    /* 24px - Subtítulos importantes */
.text-xl     /* 20px - Títulos de cards */
.text-lg     /* 18px - Títulos menores */

/* Corpo de Texto */
.text-base   /* 16px - Texto padrão */
.text-sm     /* 14px - Texto secundário */
.text-xs     /* 12px - Labels e metadados */

/* Pesos */
.font-light     /* 300 - Texto leve */
.font-normal    /* 400 - Texto padrão */
.font-medium    /* 500 - Texto com destaque */
.font-semibold  /* 600 - Títulos e botões */
.font-bold      /* 700 - Títulos importantes */
```

### Aplicação Prática
```jsx
// Título principal da página
<h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>

// Subtítulo
<p className="text-sm text-muted-foreground">AI-powered workflow conversation</p>

// Texto de botão
<span className="text-sm font-medium">Import Workflow</span>

// Label de formulário
<label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
  Workflows
</label>
```

---

## 📐 Espaçamento e Layout

### Sistema de Spacing (Tailwind)
```css
/* Padding/Margin */
.p-1    /* 4px */   .m-1    /* 4px */
.p-2    /* 8px */   .m-2    /* 8px */
.p-3    /* 12px */  .m-3    /* 12px */
.p-4    /* 16px */  .m-4    /* 16px */
.p-6    /* 24px */  .m-6    /* 24px */
.p-8    /* 32px */  .m-8    /* 32px */

/* Gap */
.gap-1  /* 4px */
.gap-2  /* 8px */
.gap-3  /* 12px */
.gap-4  /* 16px */
```

### Border Radius
```css
--radius: 0.5rem;                  /* 8px - Raio padrão */

.rounded-sm    /* calc(0.5rem - 4px) = 4px */
.rounded-md    /* calc(0.5rem - 2px) = 6px */
.rounded-lg    /* 0.5rem = 8px */
.rounded-xl    /* 12px */
.rounded-full  /* 50% */
```

### Container e Breakpoints
```css
.container {
  center: true;
  padding: 2rem;
  max-width: 1400px; /* 2xl breakpoint */
}

/* Breakpoints */
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1400px
```

---

## 🧩 Componentes Base

### Button
```jsx
// Variantes
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Tamanhos
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">🔧</Button>
```

### Card
```jsx
<Card>
  <CardHeader>
    <CardTitle>Workflow Name</CardTitle>
    <CardDescription>Description here</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Conteúdo */}
  </CardContent>
  <CardFooter>
    {/* Ações */}
  </CardFooter>
</Card>
```

### Input
```jsx
<Input 
  type="text" 
  placeholder="Enter workflow name..."
  className="h-10"
/>
```

### Badge
```jsx
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Inactive</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Draft</Badge>
```

---

## 🏗️ Componentes Customizados

### Header
```jsx
<Header
  title="Workflow Chat"
  subtitle="AI-powered workflow conversation"
  actionButton={{
    label: "Settings",
    icon: SettingsIcon,
    onClick: () => {},
    variant: 'secondary'
  }}
  editable={{
    onSave: (newTitle) => {},
    isLoading: false
  }}
/>
```

**Estrutura Visual:**
- Altura fixa: `py-4` (16px top/bottom)
- Padding horizontal: `px-6` (24px left/right)
- Border inferior: `border-b border-border`
- Background: `bg-background`

### Sidebar
```jsx
<Sidebar 
  isCollapsed={false}
  onToggleCollapse={() => {}}
/>
```

**Estados:**
- **Expandida**: `w-64` (256px)
- **Colapsada**: `w-16` (64px)
- **Transição**: `transition-all duration-300 ease-in-out`

**Seções:**
1. **Header**: Logo + título
2. **Navigation**: Links principais
3. **Workflows**: Lista dinâmica
4. **Toggle**: Botão de colapsar

### Layout Principal
```jsx
<Layout>
  <div className="flex h-screen bg-background w-full">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      {children}
    </div>
  </div>
</Layout>
```

---

## 🎭 Estados e Interações

### Estados de Hover
```css
/* Botões */
.hover:bg-primary/90           /* Primary hover */
.hover:bg-accent              /* Ghost hover */
.hover:bg-secondary/80        /* Secondary hover */

/* Links de navegação */
.hover:bg-sidebar-accent
.hover:text-sidebar-accent-foreground
```

### Estados de Focus
```css
.focus-visible:outline-none
.focus-visible:ring-2
.focus-visible:ring-ring
.focus-visible:ring-offset-2
```

### Estados Disabled
```css
.disabled:pointer-events-none
.disabled:opacity-50
```

### Loading States
```jsx
// Skeleton loading
<Skeleton className="h-4 w-full" />

// Spinner
<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
```

---

## 🎬 Animações

### Animações Customizadas
```css
/* Expansão de conteúdo */
@keyframes expand {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Slide da direita */
@keyframes slide-in-from-right {
  0% {
    transform: translateX(100%);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Accordion */
.animate-accordion-down
.animate-accordion-up
```

### Classes de Animação
```css
.animate-expand          /* Expandir suavemente */
.animate-collapse        /* Colapsar suavemente */
.animate-slide-in-from-right  /* Slide da direita */
.animate-fade-out        /* Fade out */
.transition-all          /* Transição geral */
.transition-colors       /* Transição de cores */
```

---

## 📱 Responsividade

### Breakpoints Mobile-First
```css
/* Mobile First */
.block                    /* Mobile padrão */
.md:flex                 /* Desktop: flex */
.lg:grid-cols-3          /* Large: 3 colunas */

/* Sidebar responsiva */
.w-16                    /* Mobile: sempre colapsada */
.md:w-64                 /* Desktop: expandida */

/* Header responsivo */
.flex-col               /* Mobile: vertical */
.md:flex-row            /* Desktop: horizontal */
```

### Padrões Responsivos
```jsx
// Grid responsivo
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Padding responsivo
<div className="px-4 md:px-6 lg:px-8">

// Texto responsivo
<h1 className="text-xl md:text-2xl lg:text-3xl">
```

---

## 🔧 Utilitários e Helpers

### Classes Utilitárias Customizadas
```css
/* Truncate text */
.truncate

/* Screen reader only */
.sr-only

/* Aspect ratios */
.aspect-square
.aspect-video

/* Scroll areas */
.overflow-y-auto
.max-h-[300px]
```

### Função cn() - Class Names
```jsx
import { cn } from '@/lib/utils'

// Combinar classes condicionalmente
<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  variant === 'primary' && 'primary-classes'
)} />
```

---

## 📋 Padrões de Uso

### Estrutura de Página Típica
```jsx
function PageComponent() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header fixo */}
      <Header title="Page Title" />
      
      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Cards e conteúdo */}
        </div>
      </div>
    </div>
  )
}
```

### Card Pattern
```jsx
<Card className="hover:shadow-md transition-shadow">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="text-lg">Title</CardTitle>
      <Badge variant="secondary">Status</Badge>
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Conteúdo */}
  </CardContent>
</Card>
```

### Form Pattern
```jsx
<form className="space-y-6">
  <div className="space-y-2">
    <Label htmlFor="name">Name</Label>
    <Input id="name" placeholder="Enter name..." />
  </div>
  
  <div className="flex justify-end gap-3">
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Save</Button>
  </div>
</form>
```

---

## 🎯 Boas Práticas

### Consistência Visual
- ✅ Sempre usar as variáveis CSS do tema
- ✅ Manter espaçamentos consistentes (múltiplos de 4px)
- ✅ Usar a hierarquia de cores estabelecida
- ✅ Aplicar border-radius consistente

### Acessibilidade
- ✅ Focus states visíveis
- ✅ Contraste adequado (WCAG AA)
- ✅ Labels semânticos
- ✅ Keyboard navigation

### Performance
- ✅ Classes Tailwind otimizadas
- ✅ Componentes lazy-loaded quando necessário
- ✅ Animações com `transform` e `opacity`
- ✅ Evitar re-renders desnecessários

### Manutenibilidade
- ✅ Componentes reutilizáveis
- ✅ Props tipadas com TypeScript
- ✅ Documentação inline
- ✅ Testes de componentes

---

## 🚀 Implementação

### Setup Inicial
```bash
# Instalar dependências
npm install @radix-ui/react-* class-variance-authority clsx tailwind-merge

# Configurar Tailwind
npx tailwindcss init -p

# Configurar shadcn/ui
npx shadcn-ui@latest init
```

### Estrutura de Arquivos
```
src/
├── components/
│   ├── ui/           # Componentes base (shadcn/ui)
│   ├── Header.tsx    # Componentes customizados
│   └── Layout.tsx
├── lib/
│   └── utils.ts      # Utilitários (cn function)
└── index.css         # CSS variables e base styles
```

### Configuração Tailwind
```js
// tailwind.config.ts
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // CSS variables
      }
    }
  }
}
```

---

*Este design system garante consistência, acessibilidade e manutenibilidade em todo o MyWorkflows, proporcionando uma experiência de usuário profissional e moderna.* 