import { Button } from "@tritonse/tse-constellation";
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { Pipeline, Stage } from "../api";
import { GlobalContext } from "../context/GlobalContext";

function Navbar() {
  const { user, setUser } = useContext(GlobalContext);
  const navigate = useNavigate();
  const userInitials = useMemo(
    () =>
      user?.name
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase())
        .join(""),
    [user?.name]
  );

  const onLogOut = () => {
    api.logOut().then(() => {
      setUser(null);
      navigate("/login");
    });
  };

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  // map pipeline identifier to stages
  const [stagesByPipeline, setStagesByPipeline] = useState<Record<string, Stage[]>>({});

  useEffect(() => {
    api.getAllPipelines().then(async (data) => {
      const stagePromises = data.map((pipeline) =>
        api.getStagesByPipeline(pipeline.identifier).then((stages) => ({
          identifier: pipeline.identifier,
          stages,
        }))
      );

      const stageResults = await Promise.all(stagePromises);

      // Map stages by pipeline identifier
      const stagesMap = stageResults.reduce((acc, { identifier, stages }) => {
        acc[identifier] = stages;
        return acc;
      }, {} as Record<string, Stage[]>);

      setPipelines(data);
      setStagesByPipeline(stagesMap);
    });
  }, []);

  return (
    <nav className="tw:bg-teal-primary tw:h-full tw:w-64 tw:flex tw:flex-col tw:items-center tw:px-10 tw:py-5 tw:text-cream-primary">
      {/* Logo */}
      <Link className="tw:flex tw:gap-3 tw:items-center tw:justify-center tw:!no-underline" to="/">
        <img src="/logo.svg" alt="Logo" className="tw:h-12 tw:w-4" />
        <h1 className="tw:text-cream-primary tw:!text-xl tw:font-bold tw:uppercase tw:!m-0">
          Fulcrum
        </h1>
      </Link>

      {/* Navigation links by pipeline and stage */}
      <div className="tw:flex-1 tw:flex tw:flex-col">
        {pipelines.map((pipeline) => (
          <div key={pipeline.identifier} className="tw-mb-4">
            <h2 className="tw-text-cream-primary tw:!text-lg tw:font-bold tw:uppercase tw:!m-0">
              {pipeline.name}
            </h2>
            <div className="tw-ml-4">
              {stagesByPipeline[pipeline.identifier]?.map((stage) => (
                <div key={stage.id} className="tw-mb-2">
                  <Link
                    className="tw:text-cream-primary tw:!no-underline"
                    to={`/stages/${stage.id}`}
                  >
                    {stage.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Profile */}
      <div className="tw:flex tw:flex-col tw:items-center tw:gap-3">
        <div className="tw:rounded-4xl tw:border-2 tw:border-cream-primary tw:p-3 tw:aspect-square tw:flex tw:items-center tw:justify-center">
          <span className="tw:font-bold">{userInitials}</span>
        </div>
        <div className="tw:flex tw:flex-col tw:items-center">
          <h3 className="tw:text-cream-primary tw:!text-2xl tw:!m-0 tw:font-bold">{user?.name}</h3>
          <p className="tw:text-xs tw:!m-0 tw:font-regular">{user?.email}</p>
        </div>
        <Button
          onClick={onLogOut}
          className="tw:!bg-cream-primary tw:!text-teal-primary tw:!px-3 tw:!py-1"
        >
          Log Out
        </Button>
      </div>
    </nav>
  );
}

export default Navbar;
