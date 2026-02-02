import axios from "axios";

// creamos una instancia de axios
const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL_BACK,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// extraemos el campo data de la respuesta que trae nuestros datos
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    return Promise.reject(
      error.response?.data || {
        success: false,
        message: "Error de red",
      },
    );
  },
);

export default axiosClient;
