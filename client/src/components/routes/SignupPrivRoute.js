import { Navigate, useLocation } from "react-router-dom";

function SignupPrivacyRoute({ children }) {
  const location = useLocation();

  if (!location.state?.fromSignup) {
    return <Navigate to="/so:lo/signup" replace />;
  }

  return children;
}

export default SignupPrivacyRoute;