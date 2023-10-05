import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import api, { Application } from "../api";
import { useAlerts, useStateHelper } from "../hooks";
import { formatQuarter } from "../util";

function row(label: unknown, value: unknown) {
  return (
    <tr>
      <td>
        <strong>{label + ""}</strong>
      </td>
      <td>{value + ""}</td>
    </tr>
  );
}

export default function ApplicationView({ id }: { id: string }) {
  const [application, setApplication] = useStateHelper<Application>();
  const { alerts, addAlert } = useAlerts();
  const location = useLocation();

  useEffect(() => {
    api
      .getApplicationById(id)
      .then((app) => {
        setApplication(app);
        document.title = app.name;
      })
      .catch(addAlert);
  }, []);

  const prompts = {
    about_me: application?.aboutPrompt,
    why_tse: application?.interestPrompt,
    ...application?.rolePrompts,
  };

  return (
    <div>
      <table>
        <tbody>
          {row("ID", application?._id)}
          {row("Name", application?.name)}
          {row("Pronouns", application?.pronouns)}
          {row("Email", application?.email)}
          {row("Phone", application?.phone)}
          {row("Year applied", application?.yearApplied)}
          {row("Started", formatQuarter(application?.startQuarter || 0))}
          {row("Graduating", formatQuarter(application?.gradQuarter || 0))}
          {row("Major", `${application?.major} (${application?.majorDept})`)}
          {row("Previously in TEST?", application?.prevTest)}
        </tbody>
      </table>
      <a href={application?.resumeUrl} target="_blank" rel="noreferrer noopener">
        View resume
      </a>
      <br />
      <a
        href={location.pathname.replace("edit", "interview")}
        target="_blank"
        rel="noreferrer noopener"
      >
        Technical interview
      </a>
      <br />
      <strong>Prompts</strong>
      {Object.entries(prompts).map(([key, response]) => (
        <details open key={key}>
          <summary>
            <strong>{key}</strong>
          </summary>
          <div style={{ whiteSpace: "pre-line" }}>{response}</div>
        </details>
      ))}
      {alerts}
    </div>
  );
}
