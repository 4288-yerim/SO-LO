export function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  }).then((res) => {
    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.replace("/so:lo/login");
      throw new Error("Unauthorized");
    }

    return res;
  });
}