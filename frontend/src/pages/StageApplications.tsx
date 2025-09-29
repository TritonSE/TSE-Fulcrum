import { useParams } from "react-router-dom";

import StageApplicationsView from "../views/StageApplicationsView";

export default function StageApplications() {
  const { stageId } = useParams();
  return <StageApplicationsView stageId={Number.parseInt(stageId as string, 10)} />;
}
