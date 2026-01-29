import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "https://api.1xstore.org",
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Response interceptor for token refresh and error handling
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (typeof window !== "undefined") {
        try {
          const refresh = localStorage.getItem("refresh_token")
          if (!refresh) {
            throw new Error("No refresh token")
          }

          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_BASE_URL || "https://api.1xstore.org"}/auth/refresh`,
            { refresh },
          )

          const newToken = res.data.access
          localStorage.setItem("access_token", newToken)
          original.headers.Authorization = `Bearer ${newToken}`

          return api(original)
        } catch (refreshError) {
          // Clear tokens and redirect to login
          localStorage.clear()
          window.location.href = "/login"
          return Promise.reject(refreshError)
        }
      }
    }

    // Extract error message from backend response
    const data = error.response?.data
    let backendMsg = ""

    if (data) {
      if (typeof data === "string") {
        backendMsg = data
      } else if (typeof data === "object") {
        // Check for standard error keys
        backendMsg = data.details || data.detail || data.error || data.message

        // Handle field-specific errors like {"email": ["User already exists"]}
        if (!backendMsg) {
          const values = Object.values(data)
          if (values.length > 0) {
            const firstVal = values[0]
            if (Array.isArray(firstVal) && firstVal.length > 0) {
              backendMsg = firstVal[0]
            } else if (typeof firstVal === "string") {
              backendMsg = firstVal
            }
          }
        }
      }
    }

    if (!backendMsg) {
      backendMsg = "Une erreur est survenue. Veuillez réessayer."
    }

    return Promise.reject({ message: backendMsg, originalError: error })
  },
)

export default api
