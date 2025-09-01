import { Button } from "@tritonse/tse-constellation";
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { twMerge } from "tailwind-merge";

import api, { Pipeline, Stage } from "../api";
import { GlobalContext } from "../context/GlobalContext";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();

  return (
    <Link
      className={twMerge(
        "tw:!text-cream-primary tw:!no-underline tw:px-2 tw:py-1 tw:hover:!bg-white/10 tw:rounded-md",
        location.pathname === to ? "tw:!bg-white/10" : ""
      )}
      to={to}
    >
      {children}
    </Link>
  );
}

function Navbar() {
  const { user, setUser } = useContext(GlobalContext);
  const userInitials = useMemo(
    () =>
      user?.name
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase())
        .join(""),
    [user?.name]
  );

  const navigate = useNavigate();

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

  const onLogOut = () => {
    api.logOut().then(() => {
      setUser(null);
      navigate("/login");
    });
  };

  return (
    <nav className="tw:bg-teal-primary tw:h-full tw:min-w-64 tw:flex tw:flex-col tw:gap-5 tw:px-6 tw:pt-5 tw:pb-10 tw:text-cream-primary">
      {/* Logo */}
      <Link
        className="tw:flex tw:gap-3 tw:items-center tw:justify-center tw:!no-underline tw:!text-cream-primary"
        to="/"
      >
        <img src="/logo.svg" alt="Logo" className="tw:h-12 tw:w-4" />
        <h1 className="tw:!text-xl tw:font-bold tw:uppercase tw:!m-0">Fulcrum</h1>
      </Link>

      {/* Navigation links by pipeline and stage */}
      {user?.isAdmin && (
        <div className="tw:flex-1 tw:flex tw:flex-col tw:!text-sm tw:font-light">
          <NavLink to="/reviews">
            <span className="tw:uppercase">All Applicants</span>
          </NavLink>
          {pipelines.map((pipeline) => (
            <div key={pipeline.identifier} className="tw:flex tw:flex-col">
              {/* Separator */}
              <div className="tw:w-[90%] tw:h-[1px] tw:bg-cream-primary/30 tw:mx-auto tw:my-3" />
              <h2 className="tw:text-cream-primary tw:!text-sm tw:font-bold tw:uppercase tw:!m-0 tw:px-2 tw:py-1">
                {pipeline.name}
              </h2>
              <div className="tw:flex tw:flex-col tw:gap-1 tw:ml-2">
                {stagesByPipeline[pipeline.name]?.map((stage) => (
                  <NavLink key={stage.id} to={`/stage/${stage.id}/applications`}>
                    {stage.name}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile */}
      <div className="tw:flex tw:flex-col tw:items-center tw:gap-3 tw:mt-auto">
        <div className="tw:rounded-4xl tw:border-2 tw:border-cream-primary tw:p-3 tw:aspect-square tw:flex tw:items-center tw:justify-center">
          <span className="tw:font-bold">{userInitials}</span>
        </div>
        <div className="tw:flex tw:flex-col tw:items-center tw:text-center">
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
