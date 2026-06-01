export async function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  const newToken = res.headers.get("Authorization");

  if (newToken) {
    localStorage.setItem("token", newToken.replace("Bearer ", ""));
  }

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/so:lo/login";
  }

  return res;
}