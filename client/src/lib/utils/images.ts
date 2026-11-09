import { useAuthStore } from '../store/auth-store';
import { refreshAccessToken } from '../auth/session';

/** Downscales an image in the browser (as the original interface did) before it is uploaded. */
export function downscaleImage(file: File, max: number, square = false): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('IMAGE_INVALID'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('CANVAS_UNAVAILABLE'));
        if (square) {
          const side = Math.min(img.width, img.height);
          canvas.width = max;
          canvas.height = max;
          ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, max, max);
        } else {
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('ENCODE_FAILED'))), 'image/jpeg', square ? 0.85 : 0.82);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** Uploads an image to the backend (POST /uploads, requires the access token) and returns its URL. */
export async function uploadImage(blob: Blob): Promise<string> {
  const send = () => {
    const form = new FormData();
    form.append('file', blob, 'photo.jpg');
    const token = useAuthStore.getState().accessToken;
    return fetch('/uploads', {
      method: 'POST',
      credentials: 'same-origin',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: form,
    });
  };
  let res = await send();
  if (res.status === 401 && (await refreshAccessToken())) res = await send();
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'UPLOAD_FAILED');
  }
  const body = (await res.json()) as { url: string };
  return body.url;
}
