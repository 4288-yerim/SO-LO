import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigate, useLocation } from "react-router-dom";

import Signup from "./components/Signup";
import Login from "./components/Login";
import FindId from "./components/FindId";
import FindPassword from "./components/FindPassword";
import Feed from "./components/Feed";
import SignupPrivacy from "./components/SignupPrivacy";
import Post from "./components/Post";
import Message from "./components/Message";
import Notification from "./components/Notification";
import Profile from "./components/Profile";
import Search from "./components/Search";
import Setting from "./components/Setting";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/so:lo/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        <Route
          path="/so:lo/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/so:lo/find-id"
          element={
            <PublicRoute>
              <FindId />
            </PublicRoute>
          }
        />

        <Route
          path="/so:lo/find-password"
          element={
            <PublicRoute>
              <FindPassword />
            </PublicRoute>
          }
        />

        <Route
          path="/so:lo/signup-privacy"
          element={
            <PublicRoute>
              <SignupPrivacyRoute>
                <SignupPrivacy />
              </SignupPrivacyRoute>
            </PublicRoute>
          }
        />

        <Route
          path="/so:lo/feed"
          element={
            <PrivateRoute>
              <Feed />
            </PrivateRoute>
          }
        />

        <Route
          path="/so:lo/post"
          element={
            <PrivateRoute>
              <Post />
            </PrivateRoute>
          }
        />

        <Route
          path="/so:lo/message"
          element={
            <PrivateRoute>
              <Message />
            </PrivateRoute>
          }
        />

        <Route
          path="/so:lo/notification"
          element={
            <PrivateRoute>
              <Notification />
            </PrivateRoute>
          }
        />

        <Route
          path="/so:lo/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />

        <Route
          path="/so:lo/search"
          element={
            <PrivateRoute>
              <Search />
            </PrivateRoute>
          }
        />

        <Route
          path="/so:lo/setting"
          element={
            <PrivateRoute>
              <Setting />
            </PrivateRoute>
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/so:lo/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const token = localStorage.getItem("token");

  if (token) {
    return <Navigate to="/so:lo/feed" replace />;
  }

  return children;
}

function SignupPrivacyRoute({ children }) {
  const location = useLocation();

  if (!location.state?.fromSignup) {
    return <Navigate to="/so:lo/signup" replace />;
  }

  return children;
}

export default App;