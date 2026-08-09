import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://resume-analyzer-backend-pint.onrender.com",
  timeout: 30000,
});

export default apiClient;
