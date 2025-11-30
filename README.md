# Typelets - Secure Notes

<div style="text-align: left;">

[![Version](https://img.shields.io/github/v/release/typelets/typelets-app)](https://github.com/typelets/typelets-app/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/typelets/typelets-app/actions/workflows/release.yml/badge.svg)](https://github.com/typelets/typelets-app/actions)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/typelets/typelets-app/pulls)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen?logo=node.js)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9.15-F69220?logo=pnpm)](https://pnpm.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](https://www.docker.com/)

</div>

<div style="text-align: left;">
  <h3>A secure, encrypted notes application where your data remains truly private</h3>
  <p>Even we can't read your notes - Built with modern web technologies and client-side encryption</p>
</div>

![Typelets Demo](https://github.com/typelets/typelets-app/blob/main/assets/demo.gif)

## 📱 Mobile App

Available on iOS and Android with the same powerful features and encryption.

- [Download on the App Store](https://apps.apple.com/us/app/typelets/id6753926295)
- [Get it on Google Play](https://play.google.com/store/apps/details?id=com.typelets.notes&pcampaignid=web_share)

<div align="center">
  <img src="https://typelets.com/assets/images/mobile/screenshot-1.png" width="250" alt="Mobile Screenshot 1"/>
  &nbsp;&nbsp;
  <img src="https://typelets.com/assets/images/mobile/screenshot-2.png" width="250" alt="Mobile Screenshot 2"/>
  &nbsp;&nbsp;
  <img src="https://typelets.com/assets/images/mobile/screenshot-3.png" width="250" alt="Mobile Screenshot 3"/>
</div>


- 📱 Native iOS and Android apps
- 🔐 Same client-side encryption
- 🔄 Real-time sync across all devices
- ✍️ Full-featured WYSIWYG editor
- 🎨 Native mobile experience

## ✨ Features

### 🔒 Security & Privacy
- 🔐 **Client-side AES-256-GCM encryption** - Your notes are encrypted before leaving your device
- 🔑 **Master password management** - Change your master password with automatic key re-derivation
- 🛡️ **Zero-knowledge architecture** - Server never sees unencrypted data
- 🔄 **Real-time sync** - Access your notes from anywhere securely

### 📁 Organization & Management
- 📁 **Nested folder organization** - Create unlimited folder hierarchies with drag & drop
- 🔄 **Move & organize** - Move notes and folders between locations
- ⭐ **Star, archive, and organize** - Keep your important notes accessible
- 🙈 **Hide sensitive notes** - Keep private notes hidden from quick view
- 🏷️ **Smart filtering & sorting** - Filter by starred, hidden, with attachments, or sort by date/title
- 🔍 **Full-text search** - Find notes instantly (searches encrypted data locally)

### ✍️ Advanced Rich Text Editor
- 📝 **Modern rich text editing** - Powered by TipTap with extensive formatting support
- 🎨 **Comprehensive formatting** - Bold, italic, underline, strikethrough, highlights
- 📋 **Lists & structure** - Bullet lists, numbered lists, task lists, blockquotes
- 🖼️ **Smart image handling** - Upload, resize, drag & drop images with visual controls
- 📑 **Table of contents** - Auto-generated TOC with smooth navigation
- ⚡ **Slash commands** - Quick formatting with `/` commands (headings, lists, images, etc.)
- 📋 **Note templates** - Pre-built templates for meetings, projects, daily notes, research, and secure password storage
- 💾 **Auto-save** - Real-time saving with visual indicators
- 🔗 **Links & references** - Easy link insertion and management
- 🧮 **Code support** - Inline code and code blocks with syntax highlighting
- ⚡ **Executable code blocks** - Run JavaScript, Python, Java, C++, and 10+ other languages directly in your notes

### 📊 Professional Status Bar
- 📈 **Real-time statistics** - Word count, character count, reading time estimates
- 📜 **Scroll tracking** - Visual scroll position indicator
- 🔍 **Zoom controls** - Adjustable text size (50%-200%) with visual controls
- 💾 **Save status** - Live save status with visual feedback

### 💻 User Experience
- 🌙 **Dark/Light mode** - Easy on the eyes, day or night
- 📎 **File attachments** - Upload and encrypt files up to 10MB per file
- 📊 **Usage tracking** - Monitor storage and notes limits with visual progress indicators
- 🌐 **Cross-platform** - Responsive web app that works seamlessly on desktop, tablet, and mobile
- 🖨️ **Print support** - Clean printing with proper formatting

### 🌐 Public Notes (Sharing)
- 🔗 **Shareable links** - Publish any note with a unique, unguessable URL
- 👤 **Optional author attribution** - Add your name or publish anonymously
- 🎨 **Full formatting preserved** - Rich text, code blocks, images, and diagrams render beautifully
- 📑 **Table of contents** - Collapsible TOC for easy navigation
- 🌙 **Theme toggle** - Readers can switch between light and dark mode
- 📱 **Mobile-friendly** - Responsive design for all screen sizes
- 🔄 **Auto-sync** - Changes to your note automatically update the public version
- ❌ **Instant unpublish** - Remove public access at any time (hard delete)
- 🛡️ **Security hardened** - DOMPurify sanitization, rate limiting, no internal IDs exposed
- 🔍 **SEO optimized** - Server-side rendering for search engine indexing and social previews

> ⚠️ **Important:** Publishing a note bypasses end-to-end encryption. An unencrypted copy is stored on our servers and anyone with the link can view it. Use this feature only for content you intend to share publicly.

> 💡 **Optional:** For improved SEO on public notes, you can deploy the SSR worker. See [`worker/README.md`](./worker/README.md) for setup instructions.

### ⚡ Executable Code Blocks

![Execute Code Demo](https://github.com/typelets/typelets-app/blob/main/assets/execute-code-demo.gif)

- 💻 **15+ Programming Languages** - JavaScript, TypeScript, Python, Java, C++, C#, Go, Rust, PHP, Ruby, Kotlin, Swift, Bash, SQL, and more
- 🎨 **Monaco Editor Integration** - Professional VS Code-powered editor with IntelliSense and syntax highlighting
- ⚡ **One-click Execution** - Run code instantly with the play button or `Ctrl+Enter` keyboard shortcut
- 📊 **Real-time Status Updates** - Live execution progress from "In Queue" → "Processing" → "Complete"
- 🔄 **Resizable Code Blocks** - Drag to adjust editor height for optimal viewing
- 🌙 **Theme Toggle** - Switch between light and dark Monaco editor themes
- 💾 **Persistent Results** - Code output is automatically saved with your notes
- 🔒 **Secure Sandboxed Execution** - Code runs in isolated environments via Piston API on EC2
- 📋 **Error Handling** - Clear error messages and compilation details for debugging

### 📊 Spreadsheet Support

Create powerful spreadsheets directly in your notes:

- 📊 **Excel-like editing** - Full spreadsheet functionality with formulas, formatting, and cell styling
- 🔢 **Formula support** - Use familiar spreadsheet formulas for calculations
- 📋 **Multiple sheets** - Organize data across multiple worksheets
- 🎨 **Cell formatting** - Bold, colors, borders, alignment, and number formats
- 🔒 **Encrypted storage** - Spreadsheet data is encrypted like all your notes
- 🌐 **Public sharing** - Share spreadsheets publicly with read-only access
- 🚀 **Quick create** - Use the "New Spreadsheet" button to get started

### 📈 Diagram Support

![Create Diagram Demo](https://github.com/typelets/typelets-app/blob/main/assets/diagram-demo.gif)

Create beautiful diagrams with Mermaid and PlantUML support:

- 📐 **Mermaid Diagrams** - Flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, and more
- 🎨 **PlantUML Support** - UML diagrams, architecture diagrams, and technical drawings
- 🚀 **Quick Create** - Use the "New Diagram" button or slash command `/diagram`
- 👁️ **Live Preview** - See your diagram update in real-time as you type
- 📋 **Diagram Templates** - Start with pre-built templates for common diagram types
- 💾 **Auto-Save** - Diagrams are automatically saved with your notes
- 🔄 **Instant Conversion** - Convert existing notes to diagram notes with one click

## 🔒 Security First

Typelets uses industry-standard encryption:
- **AES-256-GCM** encryption algorithm
- **250,000 PBKDF2 iterations** for key derivation
- **Per-note salt** - Each note has a unique encryption key
- **File encryption** - Attachments are encrypted with the same security as notes
- **Zero-knowledge architecture** - Server never sees unencrypted data

Your encryption keys are derived from your master password. Even if our database is compromised, your notes and files remain encrypted and unreadable.

### How It Works

1. **Mandatory Setup**: You must set a master password on first use
2. **Client-Side Encryption**: All encryption happens in your browser
3. **Encrypted Storage**: Only encrypted data is sent to our servers
4. **No Recovery**: We cannot recover forgotten passwords (by design)

For complete security details and technical implementation, see our [**Security Documentation →**](./SECURITY.md)


## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm 9.15.0+
- A [Clerk](https://clerk.com) account for authentication

### Installation

```bash
# Clone the repository
git clone https://github.com/typelets/typelets-app.git
cd typelets

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:5173`

### Environment Setup

Create `.env.local` with your configuration:

```env
# Required - Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key

# API Configuration
VITE_API_URL=/api

# Proxy Configuration (for development)
# The proxy will forward /api requests to this target
VITE_PROXY_TARGET=https://your-api-domain.com

# Optional
VITE_APP_NAME=Typelets
VITE_APP_VERSION=0.5.0
```

**Authentication Setup:**
- Get your Clerk keys from [dashboard.clerk.com](https://dashboard.clerk.com)

**Code Execution Setup:**
- Code execution is handled securely by your backend API
- The backend uses Piston API running on EC2 for isolated code execution
- No client-side API keys required for security

### Development Proxy

The development server includes a built-in proxy to avoid CORS issues during local development. The proxy automatically forwards all `/api` requests to your backend server.

#### Using Different Backends

```bash
# Default: Use dev API server
pnpm dev

# Use local Docker API
VITE_PROXY_TARGET=http://localhost:8080 pnpm dev

# Use production API (for testing)
VITE_PROXY_TARGET=https://your-api-domain.com pnpm dev
```

You can also create environment-specific files:
- `.env.local` - Default development
- `.env.docker` - Local Docker API
- `.env.production` - Production build

## 🐳 Docker Deployment

### Build and Run Locally

```bash
# Build Docker image
docker build -t typelets-app:latest \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_WEBSOCKET_URL \
  .

# Run with your backend
docker run -p 80:8080 \
  -e BACKEND_URL=https://your-api-domain.com \
  typelets-app:latest
```

### Deploy to AWS ECR

<details>
<summary><b>Windows (PowerShell)</b></summary>

```powershell
# Set your configuration
$env:AWS_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
$env:AWS_REGION = "us-east-1"
$env:ECR_REPOSITORY = "typelets-app"
$env:VITE_API_URL = "/api"
$env:VITE_WEBSOCKET_URL = "https://your-api-domain.com"
$env:VITE_CLERK_PUBLISHABLE_KEY = "pk_live_your_key_here"

# Create ECR repository (first time only)
aws ecr create-repository `
  --repository-name $env:ECR_REPOSITORY `
  --region $env:AWS_REGION `
  --image-scanning-configuration scanOnPush=true

# Login to ECR
aws ecr get-login-password --region $env:AWS_REGION | docker login --username AWS --password-stdin "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:AWS_REGION.amazonaws.com"

# Build the Docker image
docker build -t typelets-app:latest `
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=$env:VITE_CLERK_PUBLISHABLE_KEY `
  --build-arg VITE_API_URL=$env:VITE_API_URL `
  --build-arg VITE_WEBSOCKET_URL=$env:VITE_WEBSOCKET_URL `
  .

# Tag for ECR
docker tag typelets-app:latest `
  "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:AWS_REGION.amazonaws.com/${env:ECR_REPOSITORY}:latest"

# Push to ECR
docker push "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:AWS_REGION.amazonaws.com/${env:ECR_REPOSITORY}:latest"
```
</details>

<details>
<summary><b>Mac/Linux</b></summary>

```bash
# Set your configuration
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1
export ECR_REPOSITORY=typelets-app
export VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_key_here
export VITE_API_URL=/api
export VITE_WEBSOCKET_URL=wss://your-api-domain.com

# Create ECR repository (first time only)
aws ecr create-repository \
  --repository-name $ECR_REPOSITORY \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build the Docker image
docker build -t typelets-app:latest \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY \
  --build-arg VITE_API_URL=$VITE_API_URL \
  --build-arg VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL \
  .

# Tag for ECR
docker tag typelets-app:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
```
</details>

### Configuration

#### Build Arguments (compile-time)

| Argument | Description | Example |
|----------|-------------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk authentication key | `pk_live_xxx` |
| `VITE_API_URL` | API path for React app (MUST be `/api`) | `/api` |
| `VITE_WEBSOCKET_URL` | WebSocket URL for real-time sync | `wss://your-api-domain.com` |

#### Runtime Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_URL` | Your backend API URL | `https://your-api-domain.com` |

#### Development Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_PROXY_TARGET` | Backend URL for development proxy | `https://your-api-domain.com` |
| `VITE_API_URL` | API path (keep as `/api`) | `/api` |
| `VITE_WEBSOCKET_URL` | WebSocket URL for development | `wss://your-api-domain.com` |

### Cloud Deployment Examples

<details>
<summary><b>AWS ECS</b></summary>

```json
{
  "containerDefinitions": [{
    "name": "typelets-app",
    "image": "your-ecr-uri:latest",
    "environment": [
      {
        "name": "BACKEND_URL",
        "value": "https://your-api-domain.com"
      }
    ],
    "portMappings": [{
      "containerPort": 8080
    }]
  }]
}
```
</details>

<details>
<summary><b>Docker Compose</b></summary>

```yaml
version: '3.8'
services:
  typelets-app:
    image: typelets-app:latest
    ports:
      - "80:8080"
    environment:
      - BACKEND_URL=https://your-api-domain.com
```
</details>

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm dev          # Start dev server with proxy
pnpm dev:docker   # Start with local Docker API
pnpm build        # Build for production
pnpm preview      # Preview production build

# Code Quality
pnpm lint         # Check for linting issues
pnpm lint:fix     # Auto-fix linting issues
pnpm format       # Format code with Prettier
pnpm type-check   # Check TypeScript types

# Docker
pnpm docker:build # Build Docker image
pnpm docker:run   # Run container locally
```

### Project Structure

```
typelets/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions & services
│   │   └── encryption/ # Client-side encryption
│   ├── types/          # TypeScript definitions
│   └── App.tsx         # Main App component
├── worker/             # Cloudflare Worker for SSR (optional)
│   ├── src/            # Worker source code
│   └── README.md       # SSR setup instructions
├── public/             # Static assets
├── nginx.conf.template # Nginx configuration
├── vite.config.ts      # Vite configuration with proxy
├── Dockerfile          # Docker configuration
└── .env.example        # Environment variables template
```

## 🚀 Tech Stack

- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 7 with development proxy
- **Styling:** Tailwind CSS v4
- **Editor:** TipTap with code highlighting
- **Code Editor:** Monaco Editor (VS Code engine)
- **Code Execution:** Piston API (self-hosted on EC2) for 15+ programming languages
- **Authentication:** Clerk
- **UI Components:** Radix UI
- **Encryption:** Web Crypto API with AES-256-GCM

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [TipTap](https://tiptap.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Clerk](https://clerk.com/)
- [Radix UI](https://www.radix-ui.com/)
