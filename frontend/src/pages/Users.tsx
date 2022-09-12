import { useEffect, useState } from "react";
import api, { User } from "../api";
import { useAlerts } from "../hooks";

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const { alerts, addAlert } = useAlerts();

  useEffect(() => {
    api.getAllUsers().then(setUsers).catch(addAlert);
  }, []);

  return (
    <div>
      {users.map((user, i: number) => (
        <p key={i}>
          email: {user.email}, name: {user.name}
        </p>
      ))}
      {alerts}
    </div>
  );
}