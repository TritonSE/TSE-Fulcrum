import { FormEventHandler, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import Form from "react-bootstrap/Form";
import { requestPasswordReset } from "../api";
import CenteredPaddedBox from "../components/CenteredPaddedBox";

function RequestPasswordReset() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    requestPasswordReset({ email }).then((response) => {
      if (response.ok) {
        setSubmitted(true);
      }
    });
    // TODO: error handling
  }

  return (
    <CenteredPaddedBox>
      <Form className="child-mt-3" style={{ width: "30rem" }} onSubmit={handleSubmit}>
        <h1>Request Password Reset</h1>
        <FloatingLabel controlId="login-email" label="Email address" onChange={(e) => setEmail((e.target as any).value)}>
          <Form.Control type="email" size="lg" placeholder="" />
        </FloatingLabel>
        <Button type="submit">Request Password Reset</Button>
        <Alert show={submitted}>
          If the email address you entered is valid, you will receive an email with instructions to
          reset your password.
        </Alert>
      </Form>
    </CenteredPaddedBox>
  );
}

export default RequestPasswordReset;
