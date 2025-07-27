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
const shouldFilterOutMessage = (message) => {
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
const extractGenericTransactionDetails = (message) => {
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
