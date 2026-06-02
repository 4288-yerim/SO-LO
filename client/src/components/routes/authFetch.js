export async function authFetch(url, options = {}) {
  let token = localStorage.getItem("token");

  if (token) {
    token = token.replace(/^Bearer\s+/i, "");
  }

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
    const cleanToken = newToken.replace(/^Bearer\s+/i, "");
    localStorage.setItem("token", cleanToken);
  }

  if (res.status === 401) {
    return res;
  }

  return res;
}