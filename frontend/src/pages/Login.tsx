import { useState, FormEventHandler } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import Form from "react-bootstrap/Form";
import { useLocation, useNavigate } from "react-router-dom";
import CenteredPaddedBox from "../components/CenteredPaddedBox";
import { useAuth } from "../contexts/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [failed, setFailed] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    auth
      .logIn({ email, password })
      .then((success) => {
        console.log({ success });
        if (success) {
          navigate((location.state as any).locationBeforeLoggingIn?.pathname || "/", {
            replace: true,
          });
        } else {
          setFailed(true);
        }
      })
      .catch(console.error);
  };

  return (
    <CenteredPaddedBox>
      <Form className="child-mt-3" style={{ width: "30rem" }} onSubmit={handleSubmit}>
        <h1>Log In</h1>
        <FloatingLabel controlId="login-email" label="Email address">
          <Form.Control
            type="email"
            size="lg"
            placeholder=""
            onChange={(e) => setEmail(e.target.value)}
          />
        </FloatingLabel>
        <FloatingLabel controlId="login-password" label="Password">
          <Form.Control
            type="password"
            size="lg"
            placeholder=""
            onChange={(e) => setPassword(e.target.value)}
          />
        </FloatingLabel>
        <div className="d-flex flex-row child-ms-3">
          <Button type="submit">Log In</Button>
          <Button variant="outline-secondary">Forgot Password</Button>
        </div>
        <Alert variant="danger" show={failed}>
          Incorrect email address or password.
        </Alert>
      </Form>
    </CenteredPaddedBox>
  );
}

export default Login;
