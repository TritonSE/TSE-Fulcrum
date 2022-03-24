import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import Form from "react-bootstrap/Form";
import CenteredPaddedBox from "../components/CenteredPaddedBox";

function RequestPasswordReset() {
  return (
    <CenteredPaddedBox>
      <Form className="child-mt-3" style={{ width: "30rem" }}>
        <h1>Request Password Reset</h1>
        <FloatingLabel controlId="login-email" label="Email address">
          <Form.Control type="email" size="lg" placeholder="" />
        </FloatingLabel>
        <Button type="submit">Request Password Reset</Button>
        <Alert show>
          If the email address you entered is valid, you will receive an email with instructions to
          reset your password.
        </Alert>
      </Form>
    </CenteredPaddedBox>
  );
}

export default RequestPasswordReset;
