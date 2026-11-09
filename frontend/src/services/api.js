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

export const runDetectionApi = async (payload = {}) => {
  const res = await fetch(`${API_BASE_URL}/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Detection failed');
  return data;
};

// Cameras Registry
export const fetchCameras = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/cameras`);
    if (!res.ok) throw new Error('Failed to fetch cameras');
    return await res.json();
  } catch (err) {
    console.error('Error fetching cameras:', err);
    return [];
  }
};

// Sighting Search & Frame Sequence Query
export const fetchSightings = async ({ global_id, orientation, camera_id, search, entity_type, limit = 100 } = {}) => {
  try {
    const params = new URLSearchParams();
    if (global_id) params.append('global_id', global_id);
    if (orientation && orientation !== 'ALL') params.append('orientation', orientation);
    if (camera_id) params.append('camera_id', camera_id);
    if (search) params.append('search', search);
    if (entity_type) params.append('entity_type', entity_type);
    if (limit) params.append('limit', limit);

    const res = await fetch(`${API_BASE_URL}/sightings?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch sightings');
    return await res.json();
  } catch (err) {
    console.error('Error fetching sightings:', err);
    return [];
  }
};

// Identities Registry (Persons and Objects)
export const fetchIdentities = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/identities`);
    if (!res.ok) throw new Error('Failed to fetch identities');
    return await res.json();
  } catch (err) {
    console.error('Error fetching identities:', err);
    return [];
  }
};

// Crop Image URL
export const getCropImageUrl = (cropPath) => {
  if (!cropPath) return '';
  const filename = cropPath.split(/[/\\]/).pop();
  return `${API_BASE_URL}/crops/${filename}`;
};

// Video Stream Seeking URL
export const getVideoStreamUrl = (cameraId) => {
  if (!cameraId) return '';
  return `${API_BASE_URL}/video/${cameraId}`;
};

// Seed Mock Data in SQLite
export const seedDatabase = async () => {
  const res = await fetch(`${API_BASE_URL}/seed`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to seed database');
  return data;
};

// Clear All Feeds, Crops, and Storage Archive
export const clearAllVideosApi = async () => {
  const res = await fetch(`${API_BASE_URL}/videos`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to clear feeds');
  return data;
};

