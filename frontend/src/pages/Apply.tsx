import { LoadingSpinner } from "@tritonse/tse-constellation";
import { FileText, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";

import api from "../api";
import {
  AlertBanner,
  Button,
  Checkbox,
  FieldCol,
  FieldGroup,
  FieldLabel,
  FieldRow,
  FormBlock,
  FormSection,
  FormSectionLabel,
  HelpText,
  SelectField,
  SubmitButton,
  TextArea,
  TextInput,
} from "../components/ApplyFormFields";
import { useAlerts } from "../hooks/alerts";
import { countWords } from "../util";

import type { SubmitApplicationRequest } from "../api";
import type { ChangeEvent, FormEventHandler, WheelEventHandler } from "react";

if (!import.meta.env.VITE_APPLICATION_DEADLINE) {
  throw new Error("Missing VITE_APPLICATION_DEADLINE!");
}

if (!import.meta.env.VITE_APPLICATION_STARTDATE) {
  throw new Error("Missing VITE_APPLICATION_STARTDATE!");
}

const DEADLINE = new Date(import.meta.env.VITE_APPLICATION_DEADLINE);
const STARTDATE = new Date(import.meta.env.VITE_APPLICATION_STARTDATE);
const HEAR_ABOUT_TSE_OPTIONS = [
  "Word of mouth",
  "Tabling on Library Walk",
  "Engineers on the Green",
  "Flyers around campus",
  "Postings in class forums",
  "Presentation in lecture",
  "Instagram",
  "LinkedIn",
  "UCSD website",
  "Other",
];

const QUARTER_OPTIONS = [
  { value: "0", label: "Winter" },
  { value: "1", label: "Spring" },
  // Hide summer because people often select summer when they mean spring.
  // { value: "2", label: "Summer" },
  { value: "2", label: "Fall" },
];

const PREV_TEST_OPTIONS = [
  { value: "none", label: "I was not a part of the TEST program" },
  { value: "test_designer", label: "TEST Designer" },
  { value: "test_developer", label: "TEST Developer" },
];

const SHORT_ANSWER_MAX_WORDS = 150; // Maximum number of words for short answer questions

const ERROR_MESSAGES = {
  REQUIRED: "Please fill out this required field",
  REQUIRED_SELECTION: "Please select at least one option",
  INVALID_EMAIL: "Please enter a valid UCSD email address",
  NO_ROLE_SELECTED: "You must select at least one role to apply to",
  NO_RESUME: "Please upload your resume",
  OVER_WORD_LIMIT: `Your response exceeds the ${SHORT_ANSWER_MAX_WORDS} word limit`,
};

// Fields the application form reports errors for. Most map 1:1 to a personalInfo/prompts key;
// hearAboutTse, roles, and resume are reported at the group level rather than per-option.
type ApplicationField =
  | "name"
  | "pronouns"
  | "email"
  | "phone"
  | "startQuarter"
  | "startYear"
  | "gradQuarter"
  | "gradYear"
  | "majorDept"
  | "major"
  | "hearAboutTse"
  | "otherHearAboutTSE"
  | "roles"
  | "resume"
  | "about"
  | "interest"
  | "designer"
  | "developer"
  | "test_barriers"
  | "test_designer"
  | "test_developer";

type ApplicationErrors = Partial<Record<ApplicationField, string[]>>;

const applicationSchema = z
  .object({
    name: z.string().min(1, ERROR_MESSAGES.REQUIRED),
    pronouns: z.string().min(1, ERROR_MESSAGES.REQUIRED),
    email: z
      .string()
      .min(1, ERROR_MESSAGES.REQUIRED)
      .regex(/.+@ucsd\.edu$/, ERROR_MESSAGES.INVALID_EMAIL),
    phone: z.string().min(1, ERROR_MESSAGES.REQUIRED),
    startQuarter: z.string().min(1, ERROR_MESSAGES.REQUIRED),
    startYear: z.string().min(1, ERROR_MESSAGES.REQUIRED),
    gradQuarter: z.string().min(1, ERROR_MESSAGES.REQUIRED),
    gradYear: z.string().min(1, ERROR_MESSAGES.REQUIRED),
    majorDept: z.string().min(1, ERROR_MESSAGES.REQUIRED),
    major: z.string().min(1, ERROR_MESSAGES.REQUIRED),
    otherHearAboutTSE: z.string(),
    hasHearAboutTSESelection: z.boolean(),
    hasOtherHearAboutTSESelected: z.boolean(),
    hasResume: z.boolean(),
    roles: z.object({
      designer: z.boolean(),
      developer: z.boolean(),
      test_designer: z.boolean(),
      test_developer: z.boolean(),
    }),
    prompts: z.record(z.string(), z.string()),
  })
  .superRefine((data, ctx) => {
    if (!data.hasHearAboutTSESelection) {
      ctx.addIssue({
        code: "custom",
        path: ["hearAboutTse"],
        message: ERROR_MESSAGES.REQUIRED_SELECTION,
      });
    }
    if (data.hasOtherHearAboutTSESelected && !data.otherHearAboutTSE) {
      ctx.addIssue({
        code: "custom",
        path: ["otherHearAboutTSE"],
        message: ERROR_MESSAGES.REQUIRED,
      });
    }

    if (!Object.values(data.roles).some(Boolean)) {
      ctx.addIssue({
        code: "custom",
        path: ["roles"],
        message: ERROR_MESSAGES.NO_ROLE_SELECTED,
      });
    }

    if (!data.hasResume) {
      ctx.addIssue({
        code: "custom",
        path: ["resume"],
        message: ERROR_MESSAGES.NO_RESUME,
      });
    }

    const validatePrompt = (key: string, required: boolean) => {
      const value = data.prompts[key] ?? "";
      if (required && !value) {
        ctx.addIssue({ code: "custom", path: [key], message: ERROR_MESSAGES.REQUIRED });
      } else if (countWords(value) > SHORT_ANSWER_MAX_WORDS) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: ERROR_MESSAGES.OVER_WORD_LIMIT,
        });
      }
    };

    validatePrompt("about", true);
    validatePrompt("interest", true);
    validatePrompt("designer", data.roles.designer);
    validatePrompt("developer", data.roles.developer);
    validatePrompt("test_barriers", data.roles.test_designer || data.roles.test_developer);
    validatePrompt("test_designer", data.roles.test_designer);
    validatePrompt("test_developer", data.roles.test_developer);
  });

const deadlineStr = DEADLINE.toLocaleString("en-US");
const startdateStr = STARTDATE.toLocaleString("en-US");

function Apply() {
  // initialize state below this line
  const [personalInfo, setPersonalInfo] = useState({
    startQuarter: "",
    startYear: "",
    gradQuarter: "",
    gradYear: "",
    isTransfer: false,
    name: "",
    pronouns: "",
    email: "",
    phone: "",
    major: "",
    majorDept: "",
    prevTest: "none", // default to not having been in TEST
    otherHearAboutTSE: "",
  });

  // keeps track of which role checkboxes are clicked
  const [roles, setRoles] = useState({
    test_developer: false,
    test_designer: false,
    developer: false,
    designer: false,
  });

  // Track which "How did you hear about TSE"? option(s) the user has selected.
  // Initialize an object with each option intially mapping to false.
  const [hearAboutTse, setHearAboutTse] = useState<Record<string, boolean>>(
    HEAR_ABOUT_TSE_OPTIONS.reduce(
      (prevObj, curKey) => ({
        ...prevObj,
        [curKey]: false,
      }),
      {} as Record<string, boolean>,
    ),
  );

  const [prompts, setPrompts] = useState<{ [key: string]: string }>({
    about: "",
    interest: "",
    designer: "",
    developer: "",
    test_barriers: "",
    test_designer: "",
    test_developer: "",
  });

  const { alerts, addAlert } = useAlerts();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [resumeFile, setResumeFile] = useState<File | undefined>(undefined);

  const getWordCountText = (promptKey: string): string =>
    `Max ${SHORT_ANSWER_MAX_WORDS} words: ${countWords(
      prompts[promptKey] || "",
    )}/${SHORT_ANSWER_MAX_WORDS}`;

  const isPromptOverLimit = (promptKey: string): boolean =>
    countWords(prompts[promptKey] || "") > SHORT_ANSWER_MAX_WORDS;

  const validateApplication = (): ApplicationErrors => {
    const result = applicationSchema.safeParse({
      name: personalInfo.name,
      pronouns: personalInfo.pronouns,
      email: personalInfo.email,
      phone: personalInfo.phone,
      startQuarter: personalInfo.startQuarter,
      startYear: personalInfo.startYear,
      gradQuarter: personalInfo.gradQuarter,
      gradYear: personalInfo.gradYear,
      majorDept: personalInfo.majorDept,
      major: personalInfo.major,
      otherHearAboutTSE: personalInfo.otherHearAboutTSE,
      hasHearAboutTSESelection: Object.values(hearAboutTse).some(Boolean),
      hasOtherHearAboutTSESelected: hearAboutTse.Other,
      hasResume: !!resumeFile,
      roles,
      prompts,
    });

    if (result.success) return {};

    return z.flattenError(result.error).fieldErrors as ApplicationErrors;
  };

  const hasFieldError = (field: ApplicationField): boolean => !!errors[field]?.length;
  const getFieldError = (field: ApplicationField): string => errors[field]?.[0] ?? "";

  // create any event handler functions below this line

  const updatePersonalInfo = (fieldName: string, value: string) => {
    setPersonalInfo({ ...personalInfo, [fieldName]: value });
  };

  const updateRoleCheckbox = (e: ChangeEvent<HTMLInputElement>) => {
    setRoles({ ...roles, [e.target.id]: e.target.checked });
  };

  const updateHearAboutTSECheckbox = (e: ChangeEvent<HTMLInputElement>) => {
    setHearAboutTse({ ...hearAboutTse, [e.target.id]: e.target.checked });
  };

  const updatePrompt = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompts({
      ...prompts,
      [e.target.id.replace("prompt_", "")]: e.target.value,
    });
  };

  const graduatesThisSchoolYear = useMemo(() => {
    const gradQuarter =
      Number.parseInt(personalInfo.gradQuarter, 10) +
      4 * Number.parseInt(personalInfo.gradYear, 10);
    // Do they graduate before fall of next year?
    // 2 = fall
    // IMPORTANT: update this if we ever change the numeric correspondences of each quarter
    const nextFallQuarter = 2 + 4 * (new Date().getFullYear() + 1);
    return gradQuarter < nextFallQuarter;
  }, [personalInfo.gradQuarter, personalInfo.gradYear]);

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setSubmitting(true);

    const newErrors = validateApplication();
    console.log(newErrors);
    setErrors(newErrors);

    if (Object.values(newErrors).some((fieldErrors) => fieldErrors.length > 0)) {
      addAlert("Please review the errors in your application.");
      setSubmitting(false);
      return;
    }

    const selectedRoles = Object.entries(roles)
      .filter(([_role, selected]) => selected)
      .map(([role, _selected]) => role);

    const startQuarter =
      Number.parseInt(personalInfo.startQuarter, 10) +
      4 * Number.parseInt(personalInfo.startYear, 10);
    const gradQuarter =
      Number.parseInt(personalInfo.gradQuarter, 10) +
      4 * Number.parseInt(personalInfo.gradYear, 10);

    const selectedHearAboutTSE = Object.entries(hearAboutTse)
      .filter(([_role, selected]) => selected)
      .map(([role, _selected]) => (role === "Other" ? personalInfo.otherHearAboutTSE : role));

    if (!resumeFile) {
      setSubmitting(false);
      return;
    }

    api
      .uploadResume(resumeFile)
      .then(({ resumeUrl }) => {
        const application: SubmitApplicationRequest = {
          name: personalInfo.name,
          pronouns: personalInfo.pronouns,
          email: personalInfo.email,
          phone: personalInfo.phone,
          startQuarter,
          gradQuarter,
          isTransfer: personalInfo.isTransfer,
          major: personalInfo.major,
          majorDept: personalInfo.majorDept,
          hearAboutTSE: selectedHearAboutTSE,
          prevTest: personalInfo.prevTest,
          resumeUrl,
          aboutPrompt: prompts.about,
          interestPrompt: prompts.interest,
          testBarriersPrompt:
            selectedRoles.includes("test_designer") || selectedRoles.includes("test_developer")
              ? prompts.test_barriers
              : "N/A",
          rolePrompts: Object.fromEntries(selectedRoles.map((role) => [role, prompts[role]])),
        };

        const errorPrefix =
          "Could not submit your application. Please contact triton.software.engineering@gmail.com for support.";

        api
          .submitApplication(application)
          .then(() => {
            addAlert(
              "Thank you for applying to Triton Software Engineering! You will receive a confirmation email shortly. Please monitor your UCSD email for updates on your application status. We promise to get back to you!",
              "success",
            );
          })
          .catch((err) => {
            addAlert(`${errorPrefix} Details: ${err}`);
          })
          .finally(() => {
            setSubmitting(false);
          });
      })
      .catch((err) => {
        addAlert(
          `Could not upload your resume. Please contact triton.software.engineering@gmail.com for support. Error: ${err}`,
        );
        setSubmitting(false);
      });
  };

  if (new Date() > DEADLINE) {
    return (
      <p className="tw:p-4 tw:font-stack-sans-text tw:text-cream-primary">
        Applications for the current school year closed at {deadlineStr}.
      </p>
    );
  }

  if (new Date() < STARTDATE) {
    return (
      <p className="tw:p-4 tw:font-stack-sans-text tw:text-cream-primary">
        Applications for the current school year will open at {startdateStr}.
      </p>
    );
  }

  // By default, mouse wheel events on a number input will change the numeric
  // value. This results in people accidentally changing the values when they
  // scroll the page, so we disable it.
  // https://stackoverflow.com/a/67157325
  const numberInputOnWheel: WheelEventHandler<HTMLInputElement> = (e) => e.currentTarget.blur();

  // all html related material below here
  return (
    <div className="tw:relative  tw:bg-[#08090A]">
      <div className="tw:mx-auto tw:max-w-[80rem] tw:p-4">
        <form className="tw:flex tw:flex-col" onSubmit={onSubmit}>
          <div className="tw:pt-[100px] tw:pb-[60px]">
            <p className="tw:text-cloud tw:text-[48px]! tw:font-stack-sans-notch">
              Triton Software Engineering Application 2026-27
            </p>
            <p className="tw:font-stack-sans-text tw:text-[20px]! tw:text-cream-primary">
              Thank you for your interest in Triton Software Engineering! <br /> The deadline to
              submit your application is <span className="tw:text-gold-75">{deadlineStr}.</span>
            </p>
          </div>

          <FormSectionLabel>Section 01: About You</FormSectionLabel>
          <FormSection>
            <FormBlock>
              <div className="tw:grid tw:grid-cols-[1fr_1fr] tw:gap-x-[60px] tw:gap-y-[20px]">
                <TextInput
                  type="text"
                  onChange={(e) => {
                    updatePersonalInfo("name", e.target.value);
                  }}
                  label="Full Name"
                  hint="Feel free to use your preferred name."
                  invalid={hasFieldError("name")}
                  invalidHint={getFieldError("name")}
                />
                <TextInput
                  type="text"
                  onChange={(e) => {
                    updatePersonalInfo("pronouns", e.target.value);
                  }}
                  label="Pronouns"
                  hint="e.g. he/him, she/her, they/them"
                  invalid={hasFieldError("pronouns")}
                  invalidHint={getFieldError("pronouns")}
                />
                <TextInput
                  type="email"
                  onChange={(e) => {
                    updatePersonalInfo("email", e.target.value);
                  }}
                  label="UCSD Email Address"
                  hint="e.g. example@ucsd.edu"
                  invalid={hasFieldError("email")}
                  invalidHint={getFieldError("email")}
                />
                <TextInput
                  type="tel"
                  onChange={(e) => {
                    updatePersonalInfo("phone", e.target.value);
                  }}
                  label="Phone Number"
                  invalid={hasFieldError("phone")}
                  invalidHint={getFieldError("phone")}
                />
              </div>
            </FormBlock>
            <FormBlock>
              <div className="tw:grid tw:grid-cols-[4fr_3fr_5fr] tw:gap-x-[20px] tw:gap-y-[20px]">
                <FieldGroup>
                  <SelectField
                    label="Start Quarter"
                    value={personalInfo.startQuarter}
                    onValueChange={(value) => {
                      updatePersonalInfo("startQuarter", value);
                    }}
                    options={QUARTER_OPTIONS}
                  />
                  <HelpText className="tw:invisible">.</HelpText>
                </FieldGroup>
                <TextInput
                  type="number"
                  min="2000"
                  max="2099"
                  onChange={(e) => {
                    updatePersonalInfo("startYear", e.target.value);
                  }}
                  onWheel={numberInputOnWheel}
                  label="Start Year"
                  invalid={hasFieldError("startYear")}
                  invalidHint={getFieldError("startYear")}
                />
                <FieldGroup>
                  <FieldLabel invisible>.</FieldLabel>
                  <div className="tw:flex tw:flex-col tw:justify-center tw:pl-[60px]">
                    <HelpText>
                      For your Start Quarter, we’re looking for your first quarter as an
                      undergraduate student at UC San Diego, excluding any previous post-secondary
                      institutions.
                    </HelpText>
                  </div>
                </FieldGroup>
                <FieldGroup>
                  <SelectField
                    label="Graduation Quarter"
                    value={personalInfo.gradQuarter}
                    onValueChange={(value) => {
                      updatePersonalInfo("gradQuarter", value);
                    }}
                    options={QUARTER_OPTIONS}
                  />
                </FieldGroup>
                <FieldGroup>
                  <TextInput
                    type="number"
                    min="2000"
                    max="2099"
                    onChange={(e) => {
                      updatePersonalInfo("gradYear", e.target.value);
                    }}
                    onWheel={numberInputOnWheel}
                    label="Graduation Year"
                    invalid={hasFieldError("gradYear")}
                    invalidHint={getFieldError("gradYear")}
                  />
                  <HelpText className="tw:invisible">.</HelpText>
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel invisible>.</FieldLabel>
                  <div className="tw:flex tw:flex-col tw:justify-center tw:pl-[60px]">
                    <HelpText>
                      For your Graduation Quarter, if you are unsure about your graduation date,
                      give us your best estimate.{" "}
                    </HelpText>
                  </div>
                </FieldGroup>
              </div>
              <FieldCol widthClass="tw:w-1/3">
                <FieldGroup>
                  <FieldLabel>Are you a transfer student?</FieldLabel>
                  <div className="tw:flex tw:gap-4">
                    <Button
                      active={personalInfo.isTransfer}
                      onClick={() => {
                        setPersonalInfo({ ...personalInfo, isTransfer: true });
                      }}
                    >
                      Yes
                    </Button>
                    <Button
                      active={!personalInfo.isTransfer}
                      onClick={() => {
                        setPersonalInfo({ ...personalInfo, isTransfer: false });
                      }}
                    >
                      No
                    </Button>
                  </div>
                </FieldGroup>
              </FieldCol>
            </FormBlock>

            <div className="tw:grid tw:w-full tw:grid-cols-[1fr_1fr] tw:gap-x-[60px] tw:gap-y-[20px]">
              <TextInput
                type="text"
                onChange={(e) => {
                  updatePersonalInfo("majorDept", e.target.value);
                }}
                label="Major Department"
                hint="e.g. Cognitive Science, Computer Science and Engineering, Mathematics"
                invalid={hasFieldError("majorDept")}
                invalidHint={getFieldError("majorDept")}
              />
              <TextInput
                type="text"
                onChange={(e) => {
                  updatePersonalInfo("major", e.target.value);
                }}
                label="Major"
                hint="e.g. Cognitive Science with Specialization in Design and Interaction, Computer Engineering"
                invalid={hasFieldError("major")}
                invalidHint={getFieldError("major")}
              />
            </div>
            <FieldRow>
              <FieldCol widthClass="tw:w-full">
                <FieldGroup>
                  <FieldLabel invalid={hasFieldError("hearAboutTse")}>
                    How did you hear about TSE?
                  </FieldLabel>
                  <HelpText invalid={hasFieldError("hearAboutTse")}>
                    {getFieldError("hearAboutTse") || "Feel free to select multiple options."}
                  </HelpText>
                  <div className="tw:grid-cols-3 tw:grid tw:gap-y-[20px] tw:gap-x-[100px] tw:pb-[20px]">
                    {HEAR_ABOUT_TSE_OPTIONS.map((option) => (
                      <Checkbox
                        key={option}
                        onChange={updateHearAboutTSECheckbox}
                        label={option}
                        id={option}
                      />
                    ))}
                  </div>
                </FieldGroup>
                {hearAboutTse.Other ? (
                  <TextInput
                    type="text"
                    placeholder="Please specify"
                    className="tw:mt-3"
                    onChange={(e) => {
                      updatePersonalInfo("otherHearAboutTSE", e.target.value);
                    }}
                    invalid={hasFieldError("otherHearAboutTSE")}
                    invalidHint={getFieldError("otherHearAboutTSE")}
                  />
                ) : null}
              </FieldCol>
            </FieldRow>
          </FormSection>
          <FormSectionLabel>Section 02: Your Application</FormSectionLabel>
          <FormSection>
            <FieldRow>
              <FieldCol widthClass="tw:w-full">
                <FieldGroup>
                  <FieldLabel invalid={hasFieldError("resume")}>Resume</FieldLabel>
                  <HelpText invalid={hasFieldError("resume")}>
                    Your resume must be a single page PDF. If your resume does not meet this
                    requirement, your application will not be considered.
                  </HelpText>
                  {resumeFile ? (
                    <div className="tw:flex tw:items-center tw:justify-between tw:font-sometype-mono tw:text-[20px] tw:uppercase tw:text-gray-60">
                      <div className="tw:flex tw:items-center tw:gap-3">
                        <span>Uploaded File:</span>
                        <FileText className="tw:h-5 tw:w-5" />
                        <span className="tw:text-cloud">{resumeFile.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setResumeFile(undefined);
                        }}
                        className="tw:flex tw:cursor-pointer tw:items-center tw:gap-2 tw:hover:text-cloud"
                      >
                        <span>Remove</span>
                        <Trash2 className="tw:h-5 tw:w-5" />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="application/pdf"
                      className="tw:font-stack-sans-text tw:text-transparent tw:file:mr-4 tw:file:cursor-pointer tw:file:border-3 tw:hover:file:border-cloud tw:file:border-gray-60 tw:file:bg-transparent tw:file:px-[20px] tw:file:py-[12px] tw:file:font-sometype-mono tw:file:text-[20px] tw:file:text-gray-60 tw:hover:file:text-cloud tw:file:uppercase"
                      onChange={(e) => {
                        setResumeFile(e.target.files?.[0]);
                      }}
                    />
                  )}
                  {hasFieldError("resume") && (
                    <HelpText invalid>{getFieldError("resume")}</HelpText>
                  )}
                </FieldGroup>
              </FieldCol>
            </FieldRow>
            <FieldRow className="tw:w-full">
              <FieldCol widthClass="tw:w-full">
                <FieldGroup>
                  <SelectField
                    label="Were you previously a part of TSE's TEST program?"
                    value={personalInfo.prevTest}
                    onValueChange={(value) => {
                      updatePersonalInfo("prevTest", value);
                    }}
                    options={PREV_TEST_OPTIONS}
                  />
                </FieldGroup>
              </FieldCol>
            </FieldRow>
            <FieldRow>
              <FieldRow>
                <FieldLabel>What is the TSE Early Start Training (TEST) Program?</FieldLabel>
                <HelpText className="tw:flex tw:flex-col tw:gap-3">
                  <span>
                    The TEST program is a year-long initiative to provide students with limited to
                    no prior experience a first step into exploring software engineering or UI/UX
                    design, and we especially encourage students from underprivileged backgrounds to
                    apply. Participants learn domain fundamentals while building beginner-level
                    projects. Upon completion, members may be directly accepted into TSE through our
                    internal evaluation process. If not accepted, members may apply during the
                    following recruitment cycle.
                  </span>
                  <ul className="tw:list-disc tw:pl-5">
                    <li>
                      Eligibility: Because the purpose of TEST is to prepare students to join as a
                      general TSE member, applicants graduating before next Fall are ineligible.
                    </li>
                    <li>
                      Important Note: You may only apply to either the standard TSE track or the
                      TEST program. Cross-consideration is not supported once submitted.
                    </li>
                  </ul>
                  <span>
                    If you are unsure about which program is right for you, please contact us at{" "}
                    <a href="mailto:triton.software.engineering@gmail.com">
                      triton.software.engineering@gmail.com
                    </a>
                    .
                  </span>
                </HelpText>
              </FieldRow>
              <FieldCol>
                <FieldGroup>
                  <FieldLabel>which role(s) will you apply for?</FieldLabel>
                  <HelpText>
                    <span>
                      Each role you select will have a corresponding free-response question.
                    </span>
                  </HelpText>
                  <div className="tw:flex tw:flex-col tw:gap-6">
                    <Checkbox
                      onChange={updateRoleCheckbox}
                      label="Designer"
                      id="designer"
                      // if any TEST box is checked, disable the checkbox
                      disabled={roles.test_developer || roles.test_designer}
                    />
                    <Checkbox
                      onChange={updateRoleCheckbox}
                      label="Developer"
                      id="developer"
                      disabled={roles.test_developer || roles.test_designer}
                    />
                    <Checkbox
                      onChange={updateRoleCheckbox}
                      label="TEST Designer"
                      id="test_designer"
                      // if any non-TEST box is checked, disable the checkbox
                      disabled={roles.designer || roles.developer}
                    />
                    <Checkbox
                      onChange={updateRoleCheckbox}
                      label="TEST Developer"
                      id="test_developer"
                      disabled={roles.designer || roles.developer}
                    />
                  </div>
                </FieldGroup>
                {(roles.test_developer || roles.test_designer) && (
                  <div className="tw:mt-3">
                    <AlertBanner variant={graduatesThisSchoolYear ? "danger" : "warning"}>
                      {graduatesThisSchoolYear
                        ? `You are inelligible to apply for TEST because you are graduating this school year.`
                        : `You are applying to a TEST role. Please read the above information carefully
                  before continuing. Your application will not be considered if you do not meet the
                  qualifications for the TEST program.`}
                    </AlertBanner>
                  </div>
                )}
              </FieldCol>
            </FieldRow>
          </FormSection>
          <FormSectionLabel>section 03: free response questions</FormSectionLabel>
          <FormSection>
            <FieldRow className="tw:w-full">
              <FieldCol widthClass="tw:w-full">
                <TextArea
                  id="prompt_about"
                  label="Tell us about yourself."
                  value={prompts.about}
                  onChange={updatePrompt}
                  invalid={isPromptOverLimit("about")}
                  hint={getWordCountText("about")}
                  invalidHint={getWordCountText("about")}
                  rows={7}
                />
              </FieldCol>
            </FieldRow>
            <FieldRow className="tw:w-full">
              <FieldCol widthClass="tw:w-full">
                <TextArea
                  id="prompt_interest"
                  label="Why are you interested in being part of TSE?"
                  value={prompts.interest}
                  onChange={updatePrompt}
                  invalid={isPromptOverLimit("interest")}
                  hint={getWordCountText("interest")}
                  invalidHint={getWordCountText("interest")}
                  rows={7}
                />
              </FieldCol>
            </FieldRow>
            {roles.designer && (
              <FieldRow className="tw:w-full">
                <FieldCol widthClass="tw:w-full">
                  <TextArea
                    id="prompt_designer"
                    label="Why are you interested in the Designer role specifically? Please also include a link to your portfolio or body of work (if you have one), and make sure your link is publicly viewable, or provide instructions on how to access it."
                    value={prompts.designer}
                    onChange={updatePrompt}
                    invalid={isPromptOverLimit("designer")}
                    hint={getWordCountText("designer")}
                    invalidHint={getWordCountText("designer")}
                    rows={7}
                  />
                </FieldCol>
              </FieldRow>
            )}
            {roles.developer && (
              <FieldRow className="tw:w-full">
                <FieldCol widthClass="tw:w-full">
                  <TextArea
                    id="prompt_developer"
                    label="Why are you interested in the Developer role specifically?"
                    value={prompts.developer}
                    onChange={updatePrompt}
                    invalid={isPromptOverLimit("developer")}
                    hint={getWordCountText("developer")}
                    invalidHint={getWordCountText("developer")}
                    rows={7}
                  />
                </FieldCol>
              </FieldRow>
            )}
            {(roles.test_designer || roles.test_developer) && (
              <FieldRow className="tw:w-full">
                <FieldCol widthClass="tw:w-full">
                  <TextArea
                    id="prompt_test_barriers"
                    label="Why do you believe you are a good fit for the TEST program, and what do you hope to gain from the program? Additionally, please describe how your participation in this program would be helpful to you in overcoming historical barriers such as financial commitments, lack of role models/community/knowledge of graduate study, first-generation, etc."
                    value={prompts.test_barriers}
                    onChange={updatePrompt}
                    invalid={isPromptOverLimit("test_barriers")}
                    hint={getWordCountText("test_barriers")}
                    invalidHint={getWordCountText("test_barriers")}
                    rows={7}
                  />
                </FieldCol>
              </FieldRow>
            )}
            {roles.test_designer && (
              <FieldRow className="tw:w-full">
                <FieldCol widthClass="tw:w-full">
                  <TextArea
                    id="prompt_test_designer"
                    label="Why are you interested in the TEST Designer role specifically?"
                    value={prompts.test_designer}
                    onChange={updatePrompt}
                    invalid={isPromptOverLimit("test_designer")}
                    hint={getWordCountText("test_designer")}
                    invalidHint={getWordCountText("test_designer")}
                    rows={7}
                  />
                </FieldCol>
              </FieldRow>
            )}
            {roles.test_developer && (
              <FieldRow className="tw:w-full">
                <FieldCol widthClass="tw:w-full">
                  <TextArea
                    id="prompt_test_developer"
                    label="Why are you interested in the TEST Developer role specifically?"
                    value={prompts.test_developer}
                    onChange={updatePrompt}
                    invalid={isPromptOverLimit("test_developer")}
                    hint={getWordCountText("test_developer")}
                    invalidHint={getWordCountText("test_developer")}
                    rows={7}
                  />
                </FieldCol>
              </FieldRow>
            )}
          </FormSection>
          {
            /**
             * Disable button while loading to prevent spam clicking and submitting duplicate applications
             */
            <div className="tw:mb-24">
              <SubmitButton disabled={submitting}>
                {submitting ? <LoadingSpinner /> : "Submit Application"}
              </SubmitButton>
            </div>
          }
        </form>
        {alerts}
      </div>
    </div>
  );
}

export default Apply;
