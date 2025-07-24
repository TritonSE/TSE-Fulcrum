import { useEffect, useState } from "react";
import { Table } from "react-bootstrap";

import api, { Pipeline } from "../api";
import { useAlerts } from "../hooks";

export default function Pipelines() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const { alerts, addAlert } = useAlerts();

  useEffect(() => {
    api.getAllPipelines().then(setPipelines).catch(addAlert);
  }, []);

  return (
    <>
      <Table striped bordered>
        <thead>
          <tr>
            <th>Name</th>
            <th>External Identifier</th>
          </tr>
        </thead>
        <tbody>
          {pipelines.map((pipeline) => (
            <tr key={pipeline.identifier}>
              <td>{pipeline.name}</td>
              <td>{pipeline.identifier}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      {alerts}
    </>
  );
}
