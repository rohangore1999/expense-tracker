import React, { useState } from "react";
import { signOut, useSession } from "next-auth/react";

// Components
import { Button } from "@/components/ui/button";

// Hooks
import { buildGmailQuery, useGmailMessages } from "@/hooks/useGmailApi";

// Utils
import { parseTransactionsFromEmails } from "@/utils/gmail";

const MainContent = () => {
  const { data: session } = useSession();
  const [queryParams, setQueryParams] = useState({
    from: "alerts@hdfcbank.net",
    subject: [
      "You have done a UPI txn. Check details",
      "View: Account update for your HDFC Bank A/c",
    ],
    after: "2025/07/01",
    maxResults: "10",
  });

  // Build the query string
  const query = buildGmailQuery(queryParams);
  console.log(query);

  const { data: messages, isLoading, error, refetch } = useGmailMessages(query);

  // Parse transactions from messages
  const items = messages ? parseTransactionsFromEmails(messages) : [];

  console.log({ messages, items });

  return (
    <div className="p-4 space-y-6">
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => refetch()}>
          Refresh Data
        </Button>
        <Button
          variant="destructive"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign Out
        </Button>
      </div>

      {isLoading && <div className="text-center">Loading messages...</div>}

      {error && (
        <div className="text-red-500 p-4 border border-red-300 rounded-md">
          Error: {error.message}
        </div>
      )}

      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Merchant/Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VPA ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {item.amount || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span>{item.type || "Raw Message"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.accountNumber || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.merchant ||
                      (item.snippet
                        ? item.snippet.substring(0, 50) + "..."
                        : "-")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.vpaId || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !isLoading && <div className="text-center">No messages found</div>
      )}
    </div>
  );
};

export default MainContent;
