import { PipelineIdentifier } from "./pipelines";

const stageIdentifiers = [
  "designer_resume_review",
  "designer_phone_screen",
  "designer_technical",
  "developer_resume_review",
  "developer_phone_screen",
  "developer_technical",
  "test_designer_resume_review",
  "test_designer_phone_screen",
  "test_designer_technical",
  "test_developer_resume_review",
  "test_developer_technical",
] as const;

type StageIdentifier = (typeof stageIdentifiers)[number];

type FormField = {
  type: "string" | "number";
  choices: unknown[];
  allowOther: boolean;
  label: string;
  description: string;
  rubricLink?: string;
  weight?: number;
};

type Stage = {
  id: number;
  identifier: StageIdentifier;
  pipelineIdentifier: PipelineIdentifier;
  pipelineIndex: number;
  numReviews: number;
  name: string;
  fields: Record<string, FormField>;
  fieldOrder: string[];
  autoAssignReviewers: boolean;
  notifyReviewersWhenAssigned: boolean;
  hasTechnicalInterview: boolean;
};

const stages: Stage[] = [
  {
    id: 1,
    identifier: "test_designer_technical",
    pipelineIdentifier: "test_designer",
    pipelineIndex: 1,
    numReviews: 2,
    name: "TEST Designer Technical Interview",
    fields: {
      combined_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Score (out of 5)",
        description: "",
      },
    },
    fieldOrder: ["combined_score"],
    autoAssignReviewers: true,
    notifyReviewersWhenAssigned: false,
    hasTechnicalInterview: false,
  },
  {
    id: 2,
    identifier: "test_developer_technical",
    pipelineIdentifier: "test_developer",
    pipelineIndex: 1,
    numReviews: 1,
    name: "TEST Developer Technical Interview",
    fields: {
      behavioral_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Behavioral score",
        description: "",
      },
      technical_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Technical score",
        description: "",
      },
    },
    fieldOrder: ["behavioral_score", "technical_score"],
    autoAssignReviewers: true,
    notifyReviewersWhenAssigned: false,
    hasTechnicalInterview: false,
  },
  {
    id: 3,
    identifier: "test_developer_resume_review",
    pipelineIdentifier: "test_developer",
    pipelineIndex: 0,
    numReviews: 2,
    name: "TEST Developer Resume Review",
    fields: {
      score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Score",
        description: "",
      },
    },
    fieldOrder: ["score"],
    autoAssignReviewers: true,
    notifyReviewersWhenAssigned: true,
    hasTechnicalInterview: false,
  },
  {
    id: 4,
    identifier: "designer_phone_screen",
    pipelineIdentifier: "designer",
    pipelineIndex: 1,
    numReviews: 1,
    name: "Designer Phone Screen",
    fields: {
      general_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "General score",
        description: "",
        weight: 0.4,
      },
      grade_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Grade score",
        description: "",
        weight: 0.6,
      },
      notes: {
        type: "string",
        choices: [],
        allowOther: true,
        label: "Notes",
        description: "",
      },
    },
    fieldOrder: ["general_score", "grade_score", "notes"],
    autoAssignReviewers: true,
    notifyReviewersWhenAssigned: false,
    hasTechnicalInterview: false,
  },
  {
    id: 5,
    identifier: "developer_resume_review",
    pipelineIdentifier: "developer",
    pipelineIndex: 0,
    numReviews: 2,
    name: "Developer Resume Review",
    fields: {
      resume_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Resume score",
        description: "Out of 5",
        rubricLink:
          "https://docs.google.com/document/d/1EsdDrFu9F7G0K_-Jvawhh4A58s5w2vJFBvHo9_7Zmz0/edit?usp=sharing",
      },
      blurb_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Blurb score",
        description: "Out of 4",
      },
    },
    fieldOrder: ["resume_score", "blurb_score"],
    autoAssignReviewers: true,
    notifyReviewersWhenAssigned: true,
    hasTechnicalInterview: false,
  },
  {
    id: 6,
    identifier: "designer_technical",
    pipelineIdentifier: "designer",
    pipelineIndex: 2,
    numReviews: 1,
    name: "Designer Technical Interview",
    fields: {},
    fieldOrder: [],
    autoAssignReviewers: true,
    notifyReviewersWhenAssigned: false,
    hasTechnicalInterview: false,
  },
  {
    id: 7,
    identifier: "designer_resume_review",
    pipelineIdentifier: "designer",
    pipelineIndex: 0,
    numReviews: 2,
    name: "Designer Resume Review",
    fields: {
      resume_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Resume score",
        description: "Out of 23 points",
        rubricLink:
          "https://docs.google.com/spreadsheets/d/18hrzhhFH_9faubB8Ya079sdByf8fSqsOinyvNEnjoBc/edit",
      },
      blurb_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Blurb score",
        description: "Out of 4 points",
        rubricLink:
          "https://docs.google.com/document/d/1iUqwXcOAhgaOWGWmbeg5GlxdXxZS2UYAlnCclNZWg1E/edit",
      },
    },
    fieldOrder: ["resume_score", "blurb_score"],
    autoAssignReviewers: true,
    notifyReviewersWhenAssigned: true,
    hasTechnicalInterview: false,
  },
  {
    id: 8,
    identifier: "developer_technical",
    pipelineIdentifier: "developer",
    pipelineIndex: 2,
    numReviews: 1,
    name: "Developer Technical Interview",
    fields: {
      grade_level: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Which question did you use?",
        description: "Enter 1 for the first-year question, 2 for the sophomore question",
      },
      behavioral_rating: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Behavioral rating",
        description:
          "1 for bad, 2 for okay, 3 for great (see Appendix I of the technical interview guide)",
      },
      behavioral_notes: {
        type: "string",
        choices: [],
        allowOther: true,
        label: "Behavioral notes",
        description: "",
      },
      communication_rating: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Communication rating",
        description:
          "1 for bad, 2 for okay, 3 for great (see Appendix I of the technical interview guide)",
      },
      communication_notes: {
        type: "string",
        choices: [],
        allowOther: true,
        label: "Communication notes",
        description: "",
      },
      code_quality_rating: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Code quality rating",
        description:
          "1 for bad, 2 for okay, 3 for great (see Appendix I of the technical interview guide)",
      },
      code_quality_notes: {
        type: "string",
        choices: [],
        allowOther: true,
        label: "Code quality notes",
        description: "",
      },
      additional_notes: {
        type: "string",
        choices: [],
        allowOther: true,
        label: "Additional notes about the candidate",
        description: "",
      },
      programming_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Programming score",
        description: "Add up the points for the programming tasks",
      },
      doc_link: {
        type: "string",
        choices: [],
        allowOther: true,
        label: "Link to your copy of the technical interview Google Doc",
        description: "",
      },
    },
    fieldOrder: [
      "grade_level",
      "behavioral_rating",
      "behavioral_notes",
      "communication_rating",
      "communication_notes",
      "code_quality_rating",
      "code_quality_notes",
      "additional_notes",
      "programming_score",
      "doc_link",
    ],
    autoAssignReviewers: true,
    notifyReviewersWhenAssigned: false,
    hasTechnicalInterview: true,
  },
  {
    id: 9,
    identifier: "test_designer_resume_review",
    pipelineIdentifier: "test_designer",
    pipelineIndex: 0,
    numReviews: 2,
    name: "TEST Designer Resume Review",
    fields: {
      combined_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Score",
        description: "",
      },
    },
    fieldOrder: ["combined_score"],
    autoAssignReviewers: true,
    notifyReviewersWhenAssigned: true,
    hasTechnicalInterview: false,
  },
  {
    id: 10,
    identifier: "developer_phone_screen",
    pipelineIdentifier: "developer",
    pipelineIndex: 1,
    numReviews: 1,
    name: "Developer Phone Screen",
    fields: {
      behavioral_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Behavioral score",
        description: "Out of 5",
        rubricLink:
          "https://docs.google.com/document/d/1wO6xyCrB50SVGYJGVvkOOaT1QHWLytm8y9HCvNI3qEI/edit?usp=sharing",
        weight: 2,
      },
      grade_level: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Which grade level of questions did you use?",
        description: "Enter 1 for first-year questions, 2 for sophomore/junior/senior questions",
      },
      conceptual_question: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Which conceptual question did you use?",
        description: "Enter 1 if you used the first question, or 2 if you used the second question",
      },
      conceptual_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Conceptual question score",
        description: "Out of 2",
      },
      testing_question: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Which testing question did you use?",
        description: "Enter 1 if you used the first question, or 2 if you used the second question",
      },
      testing_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Testing question score",
        description: "Out of 3",
      },
      problem_solving_question: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Which problem-solving question did you use?",
        description: "Enter 1 if you used the first question, or 2 if you used the second question",
      },
      problem_solving_score: {
        type: "number",
        choices: [],
        allowOther: true,
        label: "Problem-solving question score",
        description: "Out of 5",
      },
      notes: {
        type: "string",
        choices: [],
        allowOther: true,
        label: "Link to your copy of the phone screen Google Doc",
        description: "",
      },
    },
    fieldOrder: [
      "behavioral_score",
      "grade_level",
      "conceptual_question",
      "conceptual_score",
      "testing_question",
      "testing_score",
      "problem_solving_question",
      "problem_solving_score",
      "notes",
    ],
    autoAssignReviewers: true,
    notifyReviewersWhenAssigned: false,
    hasTechnicalInterview: false,
  },
];

export { stageIdentifiers, StageIdentifier, FormField, Stage, stages };
