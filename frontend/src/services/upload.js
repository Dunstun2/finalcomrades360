import api from './api';
export const uploadFile = async (file) => {
  const fd = new FormData();
  fd.append('file', file);
  const r = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return r.data.url;
};
