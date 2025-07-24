const pipelineIdentifiers = ["designer", "test_designer", "developer", "test_developer"] as const;

type PipelineIdentifier = (typeof pipelineIdentifiers)[number];

type Pipeline = {
  // Each submitted application uses pipeline identifiers to indicate
  // which roles the applicant is applying to.
  identifier: PipelineIdentifier;
  name: string;
};

const pipelines: Pipeline[] = [
  {
    name: "Designer",
    identifier: "designer",
  },
  {
    name: "TEST Designer",
    identifier: "test_designer",
  },
  {
    name: "Developer",
    identifier: "developer",
  },
  {
    name: "TEST Developer",
    identifier: "test_developer",
  },
];

export { pipelineIdentifiers, Pipeline, PipelineIdentifier, pipelines };
