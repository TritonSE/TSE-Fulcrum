import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import Form from "react-bootstrap/Form";
import CenteredPaddedBox from "../components/CenteredPaddedBox";

function Login() {
  return (
    <CenteredPaddedBox>
      <Form className="child-mt-3" style={{ width: "30rem" }}>
        <h1>Log In</h1>
        <FloatingLabel controlId="login-email" label="Email address">
          <Form.Control type="email" size="lg" placeholder="" />
        </FloatingLabel>
        <FloatingLabel controlId="login-password" label="Password">
          <Form.Control type="password" size="lg" placeholder="" />
        </FloatingLabel>
        <div className="d-flex flex-row child-ms-3">
          <Button type="submit">Log In</Button>
          <Button variant="outline-secondary">Forgot Password</Button>
        </div>
        <Alert variant="danger" show>
          Incorrect email address or password.
        </Alert>
      </Form>
    </CenteredPaddedBox>
  );
}

export default Login;
