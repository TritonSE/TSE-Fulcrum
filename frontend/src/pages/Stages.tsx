import { useEffect, useState } from "react";
import { Table } from "react-bootstrap";

import api, { Stage } from "../api";
import { useAlerts } from "../hooks";

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
            <th>Reviewers</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage) => (
            <tr key={stage._id}>
              <td>
                <a href={`/stage/${stage._id}/applications`}>{stage.name}</a>
              </td>
              <td>{stage.reviewerEmails.join(" ")}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      {alerts}
    </>
  );
}
