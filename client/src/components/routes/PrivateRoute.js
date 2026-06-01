import { Navigate } from "react-router-dom";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token || token === "undefined" || token === "null") {
    localStorage.removeItem("token");
    return <Navigate to="/so:lo/login" replace />;
  }

  return children;
}

export default PrivateRoute;