import { useEffect, useState } from "react";
import { Table } from "react-bootstrap";

import api, { User } from "../api";
import { useAlerts } from "../hooks/alerts";

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const { alerts, addAlert } = useAlerts();

  useEffect(() => {
    api.getAllUsers().then(setUsers).catch(addAlert);
  }, []);

  return (
    <>
      <Table striped bordered>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.email}>
              <td>{user.email}</td>
              <td>{user.name}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      {alerts}
    </>
  );
}
