import { Button } from "@tritonse/tse-constellation";
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { twMerge } from "tailwind-merge";

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
  // map pipeline name to stages
  const [stagesByPipeline, setStagesByPipeline] = useState<Record<string, Stage[]>>({});

  useEffect(() => {
    api.getAllPipelines().then(async (data) => {
      const stagePromises = data.map((pipeline) =>
        api.getStagesByPipeline(pipeline.identifier).then((stages) => ({
          pipeline: pipeline.name,
          stages,
        }))
      );

      const stageResults = await Promise.all(stagePromises);

      // Map stages by pipeline name
      const stagesMap = stageResults.reduce((acc, { pipeline, stages }) => {
        acc[pipeline] = stages.map((stage) => ({
          ...stage,
          // Remove the pipeline name from the stage name to reduce repetition
          name: stage.name.slice(stage.name.indexOf(pipeline) + pipeline.length + 1),
        }));
        return acc;
      }, {} as Record<string, Stage[]>);

      setPipelines(data.sort((a, b) => a.name.localeCompare(b.name)));
      setStagesByPipeline(stagesMap);
    });
  }, []);

  return (
    <nav className="tw:bg-teal-primary tw:h-full tw:min-w-64 tw:flex tw:flex-col tw:gap-5 tw:px-6 tw:py-5 tw:text-cream-primary">
      {/* Logo */}
      <Link className="tw:flex tw:gap-3 tw:items-center tw:justify-center tw:!no-underline" to="/">
        <img src="/logo.svg" alt="Logo" className="tw:h-12 tw:w-4" />
        <h1 className="tw:text-cream-primary tw:!text-xl tw:font-bold tw:uppercase tw:!m-0">
          Fulcrum
        </h1>
      </Link>

      {/* Navigation links by pipeline and stage */}
      <div className="tw:flex-1 tw:flex tw:flex-col tw:!text-sm tw:font-light">
        {pipelines.map((pipeline, i) => (
          <>
            <div key={pipeline.identifier} className="tw:py-2 tw:flex tw:flex-col tw:gap-1">
              <h2 className="tw:text-cream-primary tw:!text-sm tw:font-bold tw:uppercase tw:!m-0 tw:px-2 tw:py-1">
                {pipeline.name}
              </h2>
              <div className="tw:flex tw:flex-col tw:gap-1 tw:ml-2">
                {stagesByPipeline[pipeline.name]?.map((stage) => (
                  <Link
                    key={stage.id}
                    className={twMerge(
                      "tw:!text-cream-primary tw:!no-underline tw:px-2 tw:py-1 tw:hover:!bg-white/10 tw:rounded"
                    )}
                    to={`/stages/${stage.id}`}
                  >
                    {stage.name}
                  </Link>
                ))}
              </div>
            </div>
            {/* Separator */}
            {i !== pipelines.length - 1 && (
              <div className="tw:w-[90%] tw:h-[1px] tw:bg-cream-primary/30 tw:mx-auto" />
            )}
          </>
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
