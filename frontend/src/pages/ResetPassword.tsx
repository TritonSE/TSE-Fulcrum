import { FormEventHandler, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import Form from "react-bootstrap/Form";
import { useSearchParams } from "react-router-dom";
import { resetPassword } from "../api";
import CenteredPaddedBox from "../components/CenteredPaddedBox";

function ResetPassword() {
  const [searchParams, _setSearchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    resetPassword({ email, password, passwordResetToken: searchParams.get("token") || "" }).then((response) => {
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
        <FloatingLabel controlId="login-email" label="Email address">
          <Form.Control type="email" size="lg" placeholder="" onChange={(e) => setEmail(e.target.value)}/>
        </FloatingLabel>
        <FloatingLabel controlId="login-password" label="Password">
          <Form.Control
            type="password"
            size="lg"
            placeholder=""
            onChange={(e) => setPassword(e.target.value)}
          />
        </FloatingLabel>
        <Button type="submit">Request Password Reset</Button>
        <Alert show={submitted} variant="success">
          Your password has been reset.
        </Alert>
        {/* TODO: handle errors */}
      </Form>
    </CenteredPaddedBox>
  );
}

export default ResetPassword;
