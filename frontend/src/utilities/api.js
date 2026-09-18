export const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

export const errorMessageFrom = (error, fallback) =>
  (error.response && error.response.data && error.response.data.message) || fallback;
