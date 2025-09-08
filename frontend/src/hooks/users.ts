import { useEffect, useState } from "react";

import api, { User } from "../api";

/**
 * A hook that gets a list of all users, and a map of emails to users, to easily display
 * user's names in the UI
 */
export const useUsers = () => {
  const [users, setUsers] = useState<User[] | null>(null);
  const [emailsToUsers, setEmailsToUsers] = useState<Record<string, User>>({});

  useEffect(() => {
    api.getAllUsers().then((newUsers) => {
      setUsers(newUsers);
      setEmailsToUsers(
        newUsers.reduce(
          (prev, cur) => ({
            ...prev,
            [cur.email]: cur,
          }),
          {}
        )
      );
    });
  }, []);

  return { users, emailsToUsers };
};
