import axios from 'axios';
import { api } from '../config/api';

export const isPrivateFile = file => file.url === `/api/cases/files/${file.id}/download`;
export const errorMessage = async (error, fallback) => {
    let data = error.response?.data;
    if (data instanceof Blob) {
        try { data = JSON.parse(await data.text()); } catch { return fallback; }
    }
    return data?.message || fallback;
};
export const downloadCaseFile = async file => {
    const { data } = await axios.get(api.cases.downloadFile(file.id), {
        headers: { Authorization: `Bearer ${localStorage.getItem('lyp_token')}` }, responseType: 'blob',
    });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url; link.download = file.name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
