import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import PrivateRoute from "./components/routes/PrivateRoute";
import PublicRoute from "./components/routes/PublicRoute";
import SignupPrivacyRoute from "./components/routes/SignupPrivRoute";

import Signup from "./components/user/Signup";
import Login from "./components/user/Login";
import FindId from "./components/user/FindId";
import FindPassword from "./components/user/FindPassword";
import SignupPrivacy from "./components/user/SignupPrivacy";
import Feed from "./components/Feed";
import Post from "./components/Post";
import Message from "./components/Message";
import Profile from "./components/profile/Profile";
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
          path="/so:lo/profile/:userId"
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

          <Route path="/" element={<Navigate to="/so:lo/feed" replace />} />
          <Route path="*" element={<Navigate to="/so:lo/feed" replace />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;