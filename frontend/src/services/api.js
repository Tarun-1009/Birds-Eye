const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
export const SERVER_URL = API_BASE_URL.replace('/api', '');

export const checkHealth = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error('API offline');
    return await res.json();
  } catch (err) {
    return { status: 'offline', message: err.message };
  }
};

export const fetchVideosData = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/videos`);
    if (!res.ok) throw new Error('Failed to fetch videos');
    return await res.json();
  } catch (err) {
    console.warn('Backend fetch failed, using fallback cache:', err.message);
    return {
      videos: [],
      target: null,
      stats: { videoCount: 0, totalBytes: 0, formattedTotalSize: '0 B' },
      isOffline: true,
    };
  }
};

export const uploadMedia = (formData, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/upload`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch (e) {
          reject(new Error('Invalid server JSON response'));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.error || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload. Ensure backend is running.'));
    xhr.send(formData);
  });
};

export const deleteVideoFile = async (id) => {
  const res = await fetch(`${API_BASE_URL}/videos/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete video');
  return data;
};

export const deleteTargetFile = async () => {
  const res = await fetch(`${API_BASE_URL}/target`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to remove target photo');
  return data;
};

export const runDetectionApi = async (payload) => {
  const res = await fetch(`${API_BASE_URL}/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Detection failed');
  return data;
};
