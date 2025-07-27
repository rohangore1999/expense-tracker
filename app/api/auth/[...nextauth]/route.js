import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Export the auth configuration so it can be used in other API routes
export const authOptions = {
  // Define authentication providers - these are the services users can sign in with
  providers: [
    GoogleProvider({
      // Google OAuth credentials - these identify your app to Google
      clientId: process.env.GOOGLE_CLIENT_ID, // Your Google app ID
      clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Your Google app secret

      // Authorization configuration - defines what permissions your app requests
      authorization: {
        params: {
          // Scopes define what data your app can access from Google
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          // openid: Required for authentication
          // email: Access to user's email address
          // profile: Access to user's basic profile info (name, picture, etc.)
          // gmail.readonly: Permission to read user's Gmail (optional - remove if not needed)

          // Request offline access to get a refresh token
          access_type: "offline",
          // Force approval prompt to ensure we get a refresh token every time
          prompt: "consent",
        },
      },
    }),
  ],

  // Callbacks are functions that run at specific points during authentication
  callbacks: {
    // JWT callback - runs when a JWT token is created or updated
    async jwt({ token, account, user, trigger, session }) {
      // Initial sign-in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at * 1000, // Convert to milliseconds
          user,
        };
      }

      // Handle updates from client session
      if (trigger === "update" && session?.accessToken) {
        return {
          ...token,
          accessToken: session.accessToken,
          accessTokenExpires: Date.now() + 3600 * 1000, // Set new expiry to 1 hour from now
        };
      }

      // Return the previous token if the access token has not expired
      if (Date.now() < token.accessTokenExpires) {
        return token;
      }

      // If the access token has expired, try to refresh it
      try {
        // You would implement token refresh logic here if needed
        // For now, we'll just return the existing token
        return token;
      } catch (error) {
        console.error("Error refreshing access token", error);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },

    // Session callback - runs when a session is checked or created
    async session({ session, token }) {
      // Make the access and refresh tokens available in the session
      // This allows your frontend to access these tokens
      session.user = token.user;
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.error = token.error;
      return session;
    },

    // Redirect callback - controls where users are sent after authentication
    async redirect({ url, baseUrl }) {
      // If the URL is a relative path (starts with /), redirect to dashboard
      if (url.startsWith("/")) return `${baseUrl}/dashboard`;
      // If the URL is from the same origin as your app, redirect to dashboard
      else if (new URL(url).origin === baseUrl) return `${baseUrl}/dashboard`;
      // For external URLs, redirect to the base URL (home page)
      return baseUrl;
    },
  },

  // Custom pages configuration
  pages: {
    signIn: "/", // Use the home page (/) as the sign-in page instead of NextAuth's default
  },

  // Session configuration
  session: {
    strategy: "jwt", // Use JWT (JSON Web Tokens) for session management
    // This means session data is stored in a token rather than a database
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // JWT configuration
  jwt: {
    // A secret to use for key generation
    secret: process.env.NEXTAUTH_SECRET,
    // Set to true to use encryption
    encryption: true,
    // The maximum age of the NextAuth.js issued JWT in seconds
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

// Create the NextAuth handler - this is the main configuration object
const handler = NextAuth(authOptions);

// Export the handler for both GET and POST requests
// This is required for Next.js API routes
export { handler as GET, handler as POST };
