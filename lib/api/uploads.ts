import { uploadRequest, type Audience } from "./client";

export interface UploadResult {
  url: string;
  publicId: string;
}

function uploadImage(path: string, audience: Audience, file: File, folder: string) {
  const form = new FormData();
  form.append("file", file);
  return uploadRequest<UploadResult>(`${path}?folder=${encodeURIComponent(folder)}`, form, audience);
}

export function uploadAdminImage(file: File, folder: string) {
  return uploadImage("/admin/uploads", "admin", file, folder);
}

export function uploadVendorImage(file: File, folder: string) {
  return uploadImage("/vendor/uploads", "vendor", file, folder);
}

export function uploadCustomerImage(file: File, folder: string) {
  return uploadImage("/auth/customer/uploads", "customer", file, folder);
}
