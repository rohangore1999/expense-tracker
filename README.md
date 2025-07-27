# Mail Reader App 🛠️[WIP]

A Next.js application for extracting and analyzing bank-related emails with AI-powered insights.

## Features

- 📧 **Email Integration**: Connect Gmail, Outlook, Yahoo and other email providers
- 🏦 **Bank Email Detection**: Automatically identify bank-related emails
- 📊 **Data Extraction**: Extract transaction details, account statements, and payment confirmations
- 🔐 **Secure**: OAuth2 authentication with encrypted data storage
- 📱 **Responsive UI**: Built with Tailwind CSS and shadcn/ui components

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Authentication**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS v3.3.0
- **UI Components**: shadcn/ui (adapted for JavaScript)
- **Icons**: Lucide React
- **Database**: MongoDB (planned)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Cloud Platform account

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API and Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Set authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy your Client ID and Client Secret

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd mail-reader-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env.local` file:

   ```bash
   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here

   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-super-secret-jwt-secret-here
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication Flow

1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent screen
3. User grants permissions for Gmail access
4. Redirected back to `/dashboard` with user session
5. Dashboard shows user details and connected status

## Project Structure

```
mail-reader-app/
├── app/
│   ├── api/auth/[...nextauth]/  # NextAuth.js API routes
│   ├── dashboard/               # Protected dashboard page
│   ├── providers.js            # Session provider wrapper
│   ├── globals.css             # Global styles with Tailwind
│   ├── layout.js              # Root layout with providers
│   └── page.js                # Landing page with Google Sign In
├── components/ui/             # shadcn/ui components
├── lib/utils.js              # Utility functions
└── .env.local               # Environment variables
```

## Google Scopes Requested

- `openid email profile` - Basic user information
- `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail emails

## Development Roadmap

### Phase 1: Foundation ✅

- [x] Next.js setup with Tailwind CSS
- [x] shadcn/ui component system
- [x] Google OAuth authentication
- [x] User session management
- [x] Protected dashboard

### Phase 2: Email Integration (Next)

- [ ] Gmail API integration
- [ ] Email fetching and display
- [ ] MongoDB integration
- [ ] Email filtering and search

### Phase 3: Data Processing

- [ ] Bank email detection algorithms
- [ ] Transaction data extraction
- [ ] Data storage and management

### Phase 4: Advanced Features

- [ ] Multiple email provider support
- [ ] Background sync jobs
- [ ] Analytics dashboard
- [ ] AI-powered insights

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

Required environment variables in `.env.local`:

```bash
GOOGLE_CLIENT_ID=              # From Google Cloud Console
GOOGLE_CLIENT_SECRET=          # From Google Cloud Console
NEXTAUTH_URL=http://localhost:3000    # Your app URL
NEXTAUTH_SECRET=               # Random secret for JWT signing
```

## Security Notes

- Never commit `.env.local` to version control
- Use strong, random secrets for production
- Ensure HTTPS in production
- Regularly rotate OAuth secrets

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
