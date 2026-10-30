const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const checkHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`);
  }
  return response.json();
};

