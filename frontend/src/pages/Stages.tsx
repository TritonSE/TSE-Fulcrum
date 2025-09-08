import { useEffect, useState } from "react";
import { Table } from "react-bootstrap";
import { Link } from "react-router-dom";

import api, { Stage } from "../api";
import { useAlerts } from "../hooks/alerts";

export default function Stages() {
  const [stages, setStages] = useState<Stage[]>([]);
  const { alerts, addAlert } = useAlerts();

  useEffect(() => {
    api.getAllStages().then(setStages).catch(addAlert);
  }, []);

  return (
    <>
      <Table striped bordered>
        <thead>
          <tr>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage) => (
            <tr key={stage.id}>
              <td>
                <Link to={`/stage/${stage.id}/applications`}>{stage.name}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {alerts}
    </>
  );
}
