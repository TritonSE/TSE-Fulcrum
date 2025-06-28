import { useState } from "react";
import { Alert, Button, Col, Form, Row, Spinner } from "react-bootstrap";

// Update these values each year before recruitment.
const RESUME_UPLOAD_URL = "/api/resume";
const SUBMIT_URL = "/api/application";

const PRESIDENT_EMAIL = "bej001@ucsd.edu";
const DEADLINE = new Date("2025-10-13T23:59:59-07:00"); // PDT is UTC-7
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

const deadlineStr = DEADLINE.toLocaleString("en-US");

function Apply() {
  // initialize state below this line
  const [personalInfo, setPersonalInfo] = useState({});

  // keeps track of which role checkboxes are clicked
  const [roles, setRoles] = useState({
    test_developer: false,
    test_designer: false,
    developer: false,
    designer: false,
  });

  // Track which "How did you hear about TSE"? option(s) the user has selected.
  // Initialize an object with each option intially mapping to false.
  const [hearAboutTse, setHearAboutTse] = useState(
    HEAR_ABOUT_TSE_OPTIONS.reduce(
      (prevObj, curKey) => ({
        ...prevObj,
        [curKey]: false,
      }),
      {}
    )
  );

  const [prompts, setPrompts] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // create any event handler functions below this line

  const updatePersonalInfo = (fieldName: string, value: string) => {
    setPersonalInfo({ ...personalInfo, [fieldName]: value });
  };

  const updateRoleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoles({ ...roles, [e.target.id]: e.target.checked });
  };

  const updateHearAboutTSECheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHearAboutTse({ ...hearAboutTse, [e.target.id]: e.target.checked });
  };

  const updatePrompt = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompts({
      ...prompts,
      [e.target.id.replace("prompt_", "")]: e.target.value,
    });
  };

  const [resumeFile, setResumeFile] = useState(undefined);

  // Uploads resume to backend and returns a URL to view it with
  const uploadResume = async () => {
    const formData = new FormData();

    if (!resumeFile) {
      return;
    }

    formData.append("resumeFile", resumeFile);

    const response = await fetch(RESUME_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return data.resumeUrl;
    }
    throw new Error(`HTTP ${response.status} (${response.statusText}`);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const selectedRoles = Object.entries(roles)
      .filter(([role, selected]) => selected)
      .map(([role, selected]) => role);
    if (selectedRoles.length === 0) {
      setError("You must select at least one role to apply to.");
      setSubmitting(false);
      return;
    }

    if (!personalInfo.startQuarter || !personalInfo.gradQuarter) {
      setError("Select your start quarter and graduation quarter.");
      setSubmitting(false);
      return;
    }
    const startQuarter = parseInt(personalInfo.startQuarter) + 4 * parseInt(personalInfo.startYear);
    const gradQuarter = parseInt(personalInfo.gradQuarter) + 4 * parseInt(personalInfo.gradYear);

    const selectedHearAboutTSE = Object.entries(hearAboutTse)
      .filter(([role, selected]) => selected)
      .map(([role, selected]) => (role === "Other" ? personalInfo.otherHearAboutTSE : role));

    if (!resumeFile) {
      setError("Please upload your resume.");
      setSubmitting(false);
      return;
    }

    setSuccess("Submitting your application...");

    uploadResume()
      .then((resumeUrl) => {
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
          rolePrompts: Object.fromEntries(selectedRoles.map((role) => [role, prompts[role]])),
        };

        console.log(application);

        const errorPrefix =
          "Could not submit your application. Please contact tse@ucsd.edu for support.";

        fetch(SUBMIT_URL, {
          method: "post",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(application),
        })
          .then((response) => {
            setError("");
            setSuccess("");
            if (response.ok) {
              setSuccess(
                "Thank you for applying to Triton Software Engineering! You will receive a confirmation email shortly. Please monitor your UCSD email for updates on your application status. We promise to get back to you!"
              );
            } else {
              const message = `${errorPrefix} HTTP ${response.status} (${response.statusText})`;
              setError(message);
              response
                .text()
                .then((text) => setError(message + ": " + text))
                .catch(console.error);
            }
          })
          .catch((e) => {
            setSuccess("");
            setError(`${errorPrefix} Details: ${e}`);
          })
          .finally(() => {
            setSubmitting(false);
          });
      })
      .catch((error) => {
        setError(
          `Could not upload your resume. Please contact tse@ucsd.edu for support. Error: ${error}`
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
  const numberInputOnWheel = (e) => e.currentTarget.blur();

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
                <option value="3">Fall</option>
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
                <option value="3">Fall</option>
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
                  onClick={updateHearAboutTSECheckbox}
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
                placeholder="Please sepcify"
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
                  Your resume must be 1 page in PDF format. If your resume does not meet this
                  requirement, your application will not be considered.
                </Alert>
                <Form.Control
                  required
                  type="file"
                  onChange={(e) => {
                    setResumeFile(e.target.files[0]);
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
                onClick={updateRoleCheckbox}
                name="Roles"
                label="Designer"
                id="designer"
                // if any TEST box is checked, disable the checkbox
                disabled={roles.test_developer || roles.test_designer}
              />
              <Form.Check
                onClick={updateRoleCheckbox}
                name="Roles"
                label="Developer"
                id="developer"
                disabled={roles.test_developer || roles.test_designer}
              />
              <Form.Check
                onClick={updateRoleCheckbox}
                name="Roles"
                label="TEST Designer"
                id="test_designer"
                // if any non-TEST box is checked, disable the checkbox
                disabled={roles.designer || roles.developer}
              />
              <Form.Check
                onClick={updateRoleCheckbox}
                name="Roles"
                label="TEST Developer"
                id="test_developer"
                disabled={roles.designer || roles.developer}
              />
            </Form.Group>
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
              you are unsure about which program is right for you, please contact TSE&apos;s current
              president at {PRESIDENT_EMAIL}.
            </p>
          </Form.Text>
        </Row>
        <Row>
          <Form.Group>
            <Form.Label>Tell us about yourself.</Form.Label>
            <Form.Control
              id="prompt_about"
              onChange={updatePrompt}
              required
              as="textarea"
              rows={7}
            />
          </Form.Group>
        </Row>
        <Row>
          <Form.Group>
            <Form.Label>Why are you interested in being part of TSE?</Form.Label>
            <Form.Control
              id="prompt_interest"
              onChange={updatePrompt}
              required
              as="textarea"
              rows={7}
            />
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
                onChange={updatePrompt}
                required
                as="textarea"
                rows={7}
              />
            </Form.Group>
          </Row>
        )}
        {roles.developer && (
          <Row>
            <Form.Group>
              <Form.Label>Why are you interested in the Developer role specifically?</Form.Label>
              <Form.Control
                id="prompt_developer"
                onChange={updatePrompt}
                required
                as="textarea"
                rows={7}
              />
            </Form.Group>
          </Row>
        )}
        {roles.test_designer && (
          <Row>
            <Form.Group>
              <Form.Label>
                Why do you believe you are a good fit for the TEST program, and what do you hope to
                gain from the program? Additionally, why are you interested in the TEST Designer
                role specifically?
              </Form.Label>
              <Form.Control
                id="prompt_test_designer"
                onChange={updatePrompt}
                required
                as="textarea"
                rows={7}
              />
            </Form.Group>
          </Row>
        )}
        {roles.test_developer && (
          <Row>
            <Form.Group>
              <Form.Label>
                Why do you believe you are a good fit for the TEST program, and what do you hope to
                gain from the program? Additionally, why are you interested in the TEST Developer
                role specifically?
              </Form.Label>
              <Form.Control
                id="prompt_test_developer"
                onChange={updatePrompt}
                required
                as="textarea"
                rows={7}
              />
            </Form.Group>
          </Row>
        )}
        {error && (
          <Row>
            <Col>
              <Alert variant="danger">{error}</Alert>
            </Col>
          </Row>
        )}
        {success && (
          <Row>
            <Col>
              <Alert variant="success">{success}</Alert>
            </Col>
          </Row>
        )}
        {
          /**
           * Adding this submitting/loading state to prevent spam clicking the button and submitting
           * duplicate applications. This bug has always been around but is more obvious now with resume
           * uploads that take a few seconds.
           */
          <Button variant="primary" type="submit" className="mt-3" disabled={submitting}>
            {submitting ? <Spinner animation="border" role="status" /> : "Submit"}
          </Button>
        }
      </Form>
    </div>
  );
}

export default Apply;
