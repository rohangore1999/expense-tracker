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

// Function to parse transaction data from email snippets
export const parseTransactionFromEmail = (message) => {
  // Updated regex patterns for different transaction types
  const upiDebitRegex =
    /Rs\.([\d,]+\.\d+)\s+has been debited from account (\d+) to VPA ([^\s]+)\s+([^on]+?)\s+on\s+(\d{2}-\d{2}-\d{2}).*?(?:reference number is|transaction reference number is) (\d+)/i;
  const upiCreditRegex =
    /Rs\.([\d,]+\.\d+)\s+has been credited to your account (\d+) from VPA ([^\s]+)\s+([^on]+?)\s+on\s+(\d{2}-\d{2}-\d{2}).*?(?:reference number is|transaction reference number is) (\d+)/i;
  const cardDebitRegex =
    /Rs\.([\d,]+\.\d+)\s+has been debited from your account (\d+) for card transaction at\s+([^on]+?)\s+on\s+(\d{2}-\d{2}-\d{2}).*?(?:reference number is|transaction reference number is) (\d+)/i;

  let match;
  let transaction = null;

  // Try to match UPI debit pattern
  match = message.snippet.match(upiDebitRegex);
  if (match) {
    transaction = {
      amount: `Rs. ${match[1]}`,
      type: "UPI Debit",
      accountNumber: match[2],
      vpaId: match[3],
      merchant: match[4].trim(),
      date: match[5],
      reference: match[6],
    };
  }

  // Try to match UPI credit pattern
  if (!transaction) {
    match = message.snippet.match(upiCreditRegex);
    if (match) {
      transaction = {
        amount: `Rs. ${match[1]}`,
        type: "UPI Credit",
        accountNumber: match[2],
        vpaId: match[3],
        merchant: match[4].trim(),
        date: match[5],
        reference: match[6],
      };
    }
  }

  // Try to match card debit pattern
  if (!transaction) {
    match = message.snippet.match(cardDebitRegex);
    if (match) {
      transaction = {
        amount: `Rs. ${match[1]}`,
        type: "Card Debit",
        accountNumber: match[2],
        merchant: match[3].trim(),
        date: match[4],
        reference: match[5],
      };
    }
  }

  // If a transaction was found, add an ID

  if (transaction) {
    transaction.id = message.id;
  }

  return transaction;
};

// Function to parse multiple transactions from email messages
export const parseTransactionsFromEmails = (messages) => {
  if (!messages || !Array.isArray(messages)) return [];

  return messages
    .filter((message) => !shouldFilterOutMessage(message))
    .map((message, index) => {
      // If not a recognized transaction format, try the generic parser
      const genericTransaction = extractGenericTransactionDetails(message);
      if (genericTransaction) {
        return genericTransaction;
      }

      // If not a recognized transaction format, still include the message
      return {
        id: message?.id,
        snippet: message.snippet,
        date: message.internalDate
          ? new Date(parseInt(message.internalDate)).toLocaleDateString()
          : "Unknown",
        raw: message,
      };
    });
};

// Function to determine if a message should be filtered out
export const shouldFilterOutMessage = (message) => {
  if (!message || !message.snippet) return false;

  const snippet = message.snippet.toLowerCase();

  // Filter patterns
  const filterPatterns = [
    /^otp is /i,
    /dear customer, greetings from hdfc bank!/i,
    /one time password/i,
    /verification code/i,
    /security code/i,
  ];

  // Check if any pattern matches
  return filterPatterns.some((pattern) => pattern.test(snippet));
};

// Generic function to extract transaction details from various email formats
export const extractGenericTransactionDetails = (message) => {
  if (!message || !message.snippet) return null;

  // First check if this is a message we want to filter out
  if (shouldFilterOutMessage(message)) {
    return null;
  }

  const snippet = message.snippet;
  let transaction = {
    id: message.id,
    type: "Unknown Transaction",
  };

  // Extract amount - look for Rs or INR followed by digits
  const amountMatch = snippet.match(/(?:Rs\.?|Rs|INR)\s*([\d,]+\.?\d*)/i);
  if (amountMatch) {
    transaction.amount = `Rs. ${amountMatch[1]}`;
  }

  // Extract account number - common patterns
  const accountMatch =
    snippet.match(
      /(?:account|a\/c|ac)\s*(?:no\.?|number|#)?\s*(?:[Xx*]+)?(\d+)/i
    ) || snippet.match(/(?:from|to)\s*(?:account|a\/c)?\s*(?:[Xx*]+)?(\d+)/i);
  if (accountMatch) {
    transaction.accountNumber = accountMatch[1];
  }

  // Extract date - look for common date formats
  const dateMatch =
    snippet.match(/(?:on|dated)\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i) ||
    snippet.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
  if (dateMatch) {
    transaction.date = dateMatch[1];
  }

  // Extract reference number
  const refMatch =
    snippet.match(
      /(?:ref(?:erence)?|txn|transaction).{1,15}?(?:no|num|number|id).{0,10}?(\d+)/i
    ) ||
    snippet.match(
      /(?:ref(?:erence)?|txn|transaction).{0,5}?(?:#|:).{0,5}?(\d+)/i
    );
  if (refMatch) {
    transaction.reference = refMatch[1];
  }

  // Determine transaction type
  if (snippet.match(/debited|paid|sent|withdrawn|purchase|spent/i)) {
    transaction.type = "Debit";
  } else if (snippet.match(/credited|received|added|deposited/i)) {
    transaction.type = "Credit";
  }

  // Extract merchant/recipient information
  // Look for common patterns like "to VPA", "at", "to merchant", etc.
  const merchantMatch =
    snippet.match(
      /(?:to|at)\s+(?:VPA\s+)?([^\s]+@[^\s]+)\s+([^\.on]{5,}?)(?:\s+on|\.|$)/i
    ) || // VPA format with name
    snippet.match(/(?:to|at)\s+(?:VPA\s+)?([^\s]+@[^\s]+)/i) || // Just VPA
    snippet.match(/(?:to|at)\s+([A-Z\s]{5,})/i) || // Merchant name in caps
    snippet.match(/(?:to|at)\s+([^\.]{5,}?)(?:\s+on|\.|$)/i); // General pattern

  if (merchantMatch) {
    // If we have a VPA with name format (like "VPA example@upi NAME SURNAME")
    if (merchantMatch.length > 2 && merchantMatch[2]) {
      transaction.vpaId = merchantMatch[1];
      transaction.merchant = merchantMatch[2].trim();
    } else {
      transaction.merchant = merchantMatch[1].trim();
    }
  }

  // Extract VPA if not already extracted
  if (!transaction.vpaId) {
    const vpaMatch = snippet.match(/(?:VPA|UPI\s+ID)\s+([^\s]+@[^\s]+)/i);
    if (vpaMatch) {
      transaction.vpaId = vpaMatch[1];
    }
  }

  // Handle specific HDFC Bank UPI format (like the example provided)
  const hdfcUpiMatch = snippet.match(
    /debited from account (\d+) to VPA ([^\s]+) ([^on]+) on (\d{2}-\d{2}-\d{2}).*?(?:reference number is|transaction reference number is) (\d+)/i
  );
  if (hdfcUpiMatch) {
    transaction.type = "UPI Debit";
    transaction.accountNumber = hdfcUpiMatch[1];
    transaction.vpaId = hdfcUpiMatch[2];
    transaction.merchant = hdfcUpiMatch[3].trim();
    transaction.date = hdfcUpiMatch[4];
    transaction.reference = hdfcUpiMatch[5];
  }

  // Only return if we have at least amount and either date or reference
  if (transaction.amount && (transaction.date || transaction.reference)) {
    return transaction;
  }

  return null;
};
