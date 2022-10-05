import { useParams } from "react-router-dom";

import ApplicationView from "../views/ApplicationView";

export default function ViewApplication() {
  const { applicationId } = useParams();
  return <ApplicationView id={applicationId || ""} />;
}
