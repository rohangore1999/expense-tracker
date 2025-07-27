import { useQuery } from "@tanstack/react-query";
import { useSession, signOut } from "next-auth/react";

const BASE_URL = "https://gmail.googleapis.com/gmail/v1";

// Function to refresh the access token using the refresh token
const refreshAccessToken = async (refreshToken) => {
  try {
    // Create a new endpoint in your API to handle token refresh
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to refresh token");
    }

    return data.accessToken;
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw error;
  }
};

const getFullMail = async (messageIds, token) => {
  const fullMail = [];
  for (const messageId of messageIds) {
    const url = `${BASE_URL}/users/me/messages/${messageId}?format=full`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    fullMail.push(data);
  }
  return fullMail;
};

// Function to fetch Gmail messages via our API route
const fetchGmailMessages = async ({
  query,
  token,
  refreshToken,
  updateSession,
}) => {
  const url = `${BASE_URL}/users/me/messages?${query}`;

  let currentToken = token;

  const makeRequest = async (token) => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const fullMail = await getFullMail(
        data.messages.map((message) => message.id),
        token
      );

      return fullMail;
    }

    if (response.status === 401) {
      // Token expired
      if (refreshToken) {
        // Try to refresh if we have a refresh token
        console.log("Token expired, attempting to refresh...");
        try {
          const newToken = await refreshAccessToken(refreshToken);
          // Update the session with the new token
          if (updateSession) {
            await updateSession(newToken);
            currentToken = newToken;
          }
          // Retry the request with the new token
          return makeRequest(newToken);
        } catch (refreshError) {
          console.error("Failed to refresh token:", refreshError);
          // If refresh fails, sign out the user
          signOut({ callbackUrl: "/" });
          const errorData = await response.json();
          throw new Error(errorData.error || `API error: ${response.status}`);
        }
      } else {
        // No refresh token available, sign out the user
        console.error(
          "No refresh token available. Please sign out and sign in again."
        );
        signOut({ callbackUrl: "/" });
        const errorData = await response.json();
        throw new Error("Authentication token expired. Please sign in again.");
      }
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
  };

  return makeRequest(currentToken);
};

// Hook for fetching Gmail messages
export const useGmailMessages = (query) => {
  const { data: session, status, update } = useSession();

  console.log({ session });

  return useQuery({
    queryKey: ["gmail-messages", query],
    queryFn: () =>
      fetchGmailMessages({
        query,
        token: session?.accessToken,
        refreshToken: session?.refreshToken,
        updateSession: async (newToken) => {
          // Properly update the session using NextAuth's update method
          await update({
            accessToken: newToken,
          });
        },
      }),
  });
};

// Helper function to build Gmail query
export const buildGmailQuery = (params = {}) => {
  let queryString = "";
  const searchTerms = [];

  // Encode individual parts but keep the + separators as literal + characters
  if (params.from)
    searchTerms.push(
      `from:${encodeURIComponent(params.from).replace(/%40/g, "@")}`
    );

  // Handle subject as an array or string
  if (params.subject) {
    if (Array.isArray(params.subject)) {
      // If it's an array, combine with OR operators
      if (params.subject.length > 0) {
        const subjectTerms = params.subject.map(
          (sub) => `subject:${encodeURIComponent(`"${sub}"`)}`
        );
        searchTerms.push(`(${subjectTerms.join(" OR ")})`);
      }
    } else {
      // Handle as a single string (backward compatibility)
      searchTerms.push(`subject:${encodeURIComponent(params.subject)}`);
    }
  }

  if (params.after)
    searchTerms.push(
      `after:${encodeURIComponent(params.after).replace(/%2F/g, "/")}`
    );
  if (params.before)
    searchTerms.push(
      `before:${encodeURIComponent(params.before).replace(/%2F/g, "/")}`
    );

  // Join search terms with literal + characters
  if (searchTerms.length > 0) {
    queryString = `q=${searchTerms.join("+")}`;
  }

  // Add maxResults separately
  if (params.maxResults) {
    queryString += queryString
      ? `&maxResults=${params.maxResults}`
      : `maxResults=${params.maxResults}`;
  }

  return queryString;
};

