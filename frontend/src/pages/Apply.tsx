import { ChangeEvent, FormEventHandler, useState, WheelEventHandler } from "react";
import { Alert, Button, Col, Form, Row } from "react-bootstrap";
import { LoadingSpinner } from "@tritonse/tse-constellation";

import { countWords } from "../util";
import { useAlerts } from "../hooks/alerts";
import api from "../api";

if (!import.meta.env.VITE_APPLICATION_DEADLINE) {
  throw new Error("Missing VITE_APPLICATION_DEADLINE!");
}

const DEADLINE = new Date(import.meta.env.VITE_APPLICATION_DEADLINE);
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

const SHORT_ANSWER_MAX_WORDS = 150; // Maximum number of words for short answer questions

const deadlineStr = DEADLINE.toLocaleString("en-US");

function Apply() {
  // initialize state below this line
  const [personalInfo, setPersonalInfo] = useState({
    startQuarter: "",
    startYear: "",
    gradQuarter: "",
    gradYear: "",
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
      {} as Record<string, boolean>
    )
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

  const getWordCountText = (promptKey: string): string =>
    `Max ${SHORT_ANSWER_MAX_WORDS} words: ${countWords(
      prompts[promptKey] || ""
    )}/${SHORT_ANSWER_MAX_WORDS}`;

  const isPromptOverLimit = (promptKey: string): boolean =>
    countWords(prompts[promptKey] || "") > SHORT_ANSWER_MAX_WORDS;

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

  const updatePrompt = (e: ChangeEvent<HTMLInputElement>) => {
    setPrompts({
      ...prompts,
      [e.target.id.replace("prompt_", "")]: e.target.value,
    });
  };

  const [resumeFile, setResumeFile] = useState<File | undefined>(undefined);

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setSubmitting(true);

    const selectedRoles = Object.entries(roles)
      .filter(([_role, selected]) => selected)
      .map(([role, _selected]) => role);
    if (selectedRoles.length === 0) {
      addAlert("You must select at least one role to apply to.");
      setSubmitting(false);
      return;
    }

    if (!personalInfo.startQuarter || !personalInfo.gradQuarter) {
      addAlert("Select your start quarter and graduation quarter.");
      setSubmitting(false);
      return;
    }
    const startQuarter =
      parseInt(personalInfo.startQuarter, 10) + 4 * parseInt(personalInfo.startYear, 10);
    const gradQuarter =
      parseInt(personalInfo.gradQuarter, 10) + 4 * parseInt(personalInfo.gradYear, 10);

    const selectedHearAboutTSE = Object.entries(hearAboutTse)
      .filter(([_role, selected]) => selected)
      .map(([role, _selected]) => (role === "Other" ? personalInfo.otherHearAboutTSE : role));

    if (!resumeFile) {
      addAlert("Please upload your resume.");
      setSubmitting(false);
      return;
    }

    // There will only ever be a few prompts, so using for...of should be fine here.
    /* eslint-disable no-restricted-syntax */
    for (const prompt of Object.keys(prompts)) {
      if (isPromptOverLimit(prompt)) {
        addAlert(`One or more of your responses is over the word limit.`);
        setSubmitting(false);
        return;
      }
    }

    api
      .uploadResume(resumeFile)
      .then(({ resumeUrl }) => {
        const application = {
          name: personalInfo.name,
          pronouns: personalInfo.pronouns,
          email: personalInfo.email,
          phone: personalInfo.phone,
          startQuarter,
          gradQuarter,
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
          "Could not submit your application. Please contact tse@ucsd.edu for support.";

        api
          .submitApplication(application)
          .then(() => {
            addAlert(
              "Thank you for applying to Triton Software Engineering! You will receive a confirmation email shortly. Please monitor your UCSD email for updates on your application status. We promise to get back to you!",
              "success"
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
          `Could not upload your resume. Please contact tse@ucsd.edu for support. Error: ${err}`
        );
        setSubmitting(false);
      });
  };

  if (new Date() > DEADLINE) {
    return <p>Applications for the current school year closed at {deadlineStr}.</p>;
  }

  // By default, mouse wheel events on a number input will change the numeric
  // value. This results in people accidentally changing the values when they
  // scroll the page, so we disable it.
  // https://stackoverflow.com/a/67157325
  const numberInputOnWheel: WheelEventHandler<HTMLInputElement> = (e) => e.currentTarget.blur();

  // all html related material below here
  return (
    <div style={{ padding: "1rem", maxWidth: "60rem", margin: "0 auto" }}>
      <Form className="ApplicationForm" onSubmit={onSubmit}>
        <p>The deadline to submit your application is {deadlineStr}.</p>
        <Row>
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                required
                type="text"
                onChange={(e) => {
                  updatePersonalInfo("name", e.target.value);
                }}
              />
              <Form.Text>Feel free to use your preferred name.</Form.Text>
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>Pronouns (e.g. she/her)</Form.Label>
              <Form.Control
                required
                type="text"
                onChange={(e) => {
                  updatePersonalInfo("pronouns", e.target.value);
                }}
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>UCSD Email Address</Form.Label>
              <Form.Control
                required
                type="email"
                placeholder="example@ucsd.edu"
                pattern=".+@ucsd\.edu"
                onChange={(e) => {
                  updatePersonalInfo("email", e.target.value);
                }}
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>Phone Number</Form.Label>
              <Form.Control
                required
                type="tel"
                onChange={(e) => {
                  updatePersonalInfo("phone", e.target.value);
                }}
              />
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col xs={6} md={3}>
            <Form.Group>
              <Form.Label>Start Quarter</Form.Label>
              <Form.Select
                required
                onChange={(e) => {
                  updatePersonalInfo("startQuarter", e.target.value);
                }}
              >
                <option value="">select...</option>
                <option value="0">Winter</option>
                <option value="1">Spring</option>
                {/* Hide summer because people often select summer when they mean spring. */}
                {/* <option value="2">Summer</option> */}
                <option value="2">Fall</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={6} md={3}>
            <Form.Group>
              <Form.Label>Start Year</Form.Label>
              <Form.Control
                required
                type="number"
                min="2000"
                max="2099"
                onChange={(e) => {
                  updatePersonalInfo("startYear", e.target.value);
                }}
                onWheel={numberInputOnWheel}
              />
            </Form.Group>
          </Col>
          <Form.Text>
            Your first quarter as an undergraduate student at UC San Diego, excluding any previous
            post-secondary institutions.
          </Form.Text>
        </Row>
        <Row>
          <Col xs={6} md={3}>
            <Form.Group>
              <Form.Label>Graduation Quarter</Form.Label>
              <Form.Select
                required
                onChange={(e) => {
                  updatePersonalInfo("gradQuarter", e.target.value);
                }}
              >
                <option value="">select...</option>
                <option value="0">Winter</option>
                <option value="1">Spring</option>
                {/* Hide summer because people often select summer when they mean spring. */}
                {/* <option value="2">Summer</option> */}
                <option value="2">Fall</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={6} md={3}>
            <Form.Group>
              <Form.Label>Graduation Year</Form.Label>
              <Form.Control
                required
                type="number"
                min="2000"
                max="2099"
                onChange={(e) => {
                  updatePersonalInfo("gradYear", e.target.value);
                }}
                onWheel={numberInputOnWheel}
              />
            </Form.Group>
          </Col>
          <Form.Text>
            If you are unsure about your graduation date, give us your best estimate.
          </Form.Text>
        </Row>
        <Row>
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>Major Department</Form.Label>
              <Form.Control
                required
                type="text"
                onChange={(e) => {
                  updatePersonalInfo("majorDept", e.target.value);
                }}
              />
              <Form.Text>
                e.g. Cognitive Science, Computer Science and Engineering, Mathematics
              </Form.Text>
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>Major</Form.Label>
              <Form.Control
                required
                type="text"
                onChange={(e) => {
                  updatePersonalInfo("major", e.target.value);
                }}
              />
              <Form.Text>
                e.g. Cognitive Science with Specialization in Design and Interaction, Computer
                Engineering
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col>
            <Form.Group>
              <Form.Label>How did you hear about TSE?</Form.Label>
              <Form.Text>
                <p>Feel free to select multiple options.</p>
              </Form.Text>
              {HEAR_ABOUT_TSE_OPTIONS.map((option) => (
                <Form.Check
                  key={option}
                  onChange={updateHearAboutTSECheckbox}
                  name="HearAboutTSE"
                  label={option}
                  id={option}
                />
              ))}
            </Form.Group>
            {hearAboutTse.Other ? (
              <Form.Control
                required
                type="text"
                placeholder="Please specify"
                onChange={(e) => {
                  updatePersonalInfo("otherHearAboutTSE", e.target.value);
                }}
              />
            ) : null}
          </Col>
        </Row>
        <Row>
          <Col>
            <Form.Group>
              <Form.Label>
                Resume:
                <Alert variant="danger">
                  Your resume must be a 1 page PDF. If your resume does not meet this requirement,
                  your application will not be considered.
                </Alert>
                <Form.Control
                  required
                  type="file"
                  onChange={(e) => {
                    setResumeFile((e.target as HTMLInputElement).files?.[0]);
                  }}
                />
              </Form.Label>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col>
            <Form.Group>
              <Form.Label>
                Were you previously a part of TSE&apos;s TEST program? If so, were you a TEST
                Designer or a TEST Developer?
              </Form.Label>
              <Form.Select
                required
                onChange={(e) => {
                  updatePersonalInfo("prevTest", e.target.value);
                }}
              >
                <option value="">select...</option>
                <option value="none">I was not a part of the TEST program</option>
                <option value="test_designer">TEST Designer</option>
                <option value="test_developer">TEST Developer</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col>
            <Form.Group>
              <Form.Label>Role(s) you are applying for:</Form.Label>
              <Form.Check
                onChange={updateRoleCheckbox}
                name="Roles"
                label="Designer"
                id="designer"
                // if any TEST box is checked, disable the checkbox
                disabled={roles.test_developer || roles.test_designer}
              />
              <Form.Check
                onChange={updateRoleCheckbox}
                name="Roles"
                label="Developer"
                id="developer"
                disabled={roles.test_developer || roles.test_designer}
              />
              <Form.Check
                onChange={updateRoleCheckbox}
                name="Roles"
                label="TEST Designer"
                id="test_designer"
                // if any non-TEST box is checked, disable the checkbox
                disabled={roles.designer || roles.developer}
              />
              <Form.Check
                onChange={updateRoleCheckbox}
                name="Roles"
                label="TEST Developer"
                id="test_developer"
                disabled={roles.designer || roles.developer}
              />
            </Form.Group>
            {(roles.test_developer || roles.test_designer) && (
              <Form.Label>
                <Alert variant="warning">
                  You are applying to a TEST role. Please read the information below carefully
                  before continuing. Your application will not be considered if you do not meet the
                  qualifications for the TEST program.
                </Alert>
              </Form.Label>
            )}
          </Col>
          <Form.Text>
            <p>Each role you select will have a corresponding free-response question.</p>
            <p>
              The TSE Early Start Training (TEST) program provides students from{" "}
              <strong>underprivileged backgrounds</strong>, who have little to no technical
              design/development experience, with a first step into exploring UI/UX design and
              software engineering. TEST designers and developers will learn the fundamentals of
              their domain while working on beginner-level projects. TEST is a one-year program
              provided by TSE. After completing the program, if TEST designers and developers wish
              to join TSE as general members, they must apply during the next recruitment cycle.
            </p>
            <p>
              You may apply to either TSE or the TEST program, but not both. Please apply to the
              TEST program if you believe it would be a good fit for you. Once you apply to the TEST
              program, we will not be able to consider you for general admission, and vice versa. If
              you are unsure about which program is right for you, please contact us at{" "}
              <a href="mailto:tse@ucsd.edu">tse@ucsd.edu</a>.
            </p>
          </Form.Text>
        </Row>
        <Row>
          <Form.Group>
            <Form.Label>Tell us about yourself.</Form.Label>
            <Form.Control
              id="prompt_about"
              value={prompts.about}
              onChange={updatePrompt}
              isInvalid={isPromptOverLimit("about")}
              required
              as="textarea"
              rows={7}
            />
            <Form.Text
              style={{
                color: isPromptOverLimit("about") ? "red" : "",
              }}
            >
              {getWordCountText("about")}
            </Form.Text>
          </Form.Group>
        </Row>
        <Row>
          <Form.Group>
            <Form.Label>Why are you interested in being part of TSE?</Form.Label>
            <Form.Control
              id="prompt_interest"
              value={prompts.interest}
              onChange={updatePrompt}
              isInvalid={isPromptOverLimit("interest")}
              required
              as="textarea"
              rows={7}
            />
            <Form.Text
              style={{
                color: isPromptOverLimit("interest") ? "red" : "",
              }}
            >
              {getWordCountText("interest")}
            </Form.Text>
          </Form.Group>
        </Row>
        {roles.designer && (
          <Row>
            <Form.Group>
              <Form.Label>
                Why are you interested in the Designer role specifically? Please also include a link
                to your portfolio or body of work (if you have one), and make sure your link is
                publicly viewable, or provide instructions on how to access it.
              </Form.Label>
              <Form.Control
                id="prompt_designer"
                value={prompts.designer}
                onChange={updatePrompt}
                isInvalid={isPromptOverLimit("designer")}
                required
                as="textarea"
                rows={7}
              />
              <Form.Text
                style={{
                  color: isPromptOverLimit("designer") ? "red" : "",
                }}
              >
                {getWordCountText("designer")}
              </Form.Text>
            </Form.Group>
          </Row>
        )}
        {roles.developer && (
          <Row>
            <Form.Group>
              <Form.Label>Why are you interested in the Developer role specifically?</Form.Label>
              <Form.Control
                id="prompt_developer"
                value={prompts.developer}
                onChange={updatePrompt}
                isInvalid={isPromptOverLimit("developer")}
                required
                as="textarea"
                rows={7}
              />
              <Form.Text
                style={{
                  color: isPromptOverLimit("developer") ? "red" : "",
                }}
              >
                {getWordCountText("developer")}
              </Form.Text>
            </Form.Group>
          </Row>
        )}
        {(roles.test_designer || roles.test_developer) && (
          <Row>
            <Form.Group>
              <Form.Label>
                Why do you believe you are a good fit for the TEST program, and what do you hope to
                gain from the program? Additionally, please describe how your participation in this
                program would be helpful to you in overcoming historical barriers such as financial
                commitments, lack of role models/community/knowledge of graduate study,
                first-generation, etc.
              </Form.Label>
              <Form.Control
                id="prompt_test_barriers"
                value={prompts.test_barriers}
                onChange={updatePrompt}
                isInvalid={isPromptOverLimit("test_barriers")}
                required
                as="textarea"
                rows={7}
              />
              <Form.Text
                style={{
                  color: isPromptOverLimit("test_barriers") ? "red" : "",
                }}
              >
                {getWordCountText("test_barriers")}
              </Form.Text>
            </Form.Group>
          </Row>
        )}
        {roles.test_designer && (
          <Row>
            <Form.Group>
              <Form.Label>
                Why are you interested in the TEST Designer role specifically?
              </Form.Label>
              <Form.Control
                id="prompt_test_designer"
                value={prompts.test_designer}
                onChange={updatePrompt}
                isInvalid={isPromptOverLimit("test_designer")}
                required
                as="textarea"
                rows={7}
              />
              <Form.Text
                style={{
                  color: isPromptOverLimit("test_designer") ? "red" : "",
                }}
              >
                {getWordCountText("test_designer")}
              </Form.Text>
            </Form.Group>
          </Row>
        )}
        {roles.test_developer && (
          <Row>
            <Form.Group>
              <Form.Label>
                Why are you interested in the TEST Developer role specifically?
              </Form.Label>
              <Form.Control
                id="prompt_test_developer"
                value={prompts.test_developer}
                onChange={updatePrompt}
                isInvalid={isPromptOverLimit("test_developer")}
                required
                as="textarea"
                rows={7}
              />
              <Form.Text
                style={{
                  color: isPromptOverLimit("test_developer") ? "red" : "",
                }}
              >
                {getWordCountText("test_developer")}
              </Form.Text>
            </Form.Group>
          </Row>
        )}
        {
          /**
           * Disable button while loading to prevent spam clicking and submitting duplicate applications
           */
          <Button variant="primary" type="submit" className="mt-3" disabled={submitting}>
            {submitting ? <LoadingSpinner /> : "Submit"}
          </Button>
        }
      </Form>
      {alerts}
    </div>
  );
}

export default Apply;
